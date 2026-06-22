'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type Tab = 'phone' | 'email';
type PhoneStep = 'phone' | 'otp';
type EmailMode = 'signin' | 'signup';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const auth = useAuth();
  const { handleSession } = auth;
  const [tab, setTab] = useState<Tab>('phone');
  const [googleEnabled, setGoogleEnabled] = useState<boolean | null>(null);
  const oauthError = search.get('error');

  // If already signed in, skip the form and go straight to the dashboard.
  useEffect(() => {
    if (auth.status === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [auth.status, router]);

  useEffect(() => {
    api.auth.googleStatus().then((s) => setGoogleEnabled(s.enabled)).catch(() => setGoogleEnabled(false));
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1 text-sm font-semibold text-brand-orange hover:underline"
      >
        ← Back to home
      </Link>

      <h1 className="bg-brand-gradient-text bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
        Welcome back
      </h1>
      <p className="mt-2 text-base text-ink-400">Sign in with phone or email.</p>

      {oauthError && (
        <ErrorBox className="mt-4">
          Google sign-in failed. Try a different method.
        </ErrorBox>
      )}

      {/* ---- Tabs ---- */}
      <div className="mt-7 grid grid-cols-2 gap-1 rounded-2xl bg-cream-200 p-1">
        <TabButton active={tab === 'phone'} onClick={() => setTab('phone')}>
          Phone
        </TabButton>
        <TabButton active={tab === 'email'} onClick={() => setTab('email')}>
          Email
        </TabButton>
      </div>

      <div className="mt-6">
        {tab === 'phone' && <PhonePanel onDone={(s) => { handleSession(s); router.push(s.user.onboardedAt ? '/dashboard' : '/onboarding/role'); }} />}
        {tab === 'email' && <EmailPanel onDone={(s) => { handleSession(s); router.push(s.user.onboardedAt ? '/dashboard' : '/onboarding/role'); }} />}
      </div>

      {/* ---- Divider + Continue with Google ---- */}
      <div className="mt-8 flex items-center gap-4">
        <div className="h-px flex-1 bg-black/10" />
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">or</span>
        <div className="h-px flex-1 bg-black/10" />
      </div>

      <div className="mt-5">
        <GooglePanel enabled={googleEnabled} />
      </div>

      <footer className="mt-12 text-center text-xs text-ink-300">
        By continuing you agree to our{' '}
        <a href="/legal/terms" className="font-semibold hover:text-brand-orange hover:underline">
          Terms
        </a>{' '}
        &amp;{' '}
        <a href="/legal/privacy" className="font-semibold hover:text-brand-orange hover:underline">
          Privacy Policy
        </a>
        .
      </footer>
    </main>
  );
}

// ============================================================
// Tab button
// ============================================================
function TabButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl py-2.5 text-sm font-bold transition ${
        active
          ? 'bg-white text-ink-700 shadow-soft'
          : 'text-ink-500 hover:text-ink-700'
      } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
    >
      {children}
    </button>
  );
}

// ============================================================
// PHONE — OTP flow (existing behavior)
// ============================================================
function PhonePanel({ onDone }: { onDone: (s: any) => void }) {
  const [step, setStep] = useState<PhoneStep>('phone');
  const [phone, setPhone] = useState('+91');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devHint, setDevHint] = useState<string | null>(null);

  async function onRequestOtp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDevHint(null);
    try {
      const res = await api.auth.requestOtp(phone.trim());
      setStep('otp');
      if (res.otpDevOnly) {
        setDevHint(`Dev mode: OTP is ${res.otpDevOnly}`);
        setOtp(res.otpDevOnly);
      }
    } catch (err) {
      setError(messageOf(err, 'Could not send OTP'));
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.auth.verifyOtp(phone.trim(), otp.trim());
      onDone(res);
    } catch (err) {
      setError(messageOf(err, 'OTP verification failed'));
    } finally {
      setBusy(false);
    }
  }

  if (step === 'phone') {
    return (
      <form onSubmit={onRequestOtp} className="space-y-4">
        <Label text="Mobile number">
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+919876543210"
            required
            autoFocus
            className={inputClass}
          />
          <Hint>Include the country code (e.g. +91 for India).</Hint>
        </Label>
        {error && <ErrorBox>{error}</ErrorBox>}
        <button type="submit" disabled={busy || phone.length < 8} className={primaryBtn}>
          {busy ? 'Sending…' : 'Send OTP'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onVerifyOtp} className="space-y-4">
      <Label text={`OTP sent to ${phone}`}>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={8}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          placeholder="123456"
          required
          autoFocus
          className={`${inputClass} text-center text-2xl font-bold tracking-[0.5em]`}
        />
      </Label>
      {devHint && (
        <div className="rounded-xl border border-emerald-300/40 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {devHint}
        </div>
      )}
      {error && <ErrorBox>{error}</ErrorBox>}
      <button type="submit" disabled={busy || otp.length < 4} className={primaryBtn}>
        {busy ? 'Verifying…' : 'Verify & Continue'}
      </button>
      <button
        type="button"
        onClick={() => { setStep('phone'); setOtp(''); setError(null); setDevHint(null); }}
        className="w-full text-sm font-semibold text-ink-400 hover:text-brand-orange"
      >
        ← Use a different number
      </button>
    </form>
  );
}

