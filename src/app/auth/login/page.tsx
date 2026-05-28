"use client";

import { Playfair_Display } from "next/font/google";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import ErrorMessage from "@/app/components/ErrorMessage";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SESSION_TIMEOUT_MINUTES = 30;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

const inputClass = "w-full rounded-full border border-white/[0.05] bg-[#121216]/60 px-5 py-3.5 text-sm text-white placeholder:text-neutral-500 outline-none transition-all duration-300 focus:border-[#C9A84C] focus:bg-[#121216] focus:ring-2 focus:ring-[#C9A84C]/10";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [sessionWarning, setSessionWarning] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Persist lockout across refreshes
  const [attempts, setAttempts] = useState(() => {
    if (typeof window === 'undefined') return 0
    return parseInt(localStorage.getItem('login_attempts') || '0')
  })
  const [lockedUntil, setLockedUntil] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = localStorage.getItem('login_locked_until')
    if (!stored) return null
    const until = parseInt(stored)
    // Already expired
    if (Date.now() >= until) {
      localStorage.removeItem('login_attempts')
      localStorage.removeItem('login_locked_until')
      return null
    }
    return until
  })

  // Compute derived lockout state
  const isLocked = lockedUntil ? now < lockedUntil : false
  const lockoutSecondsLeft = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - now) / 1000)) : 0
  const lockoutMinutesLeft = Math.ceil(lockoutSecondsLeft / 60)

  // Feature 4 — account exists with different provider
  useEffect(() => {
    const error = searchParams.get('error')
    const errorCode = searchParams.get('error_code')
    const hashParams = new URLSearchParams(window.location.hash.replace('#', ''))
    const hashErrorCode = hashParams.get('error_code')
  
    const timer = setTimeout(() => {
      if (errorCode === 'otp_expired' || hashErrorCode === 'otp_expired') {
        setFormError('Your password reset link has expired. Please request a new one.')
        setShowForgot(true)
        return
      }
      if (error === 'account_exists') {
        setFormError('An account with this email already exists. Try signing in with your password or the method you originally used.')
      }
      if (error === 'auth_failed') {
        setFormError('Authentication failed. Please try again.')
      }
      if (error === 'session_expired') {
        setFormError('Your session expired due to inactivity. Please sign in again.')
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [searchParams])

  // Feature 11 — session timeout warning
  useEffect(() => {
    let warningTimer: ReturnType<typeof setTimeout>
    let logoutTimer: ReturnType<typeof setTimeout>

    const resetTimers = () => {
      clearTimeout(warningTimer)
      clearTimeout(logoutTimer)
      warningTimer = setTimeout(() => {
        setSessionWarning(true)
      }, (SESSION_TIMEOUT_MINUTES - 2) * 60 * 1000)
      logoutTimer = setTimeout(async () => {
        await supabase.auth.signOut()
        router.push('/auth/login?error=session_expired')
      }, SESSION_TIMEOUT_MINUTES * 60 * 1000)
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, resetTimers))
    resetTimers()

    return () => {
      clearTimeout(warningTimer)
      clearTimeout(logoutTimer)
      events.forEach(e => window.removeEventListener(e, resetTimers))
    }
  }, [router])

  // Feature 10 — lockout countdown timer
  useEffect(() => {
    if (!lockedUntil) return
    const interval = setInterval(() => {
      setNow(Date.now())
      if (Date.now() >= lockedUntil) {
        setLockedUntil(null)
        setAttempts(0)
        localStorage.removeItem('login_attempts')
        localStorage.removeItem('login_locked_until')
        clearInterval(interval)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [lockedUntil])

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return
    const interval = setInterval(() => {
      setResendCooldown(v => v - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [resendCooldown])

  function validate(): boolean {
    if (!email.trim() || !EMAIL_RE.test(email.trim())) {
      setFormError("Enter a valid email address.");
      return false;
    }
    if (!password) {
      setFormError("Password is required.");
      return false;
    }
    setFormError(null);
    return true;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    if (isLocked) return;
    if (!validate()) return;

    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setIsLoading(false);

    if (error) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      localStorage.setItem('login_attempts', newAttempts.toString())

      if (newAttempts >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_MINUTES * 60 * 1000;
        setLockedUntil(until);
        localStorage.setItem('login_locked_until', until.toString())
        setFormError(`Too many failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.`);
        return;
      }

      const remaining = MAX_ATTEMPTS - newAttempts;
      setFormError(`Invalid email or password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
      return;
    }

    // Clear lockout on success
    setAttempts(0);
    localStorage.removeItem('login_attempts')
    localStorage.removeItem('login_locked_until')

    // Feature 2 — return URL
    const returnTo = searchParams.get('returnTo') || '/dashboard'
    router.push(returnTo);
    router.refresh();
  }

  async function handleGoogle() {
    setIsGoogleLoading(true);
    const returnTo = searchParams.get('returnTo') || '/dashboard'
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?returnTo=${returnTo}`,
      },
    });
    if (error) {
      setFormError("Google sign-in failed. Please try again.");
      setIsGoogleLoading(false);
    }
  }

  async function handleForgotPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    if (!forgotEmail.trim() || !EMAIL_RE.test(forgotEmail.trim())) {
      setFormError("Enter a valid email address.");
      return;
    }

    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });
    setForgotLoading(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setForgotSent(true);
    setResendCooldown(60);
  }

  async function handleResendReset() {
    if (resendCooldown > 0) return;
    setForgotLoading(true);
    await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });
    setForgotLoading(false);
    setResendCooldown(60);
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#050507] px-4 py-16">
      
      {/* Premium Backglow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[20%] left-1/2 h-[450px] w-[450px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(201,168,76,0.1)_0%,rgba(5,5,7,0)_70%)] blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.03)_0%,rgba(5,5,7,0)_70%)] blur-3xl" />
      </div>

      {/* Feature 11 — session timeout warning */}
      {sessionWarning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md rounded-full border border-amber-500/30 bg-amber-500/10 px-5 py-3 text-xs font-semibold text-amber-300 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-4">
          <span>Your session will expire in 2 minutes due to inactivity.</span>
          <button onClick={() => setSessionWarning(false)} className="shrink-0 text-amber-400 hover:text-amber-200">
            Dismiss
          </button>
        </div>
      )}

      <p className={`${playfair.className} mb-10 text-center text-4xl font-bold tracking-[0.18em] text-[#C9A84C] sm:mb-12 sm:text-5xl`}>
        LEXALYZE
      </p>

      <div className="relative w-full max-w-md rounded-3xl border border-white/[0.07] bg-[#0E0E12]/80 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-10">
        
        {/* Fine gold side glow */}
        <div className="absolute inset-0 rounded-3xl border border-[#C9A84C]/5 pointer-events-none" />

        <h1 className={`${playfair.className} text-center text-2xl font-semibold tracking-wide text-white sm:text-3xl`}>
          {showForgot ? "Reset your password" : "Welcome back"}
        </h1>
        <p className="mt-2 text-center text-xs text-neutral-500">
          {showForgot ? "Enter your details to request a reset link" : "Sign in to access document intelligence"}
        </p>

        {/* Forgot password flow */}
        {showForgot ? (
          <div className="mt-8">
            {forgotSent ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-4 text-xs leading-relaxed text-emerald-300">
                  Reset link sent to <span className="font-semibold text-white">{forgotEmail}</span>. Check your inbox and spam folder.
                </div>
                {/* Feature 12 — resend button */}
                <button
                  onClick={handleResendReset}
                  disabled={resendCooldown > 0 || forgotLoading}
                  className="w-full rounded-full border border-white/[0.08] bg-white/[0.03] py-3.5 text-xs font-bold tracking-wider text-neutral-300 transition-all duration-300 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                >
                  {forgotLoading ? "Sending..." : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend reset link"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-5" noValidate>
                <div>
                  <label htmlFor="forgot-email" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Email address
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    value={forgotEmail}
                    onChange={(e) => { setForgotEmail(e.target.value); setFormError(null); }}
                    className={inputClass}
                    placeholder="you@example.com"
                  />
                </div>
                {formError && (
                  <ErrorMessage title="Error" message={formError} tone="red" onDismiss={() => setFormError(null)} />
                )}
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full rounded-full bg-gradient-to-r from-[#C9A84C] to-[#aa8426] py-3.5 text-sm font-bold tracking-wider text-[#0A0A0A] shadow-lg transition-all duration-300 hover:from-[#d4b55d] hover:shadow-[0_4px_15px_rgba(201,168,76,0.2)] disabled:opacity-70"
                >
                  {forgotLoading ? "Sending..." : "Send reset link"}
                </button>
              </form>
            )}
            <button
              onClick={() => { setShowForgot(false); setForgotSent(false); setFormError(null); setResendCooldown(0); }}
              className="mt-5 w-full text-center text-xs font-medium text-neutral-500 transition hover:text-neutral-300"
            >
              ← Back to sign in
            </button>
          </div>
        ) : (
          <>
            {/* Feature 10 — lockout message */}
            {isLocked && (
              <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs leading-relaxed text-rose-300">
                Too many failed attempts. Try again in {lockoutMinutesLeft} minute{lockoutMinutesLeft === 1 ? '' : 's'} ({lockoutSecondsLeft}s remaining).
              </div>
            )}

            <button
              onClick={handleGoogle}
              disabled={isGoogleLoading || isLoading || isLocked}
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.03] py-3.5 text-xs font-bold tracking-wider text-white transition-all duration-300 hover:bg-white/[0.07] disabled:opacity-60"
            >
              {isGoogleLoading ? (
                <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : <GoogleIcon />}
              {isGoogleLoading ? "Redirecting..." : "Continue with Google"}
            </button>

            <p className="mt-3 text-center text-[10px] tracking-wide text-neutral-600">
              By continuing, you agree to our{" "}
              <Link href="/terms" className="text-neutral-500 hover:text-[#C9A84C] underline underline-offset-2">Terms</Link>
              {" "}and{" "}
              <Link href="/privacy" className="text-neutral-500 hover:text-[#C9A84C] underline underline-offset-2">Privacy Policy</Link>
            </p>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">or</span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <div>
                <label htmlFor="login-email" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Email Address
                </label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFormError(null); }}
                  className={inputClass}
                  placeholder="you@example.com"
                  disabled={isLocked}
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="login-password" className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setShowForgot(true); setForgotEmail(email); setFormError(null); }}
                    className="text-xs font-semibold text-[#C9A84C] transition hover:text-[#d4b55d]"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setFormError(null); }}
                    className={`${inputClass} pr-12`}
                    placeholder="••••••••"
                    disabled={isLocked}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute top-1/2 right-2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-neutral-500 transition hover:text-[#C9A84C]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Feature 8 — remember me */}
              <label className="flex cursor-pointer items-center gap-3 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-4 rounded-full border-white/20 bg-white/5 accent-[#C9A84C]"
                />
                <span className="text-xs font-medium text-neutral-400">Remember me for 30 days</span>
              </label>

              {formError && !isLocked && (
                <ErrorMessage title="Sign in failed" message={formError} tone="red" onDismiss={() => setFormError(null)} />
              )}

              <button
                type="submit"
                disabled={isLoading || isGoogleLoading || isLocked}
                className="w-full rounded-full bg-gradient-to-r from-[#C9A84C] to-[#aa8426] py-3.5 text-sm font-bold tracking-wider text-[#0A0A0A] shadow-md transition-all duration-300 hover:scale-[1.01] hover:from-[#d4b55d] hover:shadow-[0_4px_20px_rgba(201,168,76,0.2)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-[#0A0A0A]/30 border-t-[#0A0A0A]" />
                    Signing in...
                  </span>
                ) : "Sign in"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-neutral-500">
              Don&apos;t have an account?{" "}
              <Link href="/auth/signup" className="font-semibold text-[#C9A84C] underline-offset-4 transition hover:text-[#d4b55d] hover:underline">
                Sign up
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#050507]">
        <span className="size-6 animate-spin rounded-full border-2 border-white/20 border-t-[#C9A84C]" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
