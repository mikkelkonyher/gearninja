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

    const { title, content, category_id } = await req.json();

    // Validation
    if (!title || typeof title !== "string" || !title.trim()) {
      return badRequest("Titel er påkrævet", origin);
    }
    if (title.length > 150) {
      return badRequest("Titel må maks være 150 tegn", origin);
    }

    if (!content || typeof content !== "string" || !content.trim()) {
      return badRequest("Indhold er påkrævet", origin);
    }
    if (content.length > 5000) {
      return badRequest("Indhold må maks være 5000 tegn", origin);
    }

    if (!category_id) {
      return badRequest("Kategori er påkrævet", origin);
    }

    // Get user metadata for author_name
    const displayName = user.user_metadata?.username || user.email?.split("@")[0] || "Anonym";

    const { data: thread, error: threadError } = await supabase
      .from("forum_threads")
      .insert({
        title: title.trim(),
        content: content.trim(),
        category_id,
        user_id: user.id,
        author_name: displayName
      })
      .select()
      .single();

    if (threadError) {
      console.error("Database error:", threadError);
      return jsonResponse({ error: "Kunne ikke oprette tråd" }, origin, { status: 500 });
    }

    return jsonResponse({ thread }, origin, { status: 200 });

  } catch (error) {
    console.error("Function error:", error);
    return jsonResponse({ error: "Intern systemfejl" }, origin, { status: 500 });
  }
});
