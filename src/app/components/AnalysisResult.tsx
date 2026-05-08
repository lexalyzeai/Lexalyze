"use client";

import { Playfair_Display } from "next/font/google";
import { FormEvent, useState } from "react";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

type Confidence = "HIGH" | "MEDIUM" | "LOW";

export type RiskFlag = {
  title: string;
  description: string;
  confidence: Confidence;
  quote: string;
};

export type FavourableClause = {
  title: string;
  description: string;
  confidence: Confidence;
  quote: string;
};

export type AnalysisResultData = {
  credibilityPercent: number;
  overallConfidence: Confidence;
  documentTitle: string;
  oneLineSummary: string;
  fullSummary: string;
  keyNumbersAndDates: string[];
  riskFlags: RiskFlag[];
  favourableClauses: FavourableClause[];
  actionChecklist: string[];
  cannotDetermineList: string[];
  lawyerGuidance?: string;
};

export type AnalysisResultProps = {
  data?: AnalysisResultData;
};

export const SAMPLE_ANALYSIS_RESULT: AnalysisResultData = {
  credibilityPercent: 82,
  overallConfidence: "MEDIUM",
  documentTitle: "Residential Lease Agreement",
  oneLineSummary:
    "The contract is mostly standard but contains penalties and ambiguous maintenance clauses.",
  fullSummary:
    "This lease includes clear payment obligations and timeline references but places several liabilities on the tenant. Late fees and lock-in penalties are present and may create a financial burden. Utility and maintenance responsibilities are partially defined, with important edge cases left unclear. Renewal and exit clauses should be reviewed with a legal professional before signing.",
  keyNumbersAndDates: [
    "Monthly rent: INR 25,000",
    "Security deposit: INR 50,000",
    "Agreement start date: 01 July 2026",
    "Notice period: 60 days",
    "Late payment fee: INR 1,000 per day",
  ],
  riskFlags: [
    {
      title: "High lock-in penalty",
      description:
        "Early termination within the lock-in period requires paying remaining months in full.",
      confidence: "HIGH",
      quote:
        "If the Tenant exits before completion of 11 months, the entire unpaid rent for the lock-in period shall become immediately due.",
    },
    {
      title: "Broad damage liability",
      description:
        "The tenant may be responsible for damages not clearly differentiated from normal wear and tear.",
      confidence: "MEDIUM",
      quote:
        "Any and all damage observed at handover shall be chargeable to the Tenant at the sole discretion of the Owner.",
    },
  ],
  favourableClauses: [
    {
      title: "Defined rent due date",
      description:
        "Payment date is explicitly specified, reducing ambiguity in recurring obligations.",
      confidence: "HIGH",
      quote: "Monthly rent shall be paid on or before the 5th day of each month.",
    },
    {
      title: "Security deposit return timeline",
      description: "The document commits to a return window after vacating.",
      confidence: "MEDIUM",
      quote:
        "The refundable security deposit shall be returned within 30 days of handover, subject to lawful deductions.",
    },
  ],
  actionChecklist: [
    "Ask landlord to cap lock-in exit charges.",
    "Request explicit definition of normal wear and tear.",
    "Confirm whether utility arrears are independently verifiable.",
    "Get all verbal commitments added in writing.",
  ],
  cannotDetermineList: [
    "Whether municipal taxes can be charged separately during the term.",
    "Whether rent escalation applies immediately on renewal or after notice.",
    "Whether dispute resolution venue is exclusive and enforceable.",
  ],
  lawyerGuidance:
    "This analysis is informational only and may miss legal nuances specific to your situation. Consult a licensed legal professional before making important decisions.",
};

function confidenceBadgeClass(confidence: Confidence): string {
  if (confidence === "HIGH") {
    return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30";
  }
  if (confidence === "MEDIUM") {
    return "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30";
  }
  return "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30";
}

