import { createClient } from "@supabase/supabase-js";

// Use SUPABASE_URL and PUSHIABLE_API_KEY from .env.
// Fall back to VITE_* variants if they exist.
const supabaseUrl =
  import.meta.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.PUSHIABLE_API_KEY ?? import.meta.env.VITE_PUSHIABLE_API_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Missing Supabase environment variables (SUPABASE_URL / PUSHIABLE_API_KEY)"
  );
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");
