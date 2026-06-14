import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client using the secret service-role key.
 *
 * Personal mode has no auth, so every read/write happens on the server with
 * the service role (which bypasses RLS). The service-role key is NOT exposed
 * to the browser — it lives only in server env vars on Vercel.
 */
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** True when Supabase credentials are configured. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