// ============================================================
// EMAIL — sign in / sign up toggle
// ============================================================
function EmailPanel({ onDone }: { onDone: (s: any) => void }) {
  const [mode, setMode] = useState<EmailMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 'signin') {
        const res = await api.auth.emailSignin(email.trim().toLowerCase(), password);
        onDone(res);
      } else {
        const res = await api.auth.emailSignup(
          email.trim().toLowerCase(),
          password,
          displayName.trim() || undefined,
        );
        if (res.verificationSent) {
          setInfo('Check your email to verify your account. (Dev mode: see API console for the link.)');
        }
        onDone(res);
      }
    } catch (err) {
      setError(messageOf(err, mode === 'signin' ? 'Sign in failed' : 'Sign up failed'));
    } finally {
      setBusy(false);
    }
  }

  async function onForgot() {
    if (!email.trim()) {
      setError('Enter your email first, then click forgot.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.auth.forgotPassword(email.trim().toLowerCase());
      setInfo('If that email exists, a reset link is on its way.');
    } catch (err) {
      setError(messageOf(err, 'Could not send reset email'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex rounded-xl bg-cream-100 p-1 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={`flex-1 rounded-lg py-2 ${mode === 'signin' ? 'bg-white text-ink-700 shadow-soft' : 'text-ink-500'}`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`flex-1 rounded-lg py-2 ${mode === 'signup' ? 'bg-white text-ink-700 shadow-soft' : 'text-ink-500'}`}
        >
          Sign up
        </button>
      </div>

      <Label text="Email">
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className={inputClass}
        />
      </Label>

      {mode === 'signup' && (
        <Label text="Name (optional)">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className={inputClass}
          />
        </Label>
      )}

      <Label text="Password">
        <input
          type="password"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === 'signup' ? 'At least 8 chars, letter + digit' : 'Your password'}
          minLength={mode === 'signup' ? 8 : 1}
          required
          className={inputClass}
        />
        {mode === 'signup' && (
          <Hint>Min 8 characters with at least one letter and one digit.</Hint>
        )}
      </Label>

      {info && (
        <div className="rounded-xl border border-emerald-300/40 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {info}
        </div>
      )}
      {error && <ErrorBox>{error}</ErrorBox>}

      <button type="submit" disabled={busy} className={primaryBtn}>
        {busy ? '…' : mode === 'signin' ? 'Sign in' : 'Create account'}
      </button>

      {mode === 'signin' && (
        <button
          type="button"
          onClick={onForgot}
          className="w-full text-sm font-semibold text-ink-400 hover:text-brand-orange"
        >
          Forgot password?
        </button>
      )}
    </form>
  );
}

// ============================================================
// GOOGLE — kicks off OAuth
// ============================================================
function GooglePanel({ enabled }: { enabled: boolean | null }) {
  // Always render the clean Continue-with-Google button. When the server isn't
  // configured (enabled === false) we still show it; clicks then bounce back
  // with ?error=google which the page surfaces above.
  const href = api.auth.googleStartUrl(API_BASE, '/');
  return (
    <a
      href={href}
      onClick={(e) => {
        if (enabled === false) {
          e.preventDefault();
          window.location.href = '/login?error=google';
        }
      }}
      className="flex w-full items-center justify-center gap-3 rounded-2xl border border-black/10 bg-white py-3.5 text-base font-semibold text-ink-700 shadow-soft transition hover:bg-cream-100"
    >
      <GoogleIcon />
      Continue with Google
    </a>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.3l-6.2-5.2c-2 1.4-4.5 2.2-7.2 2.2-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.4 39.6 16.1 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2c-.4.4 6.6-4.8 6.6-14.7 0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

// ============================================================
// Shared bits
// ============================================================
const inputClass =
  'w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base font-medium shadow-soft outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20';
const primaryBtn =
  'btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60';

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink-600">{text}</span>
      {children}
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <span className="mt-1.5 block text-xs text-ink-300">{children}</span>;
}

function ErrorBox({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-rose-300/40 bg-rose-50 px-4 py-3 text-sm text-rose-700 ${className ?? ''}`}
    >
      {children}
    </div>
  );
}

function messageOf(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.code === 'too_many_requests') return 'Too many attempts. Wait a few minutes.';
    if (err.code === 'otp_invalid') return 'That OTP did not match. Try again.';
    if (err.code === 'otp_expired') return 'OTP expired. Request a new one.';
    if (err.code === 'invalid_credentials') return 'Email or password is incorrect.';
    if (err.code === 'email_taken') return 'An account with this email already exists. Try signing in.';
    if (err.code === 'weak_password') return 'Password must be at least 8 characters with a letter and a digit.';
    if (err.code === 'invalid_payload') {
      // Surface the specific Zod issue so the user knows which field is bad.
      const issues = (err.payload as { issues?: { fieldErrors?: Record<string, string[]> } } | undefined)?.issues;
      const fieldErrors = issues?.fieldErrors;
      if (fieldErrors) {
        const first = Object.entries(fieldErrors).find(([, msgs]) => msgs && msgs.length > 0);
        if (first) {
          const [field, msgs] = first;
          return `${field}: ${msgs![0]}`;
        }
      }
      return 'Please check your input and try again.';
    }
    return err.message || fallback;
  }
  return fallback;
}
