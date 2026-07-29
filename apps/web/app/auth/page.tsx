'use client';

import { FormEvent, useState } from 'react';
import Image from 'next/image';
import { BrandWordmark } from '../components/brand-wordmark';

const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

async function post(path: string, body: unknown) {
  const response = await fetch(`${api}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message ?? 'Request failed');
  return data;
}

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'invite' | 'recovery'>('login');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      if (mode === 'login') {
        await post('/auth/login', { email: form.get('email'), password: form.get('password') });
        window.location.assign('/workspace');
        return;
      }
      if (mode === 'invite')
        await post('/auth/invitations/redeem', {
          code: form.get('code'),
          displayName: form.get('displayName'),
          password: form.get('password'),
        });
      if (mode === 'recovery') await post('/auth/recovery/request', { email: form.get('email') });
      setMessage(
        mode === 'recovery'
          ? 'If that account exists, recovery instructions have been issued.'
          : 'Success. You can now continue to the school workspace.',
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Request failed');
    }
  }
  return (
    <main className="brand-gradient min-h-screen px-6 py-10 sm:py-16">
      <section className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-blue-950/10 lg:grid-cols-2">
        <div className="brand-gradient-dark hidden p-10 lg:block">
          <Image
            src="/pinkora-logo.png"
            alt="Pinkora EduKonekta logo"
            width={1024}
            height={1024}
            priority
            className="mt-8 rounded-2xl"
          />
          <p className="mt-8 text-lg font-medium leading-8 text-white/90">
            Guide with hope. Protect with trust. Empower every learner.
          </p>
        </div>
        <div className="p-8 sm:p-10">
          <BrandWordmark className="mb-5" />
          <h1 className="mt-3 text-3xl font-bold text-[#092d83]">Secure school access</h1>
          <p className="mt-3 text-sm text-slate-600">
            Registration is invitation-only. Ask your school administrator for an activation code.
          </p>
          <div className="mt-6 flex gap-2 text-sm">
            <button
              onClick={() => setMode('login')}
              className="brand-focus rounded-full bg-[#e8efff] px-3 py-2 text-[#092d83]"
            >
              Login
            </button>
            <button
              onClick={() => setMode('invite')}
              className="brand-focus rounded-full bg-[#fff3d2] px-3 py-2 text-[#092d83]"
            >
              Activate invite
            </button>
            <button
              onClick={() => setMode('recovery')}
              className="brand-focus rounded-full bg-[#ffe8e8] px-3 py-2 text-[#9d1520]"
            >
              Recover
            </button>
          </div>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === 'invite' && (
              <>
                <label className="block text-sm font-medium">
                  Invitation code
                  <input name="code" required className="mt-1 w-full rounded-xl border p-3" />
                </label>
                <label className="block text-sm font-medium">
                  Full name
                  <input
                    name="displayName"
                    required
                    className="mt-1 w-full rounded-xl border p-3"
                  />
                </label>
              </>
            )}
            {mode !== 'invite' && (
              <label className="block text-sm font-medium">
                Email
                <input
                  name="email"
                  type="email"
                  required
                  className="mt-1 w-full rounded-xl border p-3"
                />
              </label>
            )}
            {mode !== 'recovery' && (
              <label className="block text-sm font-medium">
                Password
                <input
                  name="password"
                  type="password"
                  minLength={12}
                  required
                  className="mt-1 w-full rounded-xl border p-3"
                />
              </label>
            )}
            <button className="brand-button brand-focus w-full rounded-xl p-3 font-semibold text-white">
              {mode === 'login'
                ? 'Sign in'
                : mode === 'invite'
                  ? 'Activate account'
                  : 'Send recovery instructions'}
            </button>
          </form>
          {message && (
            <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>
          )}
          {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </div>
      </section>
    </main>
  );
}
