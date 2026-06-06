"use client";

import { useSearchParams } from "next/navigation";
import { Playfair_Display } from "next/font/google";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, type FormEvent, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getAuthRedirectUrl } from "@/lib/site-url";
import { identifyAnalyticsUser, trackEvent } from "@/lib/analytics";
import ErrorMessage from "@/app/components/ErrorMessage";
import BrandMark from "@/app/components/BrandMark";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormErrors = { fullName?: string; email?: string; password?: string; confirm?: string; terms?: string };
type AccountLookup = { exists: boolean; providers: string[]; hasPassword: boolean };

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function lookupAccount(email: string): Promise<AccountLookup> {
  const response = await fetch("/api/auth/account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Could not check this account right now. Please try again.");
  }

  return {
    exists: Boolean(data.exists),
    providers: Array.isArray(data.providers) ? data.providers : [],
    hasPassword: Boolean(data.hasPassword),
  };
}

function mapSignupError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("already registered") || lower.includes("already exists") || lower.includes("user already")) {
    return "An account with this email already exists. Please sign in instead.";
  }
  if (lower.includes("password")) {
    return "Choose a stronger password and try again.";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "Network error. Check your connection and try again.";
  }
  return "Could not create your account. Please try again.";
}

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

// Feature 7 — password strength
function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  if (pwd.length === 0) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 1) return { score, label: 'Weak', color: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' };
  if (score <= 3) return { score, label: 'Fair', color: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' };
  return { score, label: 'Strong', color: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' };
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const errorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "account_exists" || error === "auth_failed") {
      const timer = setTimeout(() => {
        setErrorMessage(
          error === "account_exists"
            ? "An account with this email already exists. Please sign in instead."
            : "Google sign-up could not be completed safely. Please try again."
        );
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  useEffect(() => {
    const resetGoogleLoading = () => setIsGoogleLoading(false);
    const handlePageShow = () => resetGoogleLoading();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") resetGoogleLoading();
    };

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("focus", resetGoogleLoading);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("focus", resetGoogleLoading);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (errorMessage && errorRef.current) {
      errorRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [errorMessage]);

  const strength = getPasswordStrength(password);

  function validate(): boolean {
    const next: FormErrors = {};
    if (!fullName.trim()) next.fullName = "Full name is required.";
    if (!email.trim()) next.email = "Email is required.";
    else if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    else if (password.length < 6) next.password = "Password must be at least 6 characters.";
    // Feature 6 — confirm password
    if (!confirm) next.confirm = "Please confirm your password.";
    else if (confirm !== password) next.confirm = "Passwords do not match.";
    // Feature 5 — terms checkbox
    if (!agreedToTerms) next.terms = "You must agree to the Terms and Privacy Policy.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;
    setErrorMessage("");
    setIsLoading(true);

    const normalizedEmail = normalizeEmail(email);
    let account: AccountLookup;
    try {
      account = await lookupAccount(normalizedEmail);
    } catch (error) {
      setIsLoading(false);
      setErrorMessage(error instanceof Error ? error.message : "Could not check this account right now. Please try again.");
      return;
    }

    if (account.exists) {
      setIsLoading(false);
      setErrorMessage(
        account.providers.includes("google") && !account.hasPassword
          ? "An account with this email already exists through Google. Please sign in with Google instead."
          : "An account with this email already exists. Please sign in instead."
      );
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { data: { full_name: fullName.trim() } },
    })
    
    setIsLoading(false)
    
    if (error) {
      if (
        error.message.toLowerCase().includes('already registered') ||
        error.message.toLowerCase().includes('already exists') ||
        error.message.toLowerCase().includes('user already')
      ) {
        setErrorMessage("An account with this email already exists. Please sign in instead.")
      } else {
        setErrorMessage(mapSignupError(error.message))
      }
      return
    }
    
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setErrorMessage("An account with this email already exists. Please sign in instead.")
      return
    }
    
    // Extra check — if user was created more than 10 seconds ago, it's an existing account
    if (data.user && data.user.created_at) {
      const createdAt = new Date(data.user.created_at).getTime()
      const now = Date.now()
      if (now - createdAt > 10000) {
        setErrorMessage("An account with this email already exists. Please sign in instead.")
        return
      }
    }
    
    identifyAnalyticsUser(data.user?.email || normalizedEmail);
    trackEvent("signup", { method: "email" });
    router.push("/dashboard")
    router.refresh()
  }

  async function handleGoogle() {
    setErrorMessage("");
    setIsGoogleLoading(true);
    const fallbackTimer = window.setTimeout(() => setIsGoogleLoading(false), 10000);

    const normalizedEmail = normalizeEmail(email);
    if (normalizedEmail && EMAIL_RE.test(normalizedEmail)) {
      try {
        const account = await lookupAccount(normalizedEmail);
        if (account.exists) {
          window.clearTimeout(fallbackTimer);
          setErrorMessage(
            account.providers.includes("google")
              ? "An account with this Google email already exists. Please sign in with Google instead."
              : "An account with this email already exists. Please sign in instead."
          );
          setIsGoogleLoading(false);
          return;
        }
      } catch (error) {
        window.clearTimeout(fallbackTimer);
        setErrorMessage(error instanceof Error ? error.message : "Could not check this account right now. Please try again.");
        setIsGoogleLoading(false);
        return;
      }
    }

    sessionStorage.setItem("lexalyze_oauth_pending", "signup");
  
    const { error } =
      await supabase.auth.signInWithOAuth({
        provider: "google",
  
        options: {
          redirectTo:
            getAuthRedirectUrl("/auth/callback?flow=signup"),
  
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });
  
    if (error) {
      window.clearTimeout(fallbackTimer);
      sessionStorage.removeItem("lexalyze_oauth_pending");
      setErrorMessage(
        "Google sign-in failed. Please try again."
      );
  
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#050507] px-4 py-16">
      
      {/* Premium Backglow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[20%] left-1/2 h-[450px] w-[450px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(201,168,76,0.1)_0%,rgba(5,5,7,0)_70%)] blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.03)_0%,rgba(5,5,7,0)_70%)] blur-3xl" />
      </div>

      <BrandMark href="/" size="lg" className="mb-10 justify-center sm:mb-12" />

      <div className="relative w-full max-w-md rounded-3xl border border-white/[0.07] bg-[#0E0E12]/80 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-10">
        
        {/* Fine gold side glow */}
        <div className="absolute inset-0 rounded-3xl border border-[#C9A84C]/5 pointer-events-none" />

        <h1 className={`${playfair.className} text-center text-2xl font-semibold tracking-wide text-white sm:text-3xl`}>
          Create your account
        </h1>
        <p className="mt-2 text-center text-xs text-neutral-500">
          Get started with premium legal document analysis
        </p>

        <button
          onClick={handleGoogle}
          disabled={isGoogleLoading || isLoading}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.03] py-3.5 text-xs font-bold tracking-wider text-white transition-all duration-300 hover:bg-white/[0.07] disabled:opacity-60"
        >
          {isGoogleLoading ? (
            <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : <GoogleIcon />}
          {isGoogleLoading ? "Redirecting..." : "Sign up with Google"}
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
            <label htmlFor="fullName" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-neutral-400">Full Name</label>
            <input
              id="fullName" name="fullName" type="text" autoComplete="name"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setErrors(p => ({ ...p, fullName: undefined })); setErrorMessage(""); }}
              className={inputClass} placeholder="Jane Doe"
            />
            {errors.fullName && <p className="mt-1.5 text-xs text-red-400 font-medium">{errors.fullName}</p>}
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-neutral-400">Email Address</label>
            <input
              id="email" name="email" type="email" autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })); setErrorMessage(""); }}
              className={inputClass} placeholder="you@example.com"
            />
            {errors.email && <p className="mt-1.5 text-xs text-red-400 font-medium">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-neutral-400">Password</label>
            <div className="relative">
              <input
                id="password" name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })); setErrorMessage(""); }}
                className={`${inputClass} pr-12`} placeholder="••••••••"
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

            {password.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.color : 'bg-white/10'}`}
                    />
                  ))}
                </div>

                <p className={`text-[10px] font-bold tracking-wide ${strength.score <= 1 ? 'text-rose-400' : strength.score <= 3 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {strength.label.toUpperCase()} PASSWORD
                </p>
              </div>
            )}

            {errors.password && <p className="mt-1.5 text-xs text-red-400 font-medium">{errors.password}</p>}
          </div>

          <div>
            <label htmlFor="confirm" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-neutral-400">Confirm Password</label>

            <div className="relative">
              <input
                id="confirm" name="confirm"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setErrors(p => ({ ...p, confirm: undefined })); setErrorMessage(""); }}
                className={`${inputClass} pr-12`} placeholder="••••••••"
              />

              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute top-1/2 right-2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-neutral-500 transition hover:text-[#C9A84C]"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </button>
            </div>

            {confirm.length > 0 && confirm === password && (
              <p className="mt-1.5 text-xs font-medium text-emerald-400">✓ Passwords match</p>
            )}

            {errors.confirm && <p className="mt-1.5 text-xs text-red-400 font-medium">{errors.confirm}</p>}
          </div>

          <div>
            <label className="flex cursor-pointer items-start gap-3 select-none">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => { setAgreedToTerms(e.target.checked); setErrors(p => ({ ...p, terms: undefined })); setErrorMessage(""); }}
                className="mt-0.5 size-4 rounded-full border-white/20 bg-white/5 accent-[#C9A84C]"
              />

              <span className="text-xs text-neutral-400 leading-snug">
                I agree to the{" "}
                <Link href="/terms" className="font-semibold text-[#C9A84C] hover:underline">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" className="font-semibold text-[#C9A84C] hover:underline">Privacy Policy</Link>
              </span>
            </label>

            {errors.terms && <p className="mt-1.5 text-xs text-red-400 font-medium">{errors.terms}</p>}
          </div>

          <div ref={errorRef}>
            {errorMessage && (
              <ErrorMessage
                title="Sign up failed"
                message={errorMessage}
                tone="red"
                onDismiss={() => setErrorMessage("")}
              />
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            className="w-full rounded-full bg-gradient-to-r from-[#C9A84C] to-[#aa8426] py-3.5 text-sm font-bold tracking-wider text-[#0A0A0A] shadow-md transition-all duration-300 hover:scale-[1.01] hover:from-[#d4b55d] hover:shadow-[0_4px_20px_rgba(201,168,76,0.2)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-[#0A0A0A]/30 border-t-[#0A0A0A]" />
                Creating account...
              </span>
            ) : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-neutral-500">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-semibold text-[#C9A84C] underline-offset-4 transition hover:text-[#d4b55d] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#050507]">
        <span className="size-6 animate-spin rounded-full border-2 border-white/20 border-t-[#C9A84C]" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
