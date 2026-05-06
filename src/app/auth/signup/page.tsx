"use client";

import { Playfair_Display } from "next/font/google";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";


const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormErrors = {
  fullName?: string;
  email?: string;
  password?: string;
};

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
      />
    </svg>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function validate(): boolean {
    const next: FormErrors = {};

    if (!fullName.trim()) {
      next.fullName = "Full name is required.";
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      next.email = "Email is required.";
    } else if (!EMAIL_RE.test(trimmedEmail)) {
      next.email = "Enter a valid email address.";
    }

    if (!password) {
      next.password = "Password is required.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;
    setErrorMessage("");
    setIsLoading(true);

    const trimmedFullName = fullName.trim();
    const trimmedEmail = email.trim();

    const { error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          full_name: trimmedFullName,
        },
      },
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-4 py-16">
      <p
        className={`${playfair.className} mb-14 text-center text-4xl font-semibold tracking-tight text-white sm:mb-16 sm:text-5xl md:text-6xl`}
      >
        Lexalyze
      </p>

      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121212] p-8 shadow-xl shadow-black/40">
        <h1
          className={`${playfair.className} text-center text-3xl font-semibold tracking-tight text-white sm:text-4xl`}
        >
          Create your account
        </h1>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
          <div>
            <label
              htmlFor="fullName"
              className="mb-1.5 block text-sm font-medium text-neutral-300"
            >
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errorMessage) setErrorMessage("");
                if (errors.fullName) {
                  setErrors((prev) => ({ ...prev, fullName: undefined }));
                }
              }}
              className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white placeholder:text-neutral-600 outline-none transition focus:border-[#C9A84C]/50 focus:ring-2 focus:ring-[#C9A84C]/25"
              placeholder="Jane Doe"
              aria-invalid={errors.fullName ? true : undefined}
              aria-describedby={errors.fullName ? "fullName-error" : undefined}
            />
            {errors.fullName ? (
              <p id="fullName-error" className="mt-1.5 text-sm text-red-400">
                {errors.fullName}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-neutral-300"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMessage) setErrorMessage("");
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
              className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white placeholder:text-neutral-600 outline-none transition focus:border-[#C9A84C]/50 focus:ring-2 focus:ring-[#C9A84C]/25"
              placeholder="you@example.com"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email ? (
              <p id="email-error" className="mt-1.5 text-sm text-red-400">
                {errors.email}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-neutral-300"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                if (errorMessage) setErrorMessage("");
                  if (errors.password) {
                    setErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] py-3 pr-12 pl-4 text-white placeholder:text-neutral-600 outline-none transition focus:border-[#C9A84C]/50 focus:ring-2 focus:ring-[#C9A84C]/25"
                placeholder="••••••••"
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={errors.password ? "password-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute top-1/2 right-1.5 flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-neutral-500 transition hover:text-[#C9A84C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A84C]/60"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOffIcon className="size-5" />
                ) : (
                  <EyeIcon className="size-5" />
                )}
              </button>
            </div>
            {errors.password ? (
              <p id="password-error" className="mt-1.5 text-sm text-red-400">
                {errors.password}
              </p>
            ) : null}
          </div>

          {errorMessage ? (
            <p className="text-sm text-red-400" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 w-full rounded-lg bg-[#C9A84C] py-3 text-center text-base font-semibold text-[#0A0A0A] transition hover:bg-[#d4b55d] active:bg-[#b89542] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "Creating account..." : "Get started"}
          </button>
        </form>
      </div>
    </div>
  );
}
