import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Read env vars defensively: trimming guards against a trailing newline or
// space being pasted with the URL/key (a common cause of "Invalid header
// value" / "Invalid URL" exceptions at request time on Vercel).
function env(name: string): string {
  return (process.env[name] ?? '').trim();
}

/**
 * Server-only Supabase client using the secret service-role key.
 *
 * Personal mode has no auth, so every read/write happens on the server with
 * the service role (which bypasses RLS). The service-role key is NOT exposed
 * to the browser — it lives only in server env vars on Vercel.
 */
export function createClient() {
  const url = env('NEXT_PUBLIC_SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** True when Supabase credentials are configured. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    env('NEXT_PUBLIC_SUPABASE_URL') && env('SUPABASE_SERVICE_ROLE_KEY'),
  );
}
