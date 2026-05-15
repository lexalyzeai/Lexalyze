"use client";

import { Playfair_Display } from "next/font/google";
import { FormEvent, useState } from "react";
import ErrorMessage, { ErrorType, mapBackendError } from "@/app/components/ErrorMessage";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

type Confidence = "HIGH" | "MEDIUM" | "LOW";
type Severity = "HIGH" | "MEDIUM" | "LOW";
type Priority = "URGENT" | "IMPORTANT" | "RECOMMENDED";

export type RedFlag = {
  title: string;
  severity: Severity;
  explanation: string;
  exactQuote: string;
  legalContext?: string;
  whatToDoAboutIt?: string;
  confidence: Confidence;
  confidenceReason: string;
};

export type PositivePoint = {
  title: string;
  explanation: string;
  exactQuote: string;
  confidence: Confidence;
};

export type MissingClause = {
  clause: string;
  whyItMatters: string;
  riskIfAbsent: Severity;
  whatToAdd?: string;
};

export type ClauseAnalysis = {
  clauseTitle: string;
  whatItSays: string;
  whatItMeans: string;
  isFair: boolean;
  consumerImpact: "HIGH" | "MEDIUM" | "LOW";
  redFlag: boolean;
};

export type ActionItem = {
  priority: Priority;
  action: string;
  reason: string;
};

export type AnalysisResultData = {
  documentTitle: string;
  documentType?: string;
  partyFavour?: "CONSUMER_FRIENDLY" | "OTHER_PARTY_FRIENDLY" | "BALANCED";
  partyFavourReason?: string;
  riskScore?: number;
  riskScoreReason?: string;
  overallConfidence: Confidence;
  overallConfidenceReason: string;
  oneLineSummary: string;
  fullSummary: string;
  keyNumbers: string[];
  keyDeadlines: string[];
  redFlags: RedFlag[];
  positivePoints: PositivePoint[];
  missingClauses?: MissingClause[];
  clauseAnalysis?: ClauseAnalysis[];
  actionItems: ActionItem[];
  cannotDetermineList: string[];
  negotiationTips?: string[];
  consumerRightsNote?: string;
  stampDutyNote?: string;
  lawyerGuidance: string;
};

export type AnalysisResultProps = {
  result?: AnalysisResultData;
  analysisId?: string;
};

function confidenceBadgeClass(confidence: Confidence): string {
  if (confidence === "HIGH") return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30";
  if (confidence === "MEDIUM") return "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30";
  return "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30";
}

function severityBorderClass(severity: Severity): string {
  if (severity === "HIGH") return "border-rose-500/20 bg-rose-500/5";
  if (severity === "MEDIUM") return "border-amber-500/20 bg-amber-500/5";
  return "border-emerald-500/20 bg-emerald-500/5";
}

function priorityStyles(priority: Priority): { bar: string; badge: string; label: string } {
  if (priority === "URGENT") return {
    bar: "bg-rose-500",
    badge: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
    label: "URGENT"
  };
  if (priority === "IMPORTANT") return {
    bar: "bg-amber-500",
    badge: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
    label: "IMPORTANT"
  };
  return {
    bar: "bg-blue-500",
    badge: "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30",
    label: "RECOMMENDED"
  };
}

function riskScoreColor(score: number): string {
  if (score >= 7) return "text-rose-400";
  if (score >= 4) return "text-amber-400";
  return "text-emerald-400";
}

function partyFavourStyles(favour?: string): { text: string; bg: string } {
  if (favour === "CONSUMER_FRIENDLY") return { text: "text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/30" };
  if (favour === "OTHER_PARTY_FRIENDLY") return { text: "text-rose-300", bg: "bg-rose-500/10 border-rose-500/30" };
  return { text: "text-amber-300", bg: "bg-amber-500/10 border-amber-500/30" };
}

type FollowUpEntry = {
  question: string;
  answer: string;
};