export default function AnalysisResult({
  data = SAMPLE_ANALYSIS_RESULT,
}: AnalysisResultProps) {
  const [followUpQuestion, setFollowUpQuestion] = useState("");

  function onFollowUpSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!followUpQuestion.trim()) return;
    // Frontend-only placeholder until follow-up API is connected.
    console.log("Follow-up submitted:", followUpQuestion.trim());
  }

  return (
    <section className="w-full space-y-5 rounded-2xl bg-[#0A0A0A] p-4 text-white sm:p-6">
      <div className="rounded-xl border border-emerald-500/30 bg-[#121212] p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-emerald-300">Analysis credibility</span>
          <span className="font-semibold text-emerald-200">
            {data.credibilityPercent}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all duration-500"
            style={{ width: `${Math.max(0, Math.min(100, data.credibilityPercent))}%` }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#121212] p-5">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${confidenceBadgeClass(data.overallConfidence)}`}
        >
          Overall Confidence: {data.overallConfidence}
        </span>
        <h1 className={`${playfair.className} mt-3 text-2xl sm:text-3xl`}>
          {data.documentTitle}
        </h1>
        <p className="mt-3 rounded-lg border border-[#C9A84C]/30 bg-[#C9A84C]/10 px-4 py-3 text-sm text-[#f5e2ac]">
          {data.oneLineSummary}
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#121212] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Full Summary
        </h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-200">
          {data.fullSummary}
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#121212] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Key Numbers and Dates
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {data.keyNumbersAndDates.map((item) => (
            <li
              key={item}
              className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-neutral-200"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3 rounded-xl border border-rose-500/30 bg-[#121212] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-rose-300">
          Risk Flags
        </h2>
        {data.riskFlags.map((flag) => (
          <article key={flag.title} className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-medium text-rose-100">{flag.title}</h3>
              <span className={`rounded-full px-2.5 py-1 text-xs ${confidenceBadgeClass(flag.confidence)}`}>
                {flag.confidence}
              </span>
            </div>
            <p className="mt-2 text-sm text-rose-50/90">{flag.description}</p>
            <p className="mt-2 border-l-2 border-rose-400/40 pl-3 text-xs italic text-rose-200/90">
              “{flag.quote}”
            </p>
          </article>
        ))}
      </div>

      <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-[#121212] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
          Favourable Clauses
        </h2>
        {data.favourableClauses.map((point) => (
          <article
            key={point.title}
            className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-medium text-emerald-100">{point.title}</h3>
              <span className={`rounded-full px-2.5 py-1 text-xs ${confidenceBadgeClass(point.confidence)}`}>
                {point.confidence}
              </span>
            </div>
            <p className="mt-2 text-sm text-emerald-50/90">{point.description}</p>
            <p className="mt-2 border-l-2 border-emerald-400/40 pl-3 text-xs italic text-emerald-200/90">
              “{point.quote}”
            </p>
          </article>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-[#121212] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Action Checklist
        </h2>
        <ul className="mt-3 space-y-2">
          {data.actionChecklist.map((item) => (
            <li key={item} className="flex items-start gap-3 rounded-lg bg-white/[0.02] px-3 py-2">
              <span className="mt-0.5 inline-block h-4 w-4 rounded border border-[#C9A84C]/60 bg-[#0A0A0A]" />
              <span className="text-sm text-neutral-200">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-[#121212] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-300">
          Limitations
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-100/90">
          {(data.cannotDetermineList.length
            ? data.cannotDetermineList
            : ["No specific limitations were provided."]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-[#C9A84C]/30 bg-[#121212] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#C9A84C]">
          Lawyer Guidance
        </h2>
        <p className="mt-3 text-sm leading-6 text-neutral-200">
          {data.lawyerGuidance ??
            "This AI summary is informational and not legal advice. Consult a qualified lawyer before making important legal or financial decisions."}
        </p>
      </div>

      <form
        onSubmit={onFollowUpSubmit}
        className="rounded-xl border border-white/10 bg-[#121212] p-5"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Follow-up Question
        </h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={followUpQuestion}
            onChange={(e) => setFollowUpQuestion(e.target.value)}
            placeholder="Ask a follow-up question about this document..."
            className="w-full rounded-lg border border-white/10 bg-[#0F0F0F] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C9A84C]/60 focus:ring-2 focus:ring-[#C9A84C]/20"
          />
          <button
            type="submit"
            className="rounded-lg bg-[#C9A84C] px-4 py-3 text-sm font-semibold text-[#0A0A0A] transition hover:bg-[#d4b55d]"
          >
            Submit
          </button>
        </div>
      </form>
    </section>
  );
}
