// @ts-nocheck
// supabase/functions/register/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Edge function has full privileges via service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// CORS + JSON helpers
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

// Simple helpers
function badRequest(message: string, origin: string | null) {
  return jsonResponse({ error: message }, origin, { status: 400 });
}

serve(async (req) => {
  const origin = req.headers.get("Origin");
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return jsonResponse("Method not allowed", origin, { status: 405 });
  }

  let body: { email?: string; password?: string; username?: string };

  try {
    body = await req.json();
  } catch {
    return badRequest("Ugyldigt JSON-body", origin);
  }

  const { email, password, username } = body;

  // Basic presence validation
  if (!email || !password || !username) {
    return badRequest("Email, brugernavn og adgangskode er påkrævet", origin);
  }

  const trimmedUsername = username.trim();

  // Username: max 20 chars
  if (trimmedUsername.length === 0) {
    return badRequest("Brugernavn må ikke være tomt", origin);
  }
  if (trimmedUsername.length > 20) {
    return badRequest("Brugernavn må højst være 20 tegn", origin);
  }

  // Password: at least 8 chars AND at least one digit or special char
  const hasMinLength = password.length >= 8;
  const hasDigitOrSpecial = /[0-9!@#$%^&*()_\-+=[\]{};:'"\\|,.<>/?]/.test(
    password,
  );

  if (!hasMinLength) {
    return badRequest("Adgangskoden skal være mindst 8 tegn", origin);
  }

  if (!hasDigitOrSpecial) {
    return badRequest(
      "Adgangskoden skal indeholde mindst ét tal eller et specialtegn",
      origin
    );
  }

  // Optional: check if username is already taken (if you store it in user_metadata or a profile table)
  // Here we check auth.users metadata.username:
  const { data: existingUsers, error: existingError } = await supabase
    .from("users_view") // or your own view/table; adjust to your schema
    .select("id")
    .eq("username", trimmedUsername)
    .limit(1);

  if (!existingError && existingUsers && existingUsers.length > 0) {
    return badRequest("Brugernavnet er allerede taget", origin);
  }

  // Create user using regular signUp (this will send confirmation email if enabled)
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: trimmedUsername,
      },
    },
  });

  if (signUpError) {
    return badRequest(signUpError.message ?? "Kunne ikke oprette bruger", origin);
  }

  return jsonResponse(
    {
      userId: signUpData.user?.id,
      message:
        "Bruger oprettet. Tjek din email for bekræftelse.",
    },
    origin,
    { status: 200 },
  );
});