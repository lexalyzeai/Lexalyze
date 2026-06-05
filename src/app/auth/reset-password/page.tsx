"use client";

import { Playfair_Display } from "next/font/google";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import BrandMark from "@/app/components/BrandMark";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });

const inputClass =
  "w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white placeholder:text-neutral-600 outline-none transition focus:border-[#C9A84C]/50 focus:ring-2 focus:ring-[#C9A84C]/25";

function mapResetPasswordError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("same")) {
    return "Choose a new password that is different from your current password.";
  }
  if (lower.includes("weak") || lower.includes("password")) {
    return "Choose a stronger password and try again.";
  }
  if (lower.includes("expired") || lower.includes("invalid")) {
    return "This reset link is invalid or expired. Please request a new one.";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  return "Could not update your password. Please try again.";
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validSession, setValidSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setValidSession(true);
      } else {
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: retryData }) => {
            if (retryData.session) {
              setValidSession(true);
            } else {
              router.push("/auth/login?error=reset_expired");
            }
          });
        }, 1000);
      }
    });
  }, [router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setIsLoading(false);

    if (error) {
      setError(mapResetPasswordError(error.message));
      return;
    }

    // Notify other tabs/windows that reset completed
    localStorage.setItem(
      "password_reset_completed",
      Date.now().toString()
    );

    setSuccess(true);

    // Sign out first so middleware doesn't redirect to dashboard
    await supabase.auth.signOut();

    setTimeout(() => {
      router.push("/auth/login?reset=success");
    }, 2000);
  }

  if (!validSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <span className="size-6 animate-spin rounded-full border-2 border-white/20 border-t-[#C9A84C]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-4 py-16">
      <BrandMark href="/" size="lg" className="mb-14 justify-center" />

      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121212] p-8 shadow-xl shadow-black/40">
        <h1
          className={`${playfair.className} text-center text-2xl font-semibold text-white sm:text-3xl`}
        >
          Set new password
        </h1>

        {success ? (
          <div className="mt-8 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-center text-sm text-emerald-300">
            Password updated! Redirecting to login...
          </div>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label
                htmlFor="new-password"
                className="mb-1.5 block text-sm font-medium text-neutral-300"
              >
                New password
              </label>

              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-1.5 block text-sm font-medium text-neutral-300"
              >
                Confirm password
              </label>

              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setError("");
                }}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-[#C9A84C] py-3 text-base font-semibold text-[#0A0A0A] transition hover:bg-[#d4b55d] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-[#0A0A0A]/30 border-t-[#0A0A0A]" />
                  Updating...
                </span>
              ) : (
                "Update password"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
