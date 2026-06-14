'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';

export type AuthState = { error: string | null; message?: string | null };

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const fullName = String(formData.get('full_name') || '').trim();

  const supabase = createClient();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });
  if (error) return { error: error.message };

  // If email confirmation is disabled, a session is returned immediately.
  if (data.session) {
    revalidatePath('/', 'layout');
    redirect('/dashboard');
  }
  return {
    error: null,
    message: 'Check your email to confirm your account, then sign in.',
  };
}
