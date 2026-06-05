"use client";

import Link from "next/link";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050507] px-4 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101010] p-7 text-center shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#C9A84C]">Lexalyze</p>
        <h1 className="mt-3 text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-400">
          The page hit an unexpected error. You can retry the page or return home.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="flex-1 rounded-lg bg-[#C9A84C] px-4 py-2.5 text-sm font-semibold text-[#0A0A0A] transition hover:bg-[#d4b55d]"
          >
            Try again
          </button>
          <Link
            href="/"
            className="flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-semibold text-neutral-300 transition hover:border-[#C9A84C]/50 hover:text-[#C9A84C]"
          >
            Go home
          </Link>
        </div>
      </section>
    </main>
  );
}
