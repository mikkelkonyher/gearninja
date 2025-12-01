// @ts-nocheck
// supabase/functions/register/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Edge function has full privileges via service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// CORS + JSON helpers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
      ...corsHeaders,
    },
  });
}

// Simple helpers
function badRequest(message: string) {
  return jsonResponse({ error: message }, { status: 400 });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse("Method not allowed", { status: 405 });
  }

  let body: { email?: string; password?: string; username?: string };

  try {
    body = await req.json();
  } catch {
    return badRequest("Ugyldigt JSON-body");
  }

  const { email, password, username } = body;

  // Basic presence validation
  if (!email || !password || !username) {
    return badRequest("Email, brugernavn og adgangskode er påkrævet");
  }

  const trimmedUsername = username.trim();

  // Username: max 20 chars
  if (trimmedUsername.length === 0) {
    return badRequest("Brugernavn må ikke være tomt");
  }
  if (trimmedUsername.length > 20) {
    return badRequest("Brugernavn må højst være 20 tegn");
  }

  // Password: at least 8 chars AND at least one digit or special char
  const hasMinLength = password.length >= 8;
  const hasDigitOrSpecial = /[0-9!@#$%^&*()_\-+=[\]{};:'"\\|,.<>/?]/.test(
    password,
  );

  if (!hasMinLength) {
    return badRequest("Adgangskoden skal være mindst 8 tegn");
  }

  if (!hasDigitOrSpecial) {
    return badRequest(
      "Adgangskoden skal indeholde mindst ét tal eller et specialtegn",
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
    return badRequest("Brugernavnet er allerede taget");
  }

  // Create user using Admin API (service role)
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: false, // or true, depending on your flow
    user_metadata: {
      username: trimmedUsername,
    },
  });

  if (error) {
    return badRequest(error.message ?? "Kunne ikke oprette bruger");
  }

  return jsonResponse(
    {
      userId: data.user?.id,
      message:
        "Bruger oprettet. Tjek din email for bekræftelse (hvis slået til).",
    },
    { status: 200 },
  );
});