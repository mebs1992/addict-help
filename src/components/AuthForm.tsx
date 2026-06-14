'use client';

import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { signIn, signUp, type AuthState } from '@/lib/auth-actions';

const initial: AuthState = { error: null, message: null };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary w-full py-3.5" disabled={pending}>
      {pending ? 'Please wait…' : label}
    </button>
  );
}

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const action = mode === 'login' ? signIn : signUp;
  const [state, formAction] = useFormState(action, initial);

  return (
    <form action={formAction} className="card space-y-4">
      {mode === 'signup' && (
        <div>
          <label className="label" htmlFor="full_name">
            Name
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            autoComplete="name"
            className="input"
            placeholder="Alex"
          />
        </div>
      )}

      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          className="input"
          placeholder="••••••••"
        />
      </div>

      {state.error && (
        <p className="rounded-xl border border-danger-500/40 bg-danger-500/10 p-3 text-sm text-danger-400">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="rounded-xl border border-brand-500/40 bg-brand-500/10 p-3 text-sm text-brand-400">
          {state.message}
        </p>
      )}

      <SubmitButton label={mode === 'login' ? 'Sign in' : 'Create account'} />

      <p className="muted text-center">
        {mode === 'login' ? (
          <>
            New here?{' '}
            <Link href="/signup" className="text-brand-400">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link href="/login" className="text-brand-400">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
