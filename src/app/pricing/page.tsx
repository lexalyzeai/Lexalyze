"use client";

import { useEffect, useState } from "react";
import { Playfair_Display } from "next/font/google";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });

type Billing = "monthly" | "annual";
type Currency = "USD" | "INR";

function fmt(amount: number, currency: Currency) {
  if (amount === 0) return currency === "INR" ? "₹0" : "$0";
  return currency === "INR"
    ? `₹${amount.toLocaleString("en-IN")}`
    : `$${amount}`;
}

const SOLO   = { usd: { monthly: 12,   annual: 9   }, inr: { monthly: 999,  annual: 749  } };
const TEAM   = { usd: { monthly: 49,   annual: 39  }, inr: { monthly: 4099, annual: 3249 } };
const SEAT   = { usd: 12, inr: 999 };

function Check({ dim }: { dim?: boolean }) {
  return (
    <svg className={`size-4 shrink-0 ${dim ? "text-neutral-600" : "text-emerald-500"}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}
function Cross() {
  return (
    <svg className="size-4 shrink-0 text-neutral-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
function Row({ icon, text, sub, tag }: { icon: React.ReactNode; text: string; sub?: string; tag?: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5">{icon}</span>
      <span>
        <span className="text-sm text-neutral-200">{text}</span>
        {sub && <span className="ml-1 text-xs text-neutral-500">{sub}</span>}
        {tag && (
          <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">{tag}</span>
        )}
      </span>
    </li>
  );
}
function RowNo({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <Cross />
      <span className="text-sm text-neutral-600">{text}</span>
    </li>
  );
}

export default function PricingPage() {
  const [billing, setBilling] = useState<Billing>("monthly");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [detected, setDetected] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz === "Asia/Kolkata" || tz === "Asia/Calcutta") setCurrency("INR");
      setDetected(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const soloPrice  = SOLO[currency === "INR" ? "inr" : "usd"][billing];
  const teamPrice  = TEAM[currency === "INR" ? "inr" : "usd"][billing];
  const seatPrice  = SEAT[currency === "INR" ? "inr" : "usd"];
  const showPaymentNotice = () => {
    setNotice("Payments are not connected yet. Email lexalyze.ai@gmail.com for early access.");
    window.setTimeout(() => setNotice(""), 5000);
  };

  if (!detected) return null;

  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-[#C9A84C]/30">
      <Navbar />
      <div className="mx-auto w-full max-w-5xl px-4 py-20 sm:px-6">
        {/* Heading */}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A84C]">Pricing</p>
          <h1 className={`${playfair.className} mt-4 text-4xl font-bold text-white sm:text-5xl`}>
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-base text-neutral-400">
            Start free. Upgrade when you need more.
          </p>
          {notice && (
            <div className="mx-auto mt-5 max-w-xl rounded-xl border border-sky-400/25 bg-sky-400/10 px-4 py-3 text-sm font-medium text-sky-100">
              {notice}
            </div>
          )}
        </div>

        {/* Billing toggle */}
        <div className="mt-10 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${billing === "monthly" ? "bg-white/10 text-white" : "text-neutral-500 hover:text-neutral-300"}`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling("annual")}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${billing === "annual" ? "bg-white/10 text-white" : "text-neutral-500 hover:text-neutral-300"}`}
          >
            Annual
            <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">Save ~25%</span>
          </button>
        </div>

        {/* Currency toggle */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <button type="button" onClick={() => setCurrency("USD")} className={`text-xs font-medium transition ${currency === "USD" ? "text-white" : "text-neutral-500 hover:text-neutral-300"}`}>USD</button>
          <span className="text-neutral-600">·</span>
          <button type="button" onClick={() => setCurrency("INR")} className={`text-xs font-medium transition ${currency === "INR" ? "text-white" : "text-neutral-500 hover:text-neutral-300"}`}>INR</button>
        </div>

        {/* Cards */}
        <div className="mt-12 grid gap-6 sm:grid-cols-3">

          {/* Starter */}
          <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-[#0C0C0E] p-6">
            <div className="mb-6">
              <p className={`${playfair.className} text-2xl font-bold text-white`}>Starter</p>
              <p className="mt-1 text-sm text-neutral-500">Try the full analysis — no card required</p>
              <div className="mt-5">
                <span className={`${playfair.className} text-4xl font-bold text-white`}>{fmt(0, currency)}</span>
                <span className="ml-1 text-sm text-neutral-500">/month</span>
              </div>
              <p className="mt-1 text-xs text-neutral-500">Always free</p>
            </div>

            <div className="space-y-4 flex-1">
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">Documents</p>
                <ul className="space-y-2.5">
                  <Row icon={<Check />} text="5 documents / month" />
                  <Row icon={<Check />} text="Full analysis on every doc" sub="Checklists, red flags, deadlines, laws" />
                  <Row icon={<Check />} text="3 follow-ups per doc" />
                  <Row icon={<Check />} text="14-day history" />
                </ul>
              </div>
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">Storage</p>
                <ul className="space-y-2.5">
                  <Row icon={<Check />} text="5 MB per user" sub="~15–25 contracts" />
                  <Row icon={<Check dim />} text="Files purged after 14 days" />
                </ul>
              </div>
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">Not included</p>
                <ul className="space-y-2.5">
                  <RowNo text="No export" />
                  <RowNo text="No sharing" />
                  <RowNo text="No team workspace" />
                </ul>
              </div>
            </div>

            <Link
              href="/auth/signup"
              className="mt-8 block w-full rounded-xl border border-white/10 py-3 text-center text-sm font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
            >
              Get started free
            </Link>
          </div>

          {/* Solo — highlighted */}
          <div className="flex flex-col rounded-2xl border border-[#C9A84C]/40 bg-[#0C0C0E] p-6 shadow-[0_0_40px_rgba(201,168,76,0.08)] ring-1 ring-[#C9A84C]/20">
            <div className="mb-1 flex justify-center">
              <span className="rounded-full bg-[#C9A84C]/15 px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-[#C9A84C]">Most popular</span>
            </div>
            <div className="mb-6 mt-4">
              <p className={`${playfair.className} text-2xl font-bold text-white`}>Solo</p>
              <p className="mt-1 text-sm text-neutral-500">For individuals who review contracts regularly</p>
              <div className="mt-5">
                <span className={`${playfair.className} text-4xl font-bold text-white`}>{fmt(soloPrice, currency)}</span>
                <span className="ml-1 text-sm text-neutral-500">/month</span>
              </div>
              {billing === "annual" && (
                <p className="mt-1 text-xs text-neutral-500">billed annually</p>
              )}
            </div>

            <div className="space-y-4 flex-1">
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">Documents</p>
                <ul className="space-y-2.5">
                  <Row icon={<Check />} text="30 documents / month" />
                  <Row icon={<Check />} text="Full analysis on every doc" sub="Checklists, red flags, deadlines, laws" />
                  <Row icon={<Check />} text="Unlimited follow-ups" />
                  <Row icon={<Check />} text="1-year history" />
                </ul>
              </div>
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">Storage</p>
                <ul className="space-y-2.5">
                  <Row icon={<Check />} text="50 MB per user" sub="~150–250 contracts" />
                  <Row icon={<Check />} text="Files kept for 1 year" tag="1 year" />
                </ul>
              </div>
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">Outputs</p>
                <ul className="space-y-2.5">
                  <Row icon={<Check />} text="Export as PDF &amp; DOCX" />
                  <Row icon={<Check />} text="Share via view-only link" sub="Recipients need no account" />
                  <RowNo text="No team workspace" />
                </ul>
              </div>
            </div>

            <button
              type="button"
              onClick={showPaymentNotice}
              className="mt-8 block w-full rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#aa8426] py-3 text-center text-sm font-bold text-[#0A0A0A] transition hover:from-[#d4b55d] hover:to-[#b89542]"
            >
              Start Solo
            </button>
          </div>

          {/* Team */}
          <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-[#0C0C0E] p-6">
            <div className="mb-1 flex justify-center">
              <span className="rounded-full bg-emerald-500/10 px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400">For teams</span>
            </div>
            <div className="mb-6 mt-4">
              <p className={`${playfair.className} text-2xl font-bold text-white`}>Team</p>
              <p className="mt-1 text-sm text-neutral-500">When a Solo user needs to loop in colleagues</p>
              <div className="mt-5">
                <span className={`${playfair.className} text-4xl font-bold text-white`}>{fmt(teamPrice, currency)}</span>
                <span className="ml-1 text-sm text-neutral-500">/month</span>
              </div>
              {billing === "annual" && (
                <p className="mt-1 text-xs text-neutral-500">billed annually · 3 seats included</p>
              )}
              {billing === "monthly" && (
                <p className="mt-1 text-xs text-neutral-500">3 seats included</p>
              )}
            </div>

            <div className="space-y-4 flex-1">
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">Documents</p>
                <ul className="space-y-2.5">
                  <Row icon={<Check />} text="Unlimited documents" />
                  <Row icon={<Check />} text="Full analysis on every doc" sub="Checklists, red flags, deadlines, laws" />
                  <Row icon={<Check />} text="Unlimited follow-ups" />
                  <Row icon={<Check />} text="Unlimited history" />
                </ul>
              </div>
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">Storage</p>
                <ul className="space-y-2.5">
                  <Row icon={<Check />} text="200 MB per workspace" sub="Shared across all seats" />
                  <Row icon={<Check />} text="Files kept permanently" tag="Permanent" />
                </ul>
              </div>
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">Outputs &amp; Team</p>
                <ul className="space-y-2.5">
                  <Row icon={<Check />} text="Export PDF, DOCX &amp; CSV" />
                  <Row icon={<Check />} text="Share with comments &amp; edits" />
                  <Row icon={<Check />} text="3 seats + roles" sub={`+${fmt(seatPrice, currency)}/seat/month for more`} />
                  <Row icon={<Check />} text="Shared workspace &amp; folders" />
                  <Row icon={<Check />} text="Bulk upload (up to 10 docs)" />
                </ul>
              </div>
            </div>

            <button
              type="button"
              onClick={showPaymentNotice}
              className="mt-8 block w-full rounded-xl border border-white/10 py-3 text-center text-sm font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
            >
              Start Team trial
            </button>
          </div>
        </div>

        {/* FAQ note */}
        <div className="mt-14 border-t border-white/[0.06] pt-10 text-center">
          <p className="text-sm text-neutral-500">
            All plans include full AI analysis powered by LLaMA 3.3 70B (Groq).{" "}
            <span className="text-neutral-400">Not legal advice.</span>
          </p>
          <p className="mt-3 text-sm text-neutral-500">
            Questions?{" "}
            <a href="mailto:lexalyze.ai@gmail.com" className="text-[#C9A84C] hover:underline">
              lexalyze.ai@gmail.com
            </a>
            {currency === "INR" && (
              <span className="ml-2 text-xs text-neutral-600">(Prices shown in Indian Rupees)</span>
            )}
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm font-medium text-[#C9A84C] hover:underline">← Back to home</Link>
        </div>
      </div>
    </main>
  );
}
