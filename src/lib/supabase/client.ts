'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser Supabase client for use in Client Components.
 * Reads the public env vars exposed at build time.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
