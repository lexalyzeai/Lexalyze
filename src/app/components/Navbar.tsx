"use client";

import Link from "next/link";
import { Playfair_Display } from "next/font/google";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

const NAV_LINKS = [
  { label: "Features", href: "/#what-lexalyze-reads" },
  { label: "Demo", href: "/#live-demo" },
  { label: "FAQ", href: "/#faq" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="sticky top-4 z-50 mx-auto w-[92%] max-w-6xl">
      {/* Main navbar pill */}
      <header className="rounded-full border border-white/[0.06] bg-black/50 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all duration-300">
        <nav className="flex w-full items-center justify-between px-5 py-3 sm:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span
              className="inline-block h-2.5 w-2.5 animate-pulse-gold rounded-full bg-[#C9A84C] shadow-[0_0_10px_rgba(201,168,76,0.8)]"
              aria-hidden
            />
            <span
              className={`${playfair.className} text-lg font-bold tracking-[0.15em] text-[#C9A84C] sm:text-xl md:tracking-[0.2em]`}
            >
              LEXALYZE
            </span>
          </Link>

          {/* Desktop nav links — centred */}
          <div className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="text-xs font-medium tracking-wide text-neutral-400 transition-colors duration-200 hover:text-white"
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/auth/login"
              className="hidden rounded-full border border-[#C9A84C]/50 bg-transparent px-4 py-2 text-xs font-semibold tracking-wide text-[#C9A84C] shadow-[0_0_15px_rgba(201,168,76,0.03)] transition-all duration-300 hover:border-[#d4b55d] hover:bg-[#C9A84C]/10 hover:text-[#d4b55d] sm:inline-flex sm:px-5 sm:text-sm"
            >
              Sign in
            </Link>

            <Link
              href="/auth/signup"
              className="rounded-full bg-gradient-to-r from-[#C9A84C] to-[#aa8426] px-4 py-2 text-xs font-bold tracking-wide text-[#0A0A0A] shadow-[0_4px_20px_rgba(201,168,76,0.15)] transition-all duration-300 hover:scale-[1.02] hover:from-[#d4b55d] hover:to-[#b89542] hover:shadow-[0_6px_25px_rgba(201,168,76,0.25)] active:scale-[0.98] sm:px-5 sm:text-sm"
            >
              Get started
            </Link>

            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-500 lg:inline-block">
              Not legal advice
            </span>

            {/* Hamburger — mobile & tablet only */}
            <button
              type="button"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-white/[0.06] hover:text-white md:hidden"
            >
              {mobileOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile / tablet dropdown */}
      {mobileOpen && (
        <div className="mt-2 overflow-hidden rounded-2xl border border-white/[0.06] bg-black/90 shadow-[0_12px_40px_rgba(0,0,0,0.7)] backdrop-blur-xl">
          {/* Nav links */}
          <div className="divide-y divide-white/[0.05] px-4 py-2">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="block py-3.5 text-sm font-medium tracking-wide text-neutral-300 transition hover:text-white"
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Auth buttons */}
          <div className="flex flex-col gap-2 border-t border-white/[0.06] p-4">
            <Link
              href="/auth/login"
              onClick={() => setMobileOpen(false)}
              className="w-full rounded-full border border-[#C9A84C]/50 py-2.5 text-center text-sm font-semibold tracking-wide text-[#C9A84C] transition hover:bg-[#C9A84C]/10 hover:border-[#d4b55d]"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              onClick={() => setMobileOpen(false)}
              className="w-full rounded-full bg-gradient-to-r from-[#C9A84C] to-[#aa8426] py-2.5 text-center text-sm font-bold tracking-wide text-[#0A0A0A] transition hover:from-[#d4b55d] hover:to-[#b89542]"
            >
              Get started
            </Link>
          </div>

          {/* Disclaimer */}
          <p className="border-t border-white/[0.05] px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-600">
            Not legal advice
          </p>
        </div>
      )}
    </div>
  );
}
