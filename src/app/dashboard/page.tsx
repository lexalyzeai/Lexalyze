"use client";

import { Playfair_Display } from "next/font/google";
import { useState } from "react";
import DocumentUpload from "../components/DocumentUpload";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

type NavId = "analyses" | "new-analysis";
type Language = "EN" | "HI";

const navItems: { id: NavId; label: string }[] = [
  { id: "analyses", label: "Analyses" },
  { id: "new-analysis", label: "New Analysis" },
];

export default function DashboardPage() {
  const [activeNav, setActiveNav] = useState<NavId>("analyses");
  const [language, setLanguage] = useState<Language>("EN");

  return (
    <div className="flex h-screen min-h-0 overflow-x-hidden overflow-y-auto bg-[#0A0A0A]">
      <aside className="flex w-[240px] shrink-0 flex-col border-r border-white/[0.06] bg-[#111111]">
        <div className="px-5 pt-8 pb-6">
          <p
            className={`${playfair.className} text-[1.35rem] font-bold leading-tight tracking-[0.12em] text-[#C9A84C] sm:text-2xl`}
          >
            LEXALYZE
          </p>
        </div>

        <nav className="flex flex-col gap-0.5 px-3" aria-label="Main">
          {navItems.map((item) => {
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveNav(item.id)}
                className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                  isActive
                    ? "bg-[#C9A84C]/12 text-[#C9A84C] ring-1 ring-[#C9A84C]/25"
                    : "text-neutral-400 hover:bg-white/[0.06] hover:text-neutral-100"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-white/[0.06] px-4 py-5">
          <p className="truncate text-xs text-neutral-500" title="user@example.com">
            user@example.com
          </p>
          <button
            type="button"
            className="mt-3 w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm font-medium text-neutral-300 transition hover:border-[#C9A84C]/40 hover:bg-white/[0.04] hover:text-[#C9A84C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A84C]/50"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-lg">
          <p className="mb-2 text-xs font-medium tracking-wide text-neutral-500">
            Analysis Language
          </p>
          <div className="mb-6 inline-flex rounded-full border border-white/10 bg-[#111111] p-1">
            <button
              type="button"
              onClick={() => setLanguage("EN")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                language === "EN"
                  ? "bg-[#C9A84C] text-[#0A0A0A]"
                  : "text-neutral-300 hover:bg-white/[0.06] hover:text-white"
              }`}
              aria-pressed={language === "EN"}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage("HI")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                language === "HI"
                  ? "bg-[#C9A84C] text-[#0A0A0A]"
                  : "text-neutral-300 hover:bg-white/[0.06] hover:text-white"
              }`}
              aria-pressed={language === "HI"}
            >
              हिंदी
            </button>
          </div>

          <DocumentUpload />
        </div>
      </main>
    </div>
  );
}
