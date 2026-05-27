"use client";

import Link from "next/link";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

export default function Navbar() {
  return (
    <header className="sticky top-4 z-50 mx-auto w-[92%] max-w-6xl rounded-full border border-white/[0.06] bg-black/50 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all duration-300">
      <nav className="flex w-full items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 animate-pulse-gold rounded-full bg-[#C9A84C] shadow-[0_0_10px_rgba(201,168,76,0.8)]"
            aria-hidden
          />
          <span
            className={`${playfair.className} text-lg font-bold tracking-[0.15em] text-[#C9A84C] sm:text-xl md:tracking-[0.2em]`}
          >
            LEXALYZE
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/auth/login"
            className="rounded-full border border-[#C9A84C]/50 bg-transparent px-4 py-2 text-xs font-semibold tracking-wide text-[#C9A84C] shadow-[0_0_15px_rgba(201,168,76,0.03)] transition-all duration-300 hover:border-[#d4b55d] hover:bg-[#C9A84C]/10 hover:text-[#d4b55d] hover:shadow-[0_0_20px_rgba(201,168,76,0.08)] sm:px-5 sm:text-sm"
          >
            Sign in
          </Link>

          <Link
            href="/auth/signup"
            className="rounded-full bg-gradient-to-r from-[#C9A84C] to-[#aa8426] px-4 py-2 text-xs font-bold tracking-wide text-[#0A0A0A] shadow-[0_4px_20px_rgba(201,168,76,0.15)] transition-all duration-300 hover:scale-[1.02] hover:from-[#d4b55d] hover:to-[#b89542] hover:shadow-[0_6px_25px_rgba(201,168,76,0.25)] active:scale-[0.98] sm:px-5 sm:text-sm"
          >
            Get started
          </Link>

          <Link
            href="/dashboard/history"
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium tracking-wide text-neutral-400 transition-all duration-300 hover:bg-white/[0.05] hover:text-white sm:text-sm"
          >
            History
          </Link>

          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-500 md:inline-block">
            Not legal advice
          </span>
        </div>
      </nav>
    </header>
  );
}