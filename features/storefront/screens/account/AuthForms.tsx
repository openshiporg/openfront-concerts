'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { customerSignIn, customerSignUp, requestReset, redeemReset, updateProfile, resendConfirmation, type FormState } from '../../actions/account';
import { btn, btnQuiet, input, label, link } from '../../lib/ui';

const Error = ({ state }: { state: FormState }) => (state?.error ? <p role="alert" className="text-sm text-red-700">{state.error}</p> : null);
const Ok = ({ state }: { state: FormState }) => (state?.ok ? <p role="status" className="border-l-2 border-black pl-3 text-sm">{state.ok}</p> : null);

export function SignInForm({ next }: { next?: string }) {
  const [state, action, busy] = useActionState(customerSignIn, null);
  return (
    <form action={action} className="max-w-sm space-y-4">
      <input type="hidden" name="next" value={next || ''} />
      <div><label htmlFor="si-email" className={label}>Email</label><input id="si-email" name="email" type="email" required autoComplete="email" defaultValue={state?.email} className={input} /></div>
      <div><label htmlFor="si-password" className={label}>Password</label><input id="si-password" name="password" type="password" required autoComplete="current-password" className={input} /></div>
      <Error state={state} />
      <button disabled={busy} className={`${btn} w-full sm:w-auto`}>{busy ? 'Signing in…' : 'Sign in'}</button>
      <p className="text-sm"><Link className={link} href="/account/reset">Forgot your password?</Link></p>
      <p className="text-sm text-black/70">New here? <Link className={link} href={`/account/sign-up${next ? `?next=${encodeURIComponent(next)}` : ''}`}>Create an account</Link></p>
    </form>
  );
}

export function SignUpForm({ next }: { next?: string }) {
  const [state, action, busy] = useActionState(customerSignUp, null);
  return (
    <form action={action} className="max-w-sm space-y-4">
      <input type="hidden" name="next" value={next || ''} />
      <div><label htmlFor="su-name" className={label}>Full name</label><input id="su-name" name="name" required autoComplete="name" defaultValue={state?.name} className={input} /></div>
      <div><label htmlFor="su-email" className={label}>Email</label><input id="su-email" name="email" type="email" required autoComplete="email" defaultValue={state?.email} className={input} />
        <p className="mt-1.5 text-sm text-black/60">Use the email you buy tickets with. Tickets you already bought with it show up once you confirm it.</p></div>
      <div><label htmlFor="su-password" className={label}>Password</label><input id="su-password" name="password" type="password" required minLength={8} autoComplete="new-password" className={input} />
        <p className="mt-1.5 text-sm text-black/60">At least 8 characters.</p></div>
      <Error state={state} />
      <button disabled={busy} className={`${btn} w-full sm:w-auto`}>{busy ? 'Creating account…' : 'Create account'}</button>
      <p className="text-sm text-black/70">Already have an account? <Link className={link} href={`/account/sign-in${next ? `?next=${encodeURIComponent(next)}` : ''}`}>Sign in</Link></p>
    </form>
  );
}

export function ResetForm({ token, email }: { token?: string; email?: string }) {
  const [askState, ask, asking] = useActionState(requestReset, null);
  const [setState, set, setting] = useActionState(redeemReset, null);
  if (token) return (
    <form action={set} className="max-w-sm space-y-4">
      <input type="hidden" name="token" value={token} />
      <div><label htmlFor="r-email" className={label}>Email</label><input id="r-email" name="email" type="email" required autoComplete="email" defaultValue={setState?.email || email} className={input} /></div>
      <div><label htmlFor="r-password" className={label}>New password</label><input id="r-password" name="password" type="password" required minLength={8} autoComplete="new-password" className={input} /></div>
      <Error state={setState} /><Ok state={setState} />
      <button disabled={setting} className={btn}>{setting ? 'Saving…' : 'Set new password'}</button>
    </form>
  );
  return (
    <form action={ask} className="max-w-sm space-y-4">
      <div><label htmlFor="r-email" className={label}>Email</label><input id="r-email" name="email" type="email" required autoComplete="email" defaultValue={askState?.email} className={input} /></div>
      <Error state={askState} /><Ok state={askState} />
      <button disabled={asking} className={btn}>{asking ? 'Sending…' : 'Email me a reset link'}</button>
      <p className="text-sm"><Link className={link} href="/account/sign-in">Back to sign in</Link></p>
    </form>
  );
}

export function ProfileForm({ name }: { name: string }) {
  const [state, action, busy] = useActionState(updateProfile, null);
  return (
    <form action={action} className="max-w-sm space-y-3">
      <div><label htmlFor="p-name" className={label}>Name on your tickets</label><input id="p-name" name="name" required autoComplete="name" defaultValue={name} className={input} /></div>
      <Error state={state} /><Ok state={state} />
      <button disabled={busy} className={btnQuiet}>{busy ? 'Saving…' : 'Save name'}</button>
    </form>
  );
}

export function ConfirmEmailButton() {
  const [state, action, busy] = useActionState(resendConfirmation, null);
  return (
    <form action={action} className="space-y-2">
      <button disabled={busy} className={btnQuiet}>{busy ? 'Sending…' : 'Send the confirmation email'}</button>
      <Error state={state} /><Ok state={state} />
    </form>
  );
}
