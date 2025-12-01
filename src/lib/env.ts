// Central helpers for reading environment variables
// These rely on the prefixes configured in `vite.config.ts` (envPrefix).

export const SUPABASE_URL =
  import.meta.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;

// We use PUSHIABLE_API_KEY as the Supabase anon key.
export const PUSHIABLE_API_KEY =
  import.meta.env.PUSHIABLE_API_KEY ?? import.meta.env.VITE_PUSHIABLE_API_KEY;
