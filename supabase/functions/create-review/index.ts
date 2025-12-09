import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://www.gearninja.dk"
];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function jsonResponse(body: unknown, origin: string | null, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
      ...getCorsHeaders(origin),
    },
  });
}

function badRequest(message: string, origin: string | null) {
  return jsonResponse({ error: message }, origin, { status: 400 });
}

function unauthorized(message: string, origin: string | null) {
  return jsonResponse({ error: message }, origin, { status: 401 });
}

serve(async (req) => {
  const origin = req.headers.get("Origin");
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  try {
    // Get user from authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return unauthorized("Ingen authorization header", origin);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return unauthorized("Unauthorized", origin);
    }

    const { sale_id, rating, content } = await req.json();

    // Validate required fields
    if (!sale_id) {
      return badRequest("sale_id er påkrævet", origin);
    }

    if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
      return badRequest("Bedømmelse skal være mellem 1 og 5", origin);
    }

    // Validate content length (max 1000 characters)
    if (content && content.length > 1000) {
      return badRequest("Kommentar må maks være 1000 tegn", origin);
    }

    // Get sale details to determine reviewee
    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .select("seller_id, buyer_id")
      .eq("id", sale_id)
      .single();

    if (saleError || !sale) {
      return jsonResponse({ error: "Salg ikke fundet" }, origin, { status: 404 });
    }

    // Verify user is part of the sale
    if (user.id !== sale.seller_id && user.id !== sale.buyer_id) {
      return jsonResponse({ error: "Du er ikke en del af dette salg" }, origin, { status: 403 });
    }

    // Determine reviewee (the other party in the sale)
    const reviewee_id =
      user.id === sale.seller_id ? sale.buyer_id : sale.seller_id;

    // Prevent self-review (should not happen, but extra safety)
    if (reviewee_id === user.id) {
      return badRequest("Du kan ikke anmelde dig selv", origin);
    }

    // Check if review already exists
    const { data: existingReview } = await supabase
      .from("reviews")
      .select("id")
      .eq("sale_id", sale_id)
      .eq("reviewer_id", user.id)
      .single();

    if (existingReview) {
      return jsonResponse(
        { error: "Du har allerede skrevet en anmeldelse for dette salg" },
        origin,
        { status: 409 }
      );
    }

    // Insert review
    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .insert({
        sale_id,
        reviewer_id: user.id,
        reviewee_id,
        rating,
        content: content || null,
      })
      .select()
      .single();

    if (reviewError) {
      console.error("Error creating review:", reviewError);
      return jsonResponse({ error: "Kunne ikke oprette anmeldelse" }, origin, { status: 500 });
    }

    return jsonResponse({ review }, origin, { status: 200 });
  } catch (error) {
    console.error("Error in create-review function:", error);
    return jsonResponse({ error: "Der skete en intern fejl" }, origin, { status: 500 });
  }
});
