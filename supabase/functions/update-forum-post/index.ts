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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return unauthorized("Login required", origin);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return unauthorized("Ugyldig session", origin);
    }

    const { content, post_id } = await req.json();

    // Validation
    if (!content || typeof content !== "string" || !content.trim()) {
      return badRequest("Besked er påkrævet", origin);
    }
    if (content.length > 5000) {
      return badRequest("Besked må maks være 5000 tegn", origin);
    }
    if (!post_id) {
      return badRequest("Post ID mangler", origin);
    }

    // Verify ownership
    const { data: existingPost, error: fetchError } = await supabase
        .from("forum_posts")
        .select("user_id")
        .eq("id", post_id)
        .single();
    
    if (fetchError || !existingPost) {
        return badRequest("Kunne ikke finde indlæg", origin);
    }

    if (existingPost.user_id !== user.id) {
        return unauthorized("Du kan kun redigere dine egne indlæg", origin);
    }

    const { data: post, error: updateError } = await supabase
      .from("forum_posts")
      .update({
        content: content.trim(),
        updated_at: new Date().toISOString()
      })
      .eq("id", post_id)
      .select()
      .single();

    if (updateError) {
      console.error("Database error:", updateError);
      return jsonResponse({ error: "Kunne ikke opdatere svar" }, origin, { status: 500 });
    }

    return jsonResponse({ post }, origin, { status: 200 });

  } catch (error) {
    console.error("Function error:", error);
    return jsonResponse({ error: "Intern systemfejl" }, origin, { status: 500 });
  }
});
