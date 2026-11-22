'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { removeAuthToken } from '@/features/dashboard/lib/cookies';

export type FormState = { error?: string; ok?: string; email?: string; name?: string } | null;

const SESSION = { secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', httpOnly: true, maxAge: 60 * 60 * 24 * 30 };
const clean = (v: FormDataEntryValue | null) => String(v || '').trim();
/** Only same-site paths, so a link cannot send someone elsewhere after signing in. */
const safeNext = (v: FormDataEntryValue | null) => { const s = clean(v); return s.startsWith('/') && !s.startsWith('//') && !s.startsWith('/dashboard') ? s : '/account'; };

async function startSession(email: string, password: string): Promise<string | null> {
  const r = await keystoneClient<any>(`mutation($email: String!, $password: String!) { authenticateUserWithPassword(email: $email, password: $password) { ... on UserAuthenticationWithPasswordSuccess { sessionToken } ... on UserAuthenticationWithPasswordFailure { message } } }`, { email, password });
  const token = r.success ? r.data?.authenticateUserWithPassword?.sessionToken : null;
  if (!token) return null;
  (await cookies()).set('keystonejs-session', token, SESSION);
  return token;
}

export async function customerSignIn(_: FormState, formData: FormData): Promise<FormState> {
  const email = clean(formData.get('email')).toLowerCase();
  const password = String(formData.get('password') || '');
  if (!email || !password) return { error: 'Enter your email and password.', email };
  if (!(await startSession(email, password))) return { error: 'That email and password do not match an account.', email };
  revalidatePath('/', 'layout');
  redirect(safeNext(formData.get('next')));
}

export async function customerSignUp(_: FormState, formData: FormData): Promise<FormState> {
  const name = clean(formData.get('name'));
  const email = clean(formData.get('email')).toLowerCase();
  const password = String(formData.get('password') || '');
  if (!name) return { error: 'Enter your name.', email, name };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Enter a valid email address.', email, name };
  if (password.length < 8) return { error: 'Use at least 8 characters for your password.', email, name };
  const created = await keystoneClient<any>(`mutation($data: UserCreateInput!) { createUser(data: $data) { id } }`, { data: { name, email, password } });
  if (!created.success) {
    return { error: /unique|already/i.test(created.error || '') ? 'An account with this email already exists. Sign in instead.' : 'The account could not be created. Try again.', email, name };
  }
  if (!(await startSession(email, password))) return { error: 'Your account was created. Sign in to continue.', email };
  // The confirmation email links tickets already bought with this address to the account.
  await keystoneClient(`mutation { sendEmailConfirmation }`);
  revalidatePath('/', 'layout');
  redirect(safeNext(formData.get('next')) === '/account' ? '/account?welcome=1' : safeNext(formData.get('next')));
}

export async function customerSignOut() {
  await keystoneClient('mutation { endSession }');
  await removeAuthToken();
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function resendConfirmation(_: FormState): Promise<FormState> {
  const r = await keystoneClient<any>(`mutation { sendEmailConfirmation }`);
  if (!r.success) return { error: r.error || 'The email could not be sent. Try again in a minute.' };
  return r.data?.sendEmailConfirmation?.verified ? { ok: 'Your email is already confirmed.' } : { ok: 'Sent. Open the link in the email to confirm.' };
}

export async function updateProfile(_: FormState, formData: FormData): Promise<FormState> {
  const name = clean(formData.get('name'));
  if (!name) return { error: 'Enter your name.' };
  const r = await keystoneClient(`mutation($data: UserUpdateProfileInput!) { updateActiveUser(data: $data) { id } }`, { data: { name } });
  if (!r.success) return { error: 'Your name could not be saved. Try again.' };
  revalidatePath('/account');
  return { ok: 'Saved.' };
}

export async function requestReset(_: FormState, formData: FormData): Promise<FormState> {
  const email = clean(formData.get('email')).toLowerCase();
  if (!email) return { error: 'Enter your email.' };
  await keystoneClient(`mutation($email: String!) { sendUserPasswordResetLink(email: $email) }`, { email });
  // Same answer whether or not the address has an account.
  return { ok: 'If that email has an account, a reset link is on its way.', email };
}

export async function redeemReset(_: FormState, formData: FormData): Promise<FormState> {
  const email = clean(formData.get('email')).toLowerCase();
  const token = clean(formData.get('token'));
  const password = String(formData.get('password') || '');
  if (password.length < 8) return { error: 'Use at least 8 characters for your password.', email };
  const r = await keystoneClient<any>(`mutation($email: String!, $token: String!, $password: String!) { redeemUserPasswordResetToken(email: $email, token: $token, password: $password) { code } }`, { email, token, password });
  if (!r.success || r.data?.redeemUserPasswordResetToken?.code) return { error: 'This reset link is not valid or has expired. Ask for a new one.', email };
  if (await startSession(email, password)) { revalidatePath('/', 'layout'); redirect('/account'); }
  return { ok: 'Password changed. Sign in with the new one.', email };
}
