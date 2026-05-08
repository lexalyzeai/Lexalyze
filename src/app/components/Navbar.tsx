"use client";

import Link from "next/link";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0A0A0A]/95 backdrop-blur-sm">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full bg-[#C9A84C]"
            aria-hidden
          />
          <span
            className={`${playfair.className} text-lg font-bold tracking-[0.1em] text-[#C9A84C] sm:text-xl`}
          >
            LEXALYZE
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/auth/login"
            className="rounded-lg border border-[#C9A84C]/70 bg-transparent px-3 py-2 text-sm font-medium text-[#C9A84C] transition hover:border-[#d4b55d] hover:bg-[#C9A84C]/10 hover:text-[#d4b55d] sm:px-4"
          >
            Sign in
          </Link>

          <Link
            href="/auth/signup"
            className="rounded-lg bg-[#C9A84C] px-3 py-2 text-sm font-semibold text-[#0A0A0A] transition hover:bg-[#d4b55d] active:bg-[#b89542] sm:px-4"
          >
            Get started
          </Link>

          <Link
            href="/dashboard/history"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-neutral-400 transition hover:bg-white/5 hover:text-white"
          >
            History
          </Link>
        </div>
      </nav>
    </header>
  );
}