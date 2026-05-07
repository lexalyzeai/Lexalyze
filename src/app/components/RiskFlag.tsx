"use client";

export type RiskSeverity = "HIGH" | "MEDIUM" | "LOW";
export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export interface RiskFlagProps {
  title: string;
  severity: RiskSeverity;
  explanation: string;
  exactQuote: string;
  confidence: ConfidenceLevel;
  confidenceReason: string;
}

export const RISK_FLAG_DEMO_DATA: RiskFlagProps = {
  title: "Uncapped early termination penalty",
  severity: "HIGH",
  explanation:
    "The agreement appears to require payment of remaining dues if the contract is ended early, and no maximum cap is clearly stated.",
  exactQuote:
    "If the Tenant terminates this Agreement prior to completion of the lock-in period, all pending rent for the remaining term shall become immediately payable.",
  confidence: "MEDIUM",
  confidenceReason:
    "The clause is explicit about pending rent liability, but waiver conditions are not fully defined.",
};

function severityStyles(severity: RiskSeverity): {
  border: string;
  badge: string;
} {
  if (severity === "HIGH") {
    return {
      border: "border-l-4 border-l-rose-500",
      badge: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
    };
  }
  if (severity === "MEDIUM") {
    return {
      border: "border-l-4 border-l-amber-400",
      badge: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
    };
  }
  return {
    border: "border-l-4 border-l-emerald-500",
    badge: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
  };
}

function confidenceMeta(confidence: ConfidenceLevel): {
  percent: number;
  bar: string;
  text: string;
} {
  if (confidence === "HIGH") {
    return { percent: 88, bar: "bg-emerald-400", text: "text-emerald-300" };
  }
  if (confidence === "MEDIUM") {
    return { percent: 64, bar: "bg-amber-400", text: "text-amber-300" };
  }
  return { percent: 38, bar: "bg-rose-400", text: "text-rose-300" };
}

export default function RiskFlag({
  title,
  severity,
  explanation,
  exactQuote,
  confidence,
  confidenceReason,
}: RiskFlagProps) {
  const severityUi = severityStyles(severity);
  const confidenceUi = confidenceMeta(confidence);

  return (
    <article
      className={`w-full rounded-xl border border-white/10 bg-[#141414] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.28)] sm:p-5 ${severityUi.border}`}
    >
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="text-base font-semibold leading-snug text-white sm:text-lg">
          {title}
        </h3>
        <span
          className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide ${severityUi.badge}`}
        >
          {severity}
        </span>
      </header>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-200">
        {explanation}
      </p>

      <section className="mt-4 rounded-lg border border-white/10 bg-[#101010] p-3 sm:p-4">
        <p className="text-xs font-medium text-neutral-400">📌 From your document</p>
        <blockquote className="mt-2 whitespace-pre-wrap border-l-2 border-[#C9A84C]/45 pl-3 text-sm italic leading-6 text-neutral-100">
          {exactQuote}
        </blockquote>
      </section>

      <section className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-neutral-400">Confidence</span>
          <span className={`font-semibold ${confidenceUi.text}`}>
            {confidenceUi.percent}%
          </span>
        </div>
        <div className="h-[5px] w-full rounded-full bg-white/10">
          <div
            className={`h-[5px] rounded-full ${confidenceUi.bar} transition-all duration-300`}
            style={{ width: `${confidenceUi.percent}%` }}
          />
        </div>
        <p className="mt-2 text-xs leading-5 text-neutral-400">{confidenceReason}</p>
      </section>
    </article>
  );
}