export default function AnalysisResult({ result, analysisId }: AnalysisResultProps) {
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpHistory, setFollowUpHistory] = useState<FollowUpEntry[]>([]);
  const [followUpError, setFollowUpError] = useState<ErrorType | "">("");

  if (!result) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#121212] p-8 text-center">
        <p className="text-neutral-400">No analysis data available.</p>
      </div>
    );
  }

  async function onFollowUpSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!followUpQuestion.trim() || !analysisId || followUpLoading) return;

    const question = followUpQuestion.trim();
    setFollowUpLoading(true);
    setFollowUpError("");
    setFollowUpQuestion("");

    try {
      const response = await fetch("/api/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, analysisId }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || "Failed to get answer.";
        const mappedError = mapBackendError(errorMessage) || "api_failure";
        setFollowUpError(mappedError);
        return;
      }

      setFollowUpHistory((prev) => [...prev, { question, answer: data.answer }]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      const mappedError = mapBackendError(errorMessage) || "api_failure";
      setFollowUpError(mappedError);
    } finally {
      setFollowUpLoading(false);
    }
  }

  const favourStyles = partyFavourStyles(result.partyFavour);

  return (
    <section className="w-full space-y-5 rounded-2xl bg-[#0A0A0A] p-4 text-white sm:p-6">

      {/* Document header */}
      <div className="rounded-xl border border-white/10 bg-[#121212] p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${confidenceBadgeClass(result.overallConfidence)}`}>
            Confidence: {result.overallConfidence}
          </span>
          {result.documentType && (
            <span className="inline-flex rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-neutral-400 ring-1 ring-white/10">
              {result.documentType}
            </span>
          )}
          {result.riskScore !== undefined && (
            <span className={`inline-flex rounded-full bg-white/5 px-3 py-1 text-xs font-bold ring-1 ring-white/10 ${riskScoreColor(result.riskScore)}`}>
              Risk: {result.riskScore}/10
            </span>
          )}
        </div>

        {result.overallConfidenceReason && (
          <p className="mt-2 text-xs text-neutral-500">{result.overallConfidenceReason}</p>
        )}

        <h1 className={`${playfair.className} mt-3 text-2xl sm:text-3xl`}>
          {result.documentTitle}
        </h1>

        <p className="mt-3 rounded-lg border border-[#C9A84C]/30 bg-[#C9A84C]/10 px-4 py-3 text-sm text-[#f5e2ac]">
          {result.oneLineSummary}
        </p>

        {result.partyFavour && (
          <div className={`mt-3 rounded-lg border px-4 py-3 ${favourStyles.bg}`}>
            <p className={`text-xs font-semibold uppercase tracking-wide ${favourStyles.text}`}>
              {result.partyFavour.replace(/_/g, " ")}
            </p>
            {result.partyFavourReason && (
              <p className="mt-1 text-xs text-neutral-400">{result.partyFavourReason}</p>
            )}
          </div>
        )}
      </div>

      {/* Full summary */}
      <div className="rounded-xl border border-white/10 bg-[#121212] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Full Summary</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-200">{result.fullSummary}</p>
      </div>

      {/* Key numbers and dates */}
      {((result.keyNumbers?.length ?? 0) + (result.keyDeadlines?.length ?? 0)) > 0 && (
        <div className="rounded-xl border border-white/10 bg-[#121212] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Key Numbers & Dates</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {[...(result.keyNumbers ?? []), ...(result.keyDeadlines ?? [])].map((item, i) => (
              <li key={i} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-neutral-200">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risk score breakdown */}
      {result.riskScore !== undefined && result.riskScoreReason && (
        <div className="rounded-xl border border-white/10 bg-[#121212] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Risk Assessment</h2>
          <div className="mt-3 flex items-center gap-4">
            <span className={`text-4xl font-bold ${riskScoreColor(result.riskScore)}`}>
              {result.riskScore}<span className="text-lg text-neutral-500">/10</span>
            </span>
            <div className="flex-1">
              <div className="h-2 w-full rounded-full bg-white/10">
                <div
                  className={`h-2 rounded-full transition-all ${result.riskScore >= 7 ? "bg-rose-500" : result.riskScore >= 4 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${result.riskScore * 10}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-neutral-400">{result.riskScoreReason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Risk flags */}
      {(result.redFlags?.length ?? 0) > 0 && (
        <div className="space-y-3 rounded-xl border border-rose-500/30 bg-[#121212] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-rose-300">Risk Flags</h2>
          {result.redFlags.map((flag, i) => (
            <article key={i} className={`rounded-lg border p-4 ${severityBorderClass(flag.severity)}`}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-medium text-rose-100">{flag.title}</h3>
                <span className={`rounded-full px-2.5 py-1 text-xs ${confidenceBadgeClass(flag.confidence)}`}>
                  {flag.severity}
                </span>
              </div>
              <p className="mt-2 text-sm text-rose-50/90">{flag.explanation}</p>
              {flag.exactQuote && flag.exactQuote !== "No exact quote found in document." && (
                <p className="mt-2 border-l-2 border-rose-400/40 pl-3 text-xs italic text-rose-200/90">
                  "{flag.exactQuote}"
                </p>
              )}
              {flag.legalContext && (
                <p className="mt-2 rounded bg-white/5 px-3 py-2 text-xs text-neutral-400">
                  ⚖️ {flag.legalContext}
                </p>
              )}
              {flag.whatToDoAboutIt && (
                <p className="mt-2 text-xs text-emerald-400">
                  ✓ {flag.whatToDoAboutIt}
                </p>
              )}
              {flag.confidenceReason && (
                <p className="mt-2 text-xs text-neutral-500">
                  Confidence: {flag.confidence} — {flag.confidenceReason}
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Positive points */}
      {(result.positivePoints?.length ?? 0) > 0 && (
        <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-[#121212] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-300">Favourable Clauses</h2>
          {result.positivePoints.map((point, i) => (
            <article key={i} className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-medium text-emerald-100">{point.title}</h3>
                <span className={`rounded-full px-2.5 py-1 text-xs ${confidenceBadgeClass(point.confidence)}`}>
                  {point.confidence}
                </span>
              </div>
              <p className="mt-2 text-sm text-emerald-50/90">{point.explanation}</p>
              {point.exactQuote && point.exactQuote !== "No exact quote found in document." && (
                <p className="mt-2 border-l-2 border-emerald-400/40 pl-3 text-xs italic text-emerald-200/90">
                  "{point.exactQuote}"
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Missing clauses */}
      {(result.missingClauses?.length ?? 0) > 0 && (
        <div className="space-y-3 rounded-xl border border-amber-500/30 bg-[#121212] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-300">Missing Clauses</h2>
          {result.missingClauses!.map((item, i) => (
            <article key={i} className={`rounded-lg border p-4 ${severityBorderClass(item.riskIfAbsent)}`}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-medium text-amber-100">{item.clause}</h3>
                <span className={`rounded-full px-2.5 py-1 text-xs ${confidenceBadgeClass(item.riskIfAbsent)}`}>
                  {item.riskIfAbsent} RISK
                </span>
              </div>
              <p className="mt-2 text-sm text-amber-50/90">{item.whyItMatters}</p>
              {item.whatToAdd && (
                <p className="mt-2 rounded bg-white/5 px-3 py-2 text-xs text-neutral-400">
                  💡 {item.whatToAdd}
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Action checklist */}
      {(result.actionItems?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-white/10 bg-[#121212] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Action Checklist</h2>
          <ul className="mt-3 space-y-3">
            {result.actionItems.map((item, i) => {
              const styles = priorityStyles(item.priority);
              return (
                <li key={i} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${styles.bar}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles.badge}`}>
                        {styles.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-neutral-200">{item.action}</p>
                    <p className="mt-1 text-xs text-neutral-500">{item.reason}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Negotiation tips */}
      {(result.negotiationTips?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-white/10 bg-[#121212] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Negotiation Tips</h2>
          <ul className="mt-3 space-y-2">
            {result.negotiationTips!.map((tip, i) => (
              <li key={i} className="flex gap-3 text-sm text-neutral-200">
                <span className="mt-0.5 text-[#C9A84C]">→</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Consumer rights */}
      {result.consumerRightsNote && (
        <div className="rounded-xl border border-blue-500/30 bg-[#121212] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-300">Your Consumer Rights</h2>
          <p className="mt-3 text-sm leading-6 text-neutral-200">{result.consumerRightsNote}</p>
        </div>
      )}

      {/* Stamp duty note */}
      {result.stampDutyNote && (
        <div className="rounded-xl border border-purple-500/30 bg-[#121212] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-purple-300">Stamp Duty & Registration</h2>
          <p className="mt-3 text-sm leading-6 text-neutral-200">{result.stampDutyNote}</p>
        </div>
      )}

      {/* Limitations */}
      <div className="rounded-xl border border-amber-500/30 bg-[#121212] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-300">What This Analysis Cannot Tell You</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-100/90">
          {(result.cannotDetermineList?.length
            ? result.cannotDetermineList
            : ["No specific limitations were provided."]
          ).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>

      {/* Lawyer guidance */}
      <div className="rounded-xl border border-[#C9A84C]/30 bg-[#121212] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#C9A84C]">Lawyer Guidance</h2>
        <p className="mt-3 text-sm leading-6 text-neutral-200">
          {result.lawyerGuidance ?? "This AI summary is informational and not legal advice. Consult a qualified lawyer before making important legal or financial decisions."}
        </p>
        <p className="mt-2 text-xs text-neutral-500">Not legal advice · Lexalyze provides AI-generated insights only.</p>
      </div>

      {/* Follow-up questions */}
      <div className="rounded-xl border border-white/10 bg-[#121212] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Follow-up Questions</h2>

        {followUpHistory.length > 0 && (
          <div className="mt-4 space-y-4">
            {followUpHistory.map((entry, i) => (
              <div key={i} className="space-y-2">
                <p className="text-sm font-medium text-neutral-300">Q: {entry.question}</p>
                <div className="rounded-lg border border-white/10 bg-[#0F0F0F] px-4 py-3 text-sm leading-relaxed text-neutral-200">
                  {entry.answer}
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={onFollowUpSubmit} className="mt-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={followUpQuestion}
              onChange={(e) => setFollowUpQuestion(e.target.value)}
              placeholder={analysisId ? "Ask anything about this document..." : "Save an analysis first to ask follow-up questions"}
              disabled={!analysisId || followUpLoading}
              className="w-full rounded-lg border border-white/10 bg-[#0F0F0F] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C9A84C]/60 focus:ring-2 focus:ring-[#C9A84C]/20 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!analysisId || followUpLoading || !followUpQuestion.trim()}
              className="rounded-lg bg-[#C9A84C] px-4 py-3 text-sm font-semibold text-[#0A0A0A] transition hover:bg-[#d4b55d] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {followUpLoading ? "..." : "Ask"}
            </button>
          </div>

          {followUpLoading && (
            <div className="mt-3 flex items-center gap-2 text-sm text-neutral-400">
              <span className="size-3 animate-spin rounded-full border-2 border-neutral-600 border-t-[#C9A84C]" />
              Thinking...
            </div>
          )}

          {followUpError && (
            <div className="mt-3">
              <ErrorMessage
                errorType={followUpError}
                onDismiss={() => setFollowUpError("")}
              />
            </div>
          )}
        </form>
      </div>

    </section>
  );
}