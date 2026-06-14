'use client';

import { useEffect } from 'react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaces in Vercel's runtime logs for the failing request.
    console.error('App route error:', error);
  }, [error]);

  return (
    <main className="app-bg flex min-h-screen items-center justify-center p-6">
      <div className="card max-w-md text-center">
        <h1 className="text-xl font-bold">Something went wrong</h1>
        <p className="muted mt-2">
          We couldn&apos;t reach your data. This is almost always a Supabase
          credential issue — double-check that{' '}
          <code className="text-brand-400">SUPABASE_SERVICE_ROLE_KEY</code> is
          your <strong>secret</strong> key (starts with{' '}
          <code className="text-brand-400">sb_secret_</code>) and that{' '}
          <code className="text-brand-400">NEXT_PUBLIC_SUPABASE_URL</code> has no
          stray spaces, then redeploy.
        </p>
        {error.digest && (
          <p className="muted mt-3 text-xs">Reference: {error.digest}</p>
        )}
        <button onClick={reset} className="btn-primary mt-4">
          Try again
        </button>
      </div>
    </main>
  );
}
