"use client";

import { useState } from "react";
import { Playfair_Display } from "next/font/google";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import { PLAN_CATALOG, type PlanDetails, type PlanFeature } from "@/lib/plans";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });

const PLANS = [PLAN_CATALOG.free, PLAN_CATALOG.solo, PLAN_CATALOG.team];

function fmtInr(amount: number) {
  return `\u20b9${amount.toLocaleString("en-IN")}`;
}

function Check({ dim }: { dim?: boolean }) {
  return (
    <svg className={`size-4 shrink-0 ${dim ? "text-neutral-600" : "text-emerald-400"}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
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

function Row({ feature }: { feature: PlanFeature }) {
  const included = feature.included !== false;

  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5">{included ? <Check dim={feature.text.includes("purged")} /> : <Cross />}</span>
      <span className="min-w-0">
        <span className={`block text-sm ${included ? "text-neutral-100" : "text-neutral-600"}`}>{feature.text}</span>
        {feature.sub ? <span className="mt-0.5 block text-xs leading-5 text-neutral-500">{feature.sub}</span> : null}
        {feature.tag ? (
          <span className="mt-1 inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">{feature.tag}</span>
        ) : null}
      </span>
    </li>
  );
}

function FeatureGroup({ title, features }: { title: string; features: PlanFeature[] }) {
  return (
    <div>
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">{title}</p>
      <ul className="space-y-2.5">
        {features.map((feature) => (
          <Row key={`${title}-${feature.text}`} feature={feature} />
        ))}
      </ul>
    </div>
  );
}

function PlanCard({ plan, onPaymentNotice }: { plan: PlanDetails; onPaymentNotice: () => void }) {
  const isStarter = plan.id === "free";
  const isTeam = plan.id === "team";

  return (
    <article
      className={`relative flex min-h-[720px] flex-col overflow-hidden rounded-2xl border p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] ${
        plan.highlighted
          ? "border-[#C9A84C]/45 bg-[#10100E] ring-1 ring-[#C9A84C]/25"
          : "border-white/[0.08] bg-[#0C0C0E]"
      }`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/50 to-transparent" />

      {plan.eyebrow ? (
        <div className="mb-6 flex justify-center">
          <span className={`rounded-full px-4 py-1 text-[10px] font-bold uppercase tracking-widest ${
            plan.highlighted ? "bg-[#C9A84C]/15 text-[#C9A84C]" : "bg-emerald-500/10 text-emerald-400"
          }`}>
            {plan.eyebrow}
          </span>
        </div>
      ) : null}

      <div>
        <p className={`${playfair.className} text-2xl font-bold text-white`}>{plan.name}</p>
        <p className="mt-2 min-h-10 text-sm leading-6 text-neutral-500">{plan.description}</p>
        <div className="mt-5">
          <span className={`${playfair.className} text-4xl font-bold text-white`}>{fmtInr(plan.monthlyPriceInr)}</span>
          <span className="ml-1 text-sm text-neutral-500">/month</span>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          {isStarter ? "Always free" : isTeam ? `${plan.includedSeats} seats included` : "For one user"}
        </p>
      </div>

      <div className="mt-7 flex-1 space-y-5">
        <FeatureGroup title="Documents" features={plan.documents} />
        <FeatureGroup title="Storage" features={plan.storage} />
        <FeatureGroup title={isStarter ? "Not included" : isTeam ? "Outputs & Team" : "Outputs"} features={plan.outputs} />
      </div>

      {isStarter ? (
        <Link
          href="/auth/signup"
          className="mt-8 block w-full rounded-xl border border-white/10 py-3 text-center text-sm font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
        >
          {plan.cta}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onPaymentNotice}
          className={`mt-8 block w-full rounded-xl py-3 text-center text-sm font-bold transition ${
            plan.highlighted
              ? "bg-gradient-to-r from-[#C9A84C] to-[#aa8426] text-[#0A0A0A] hover:from-[#d4b55d] hover:to-[#b89542]"
              : "border border-white/10 text-neutral-200 hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
          }`}
        >
          {plan.cta}
        </button>
      )}
    </article>
  );
}

export default function PricingPage() {
  const [notice, setNotice] = useState("");

  const showPaymentNotice = () => {
    setNotice("Payments are not connected yet. Email lexalyze.ai@gmail.com for early access.");
    window.setTimeout(() => setNotice(""), 5000);
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-[#C9A84C]/30">
      <Navbar />
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A84C]">Pricing</p>
          <h1 className={`${playfair.className} mt-4 text-4xl font-bold text-white sm:text-5xl`}>
            Plans built for legal document review
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-neutral-400">
            Full analysis stays available on every tier. Upgrade only when you need more volume, longer history, exports, sharing, or team workflows.
          </p>
          {notice ? (
            <div className="mx-auto mt-5 max-w-xl rounded-xl border border-sky-400/25 bg-sky-400/10 px-4 py-3 text-sm font-medium text-sky-100">
              {notice}
            </div>
          ) : null}
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onPaymentNotice={showPaymentNotice} />
          ))}
        </div>

        <section className="mt-12 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
          <div className="grid gap-4 text-sm leading-6 text-neutral-400 md:grid-cols-3">
            <p><span className="font-semibold text-neutral-200">Supabase-free-tier friendly:</span> storage promises are caps, not a reason to keep large raw files forever.</p>
            <p><span className="font-semibold text-neutral-200">Exports:</span> Starter cannot export or share. Solo unlocks PDF/DOCX and view-only sharing. Team adds CSV.</p>
            <p><span className="font-semibold text-neutral-200">Payments:</span> subscription management unlocks after payments are connected.</p>
          </div>
        </section>

        <div className="mt-14 border-t border-white/[0.06] pt-10 text-center">
          <p className="text-sm text-neutral-500">
            All plans include full AI analysis. <span className="text-neutral-400">Not legal advice.</span>
          </p>
          <p className="mt-3 text-sm text-neutral-500">
            Questions?{" "}
            <a href="mailto:lexalyze.ai@gmail.com" className="text-[#C9A84C] hover:underline">
              lexalyze.ai@gmail.com
            </a>
            <span className="ml-2 text-xs text-neutral-600">(Prices shown in Indian Rupees)</span>
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm font-medium text-[#C9A84C] hover:underline">Back to home</Link>
        </div>
      </div>
    </main>
  );
}
