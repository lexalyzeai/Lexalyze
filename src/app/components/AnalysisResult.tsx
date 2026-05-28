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
  savedFollowUps?: { question: string; answer: string }[];
  savedChecklist?: boolean[];
  onChecklistChange?: (newState: boolean[]) => void;
};

function confidenceBadgeClass(confidence: Confidence): string {
  if (confidence === "HIGH") return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
  if (confidence === "MEDIUM") return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
  return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
}

function severityBorderClass(severity: Severity): string {
  if (severity === "HIGH") return "border-rose-500/20 bg-rose-500/5 border-l-4 border-l-rose-500";
  if (severity === "MEDIUM") return "border-amber-500/20 bg-amber-500/5 border-l-4 border-l-amber-500";
  return "border-emerald-500/20 bg-emerald-500/5 border-l-4 border-l-emerald-500";
}

function priorityStyles(priority: Priority): { bar: string; badge: string; label: string } {
  if (priority === "URGENT") return {
    bar: "bg-rose-500",
    badge: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    label: "URGENT"
  };
  if (priority === "IMPORTANT") return {
    bar: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    label: "IMPORTANT"
  };
  return {
    bar: "bg-blue-500",
    badge: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    label: "RECOMMENDED"
  };
}

function riskScoreColor(score: number): string {
  if (score >= 7) return "text-rose-400";
  if (score >= 4) return "text-amber-400";
  return "text-emerald-400";
}

function partyFavourStyles(favour?: string): { text: string; bg: string } {
  if (favour === "CONSUMER_FRIENDLY") return { text: "text-emerald-400", bg: "bg-emerald-500/5 border-emerald-500/20" };
  if (favour === "OTHER_PARTY_FRIENDLY") return { text: "text-rose-400", bg: "bg-rose-500/5 border-rose-500/20" };
  return { text: "text-amber-400", bg: "bg-amber-500/5 border-amber-500/20" };
}

type FollowUpEntry = {
  question: string;
  answer: string;
};

const EMPTY_FOLLOW_UPS: FollowUpEntry[] = [];
const EMPTY_CHECKLIST: boolean[] = [];
const CHECKLIST_STORAGE_PREFIX = "lexalyze-checklist:";

// Pure layout support
function normalizeChecklist(savedChecklist: boolean[], itemCount: number) {
  return Array.from({ length: itemCount }, (_, index) => savedChecklist[index] ?? false);
}

function readLocalChecklist(analysisId: string | undefined, itemCount: number) {
  if (!analysisId || typeof window === "undefined") return null;

  try {
    const saved = window.localStorage.getItem(`${CHECKLIST_STORAGE_PREFIX}${analysisId}`);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? normalizeChecklist(parsed, itemCount) : null;
  } catch {
    return null;
  }
}

// Storage sync
function saveLocalChecklist(analysisId: string | undefined, checklist: boolean[]) {
  if (!analysisId || typeof window === "undefined") return;
  window.localStorage.setItem(`${CHECKLIST_STORAGE_PREFIX}${analysisId}`, JSON.stringify(checklist));
}

function getInitialChecklist(savedChecklist: boolean[], result: AnalysisResultData | undefined, analysisId: string | undefined) {
  const itemCount = result?.actionItems?.length ?? 0;
  const localChecklist = readLocalChecklist(analysisId, itemCount);
  if (localChecklist) return localChecklist;

  const resultChecklist = Array.isArray((result as any)?.checkbox)
    ? (result as any).checkbox
    : Array.isArray((result as any)?.checklistState)
      ? (result as any).checklistState
      : savedChecklist;

  return normalizeChecklist(resultChecklist, itemCount);
}

function safePdfName(name?: string) {
  return (name || "analysis")
    .replace(/[^a-z0-9-_ ]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase() || "analysis";
}

export default function AnalysisResult({
  result,
  analysisId,
  savedFollowUps = EMPTY_FOLLOW_UPS,
  savedChecklist = EMPTY_CHECKLIST,
  onChecklistChange,
}: AnalysisResultProps) {
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpHistory, setFollowUpHistory] = useState<FollowUpEntry[]>(savedFollowUps);
  const [followUpError, setFollowUpError] = useState<ErrorType | "">("");
  const [checkedItems, setCheckedItems] = useState<boolean[]>(
    getInitialChecklist(savedChecklist, result, analysisId)
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  if (!result) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#0E0E12] p-8 text-center shadow-lg">
        <p className="text-neutral-500 font-medium">No analysis logs located.</p>
      </div>
    );
  }

  function persistChecklist(next: boolean[]) {
    saveLocalChecklist(analysisId, next);

    if (onChecklistChange) {
      onChecklistChange(next);
      return;
    }

    if (!analysisId) return;

    fetch("/api/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysisId, checklist: next }),
    })
      .then(async (response) => {
        if (response.ok) return;
        const data = await response.json().catch(() => ({}));
        console.error("Checklist save failed:", data.error || response.statusText);
      })
      .catch((error) => {
        console.error("Checklist save failed:", error instanceof Error ? error.message : error);
      });
  }

  function toggleCheck(index: number) {
    setCheckedItems((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      persistChecklist(next);
      return next;
    });
  }

  async function handleDownloadPDF() {
    setIsDownloading(true);
    const pdfWindow = window.open("", "_blank");

    try {
      const pdfResult = result;
      if (!pdfResult) return;

      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 16;
      const contentWidth = pageWidth - margin * 2;
      const bottom = pageHeight - 18;
      let y = 18;

      const colors = {
        ink: [28, 28, 28],
        muted: [105, 105, 105],
        line: [226, 220, 204],
        panel: [249, 247, 240],
        gold: [170, 132, 38],
        goldDark: [118, 84, 15],
        rose: [178, 51, 73],
        amber: [174, 116, 20],
        emerald: [29, 128, 91],
        blue: [34, 105, 170],
      };

      const setText = (rgb: number[]) => pdf.setTextColor(rgb[0], rgb[1], rgb[2]);
      const setFill = (rgb: number[]) => pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
      const setDraw = (rgb: number[]) => pdf.setDrawColor(rgb[0], rgb[1], rgb[2]);
      const lines = (text: string, width = contentWidth) =>
        pdf.splitTextToSize(String(text || ""), width) as string[];
      const priorityColor = (value: string) => {
        if (value === "HIGH" || value === "URGENT") return colors.rose;
        if (value === "MEDIUM" || value === "IMPORTANT") return colors.amber;
        if (value === "LOW" || value === "RECOMMENDED") return colors.emerald;
        return colors.gold;
      };

      const paintPage = () => {
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");
        setFill(colors.gold);
        pdf.rect(0, 0, pageWidth, 2.2, "F");
      };

      const ensure = (height: number) => {
        if (y + height <= bottom) return;
        pdf.addPage();
        paintPage();
        y = 16;
      };

      const section = (title: string, accent = colors.gold, expectedHeight = 18) => {
        ensure(expectedHeight + 10);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        setText(accent);
        pdf.text(title.toUpperCase(), margin, y);
        setDraw(colors.line);
        pdf.line(margin, y + 3, pageWidth - margin, y + 3);
        y += 9;
      };

      const paragraph = (text: string, options?: { accent?: number[]; fontSize?: number; indent?: number }) => {
        const fontSize = options?.fontSize ?? 9.3;
        const indent = options?.indent ?? 0;
        const wrapped = lines(text, contentWidth - indent);
        const height = wrapped.length * 4.6 + 3;
        ensure(height);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(fontSize);
        setText(options?.accent ?? colors.ink);
        pdf.text(wrapped, margin + indent, y);
        y += height;
      };

      const callout = (text: string, accent = colors.gold) => {
        const wrapped = lines(text, contentWidth - 12);
        const height = wrapped.length * 4.8 + 12;
        ensure(height);
        setFill(colors.panel);
        pdf.roundedRect(margin, y, contentWidth, height, 3, 3, "F");
        setDraw(colors.line);
        pdf.roundedRect(margin, y, contentWidth, height, 3, 3, "S");
        setFill(accent);
        pdf.rect(margin, y, 2, height, "F");
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9.5);
        setText(colors.ink);
        pdf.text(wrapped, margin + 7, y + 8);
        y += height + 4;
      };

      const itemBlock = (title: string, body: string, meta?: string, accent = colors.gold) => {
        const titleLines = lines(title, contentWidth - 12);
        const bodyLines = lines(body, contentWidth - 12);
        const metaHeight = meta ? 5 : 0;
        const height = titleLines.length * 4.8 + bodyLines.length * 4.4 + metaHeight + 12;
        ensure(height);
        setDraw(colors.line);
        pdf.roundedRect(margin, y, contentWidth, height, 3, 3, "S");
        setFill(accent);
        pdf.rect(margin, y, 1.5, height, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9.2);
        setText(colors.ink);
        pdf.text(titleLines, margin + 6, y + 7);
        let textY = y + 7 + titleLines.length * 4.8;
        if (meta) {
          pdf.setFontSize(7.5);
          setText(accent);
          pdf.text(meta.toUpperCase(), margin + 6, textY);
          textY += 5;
        }
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.7);
        setText(colors.muted);
        if (bodyLines.length > 0) {
          pdf.text(bodyLines, margin + 6, textY);
        }
        y += height + 4;
      };

      paintPage();
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      setText(colors.goldDark);
      pdf.text("LEXALYZE", margin, y);
      pdf.setFontSize(8);
      setText(colors.muted);
      pdf.text("DOCUMENT INTELLIGENCE REPORT", margin, y + 7);
      pdf.text(
        new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        pageWidth - margin,
        y,
        { align: "right" }
      );
      y += 18;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(19);
      setText(colors.ink);
      pdf.text(lines(pdfResult.documentTitle || "Document analysis", contentWidth), margin, y);
      y += Math.max(12, lines(pdfResult.documentTitle || "Document analysis", contentWidth).length * 8);
      callout(pdfResult.oneLineSummary || "Analysis completed.", colors.gold);

      section("Executive snapshot", colors.gold, 38);
      const facts = [
        ["Document type", pdfResult.documentType || "Not specified"],
        ["Confidence", pdfResult.overallConfidence],
        ["Risk score", pdfResult.riskScore !== undefined ? `${pdfResult.riskScore}/10` : "Not scored"],
        ["Party favour", pdfResult.partyFavour ? pdfResult.partyFavour.replace(/_/g, " ") : "Not specified"],
      ];
      facts.forEach(([label, value]) => itemBlock(label, value, undefined, colors.gold));
      if (pdfResult.overallConfidenceReason) paragraph(pdfResult.overallConfidenceReason, { accent: colors.muted });
      if (pdfResult.riskScoreReason) paragraph(pdfResult.riskScoreReason, { accent: colors.muted });

      section("Summary", colors.gold, 24);
      paragraph(pdfResult.fullSummary || "No full summary provided.");

      const keyItems = [...(pdfResult.keyNumbers ?? []), ...(pdfResult.keyDeadlines ?? [])];
      if (keyItems.length > 0) {
        section("Key numbers and dates", colors.gold, 18);
        keyItems.forEach((item) => itemBlock(item, "", undefined, colors.gold));
      }

      if ((pdfResult.redFlags?.length ?? 0) > 0) {
        section("Risk flags", colors.rose, 24);
        pdfResult.redFlags.forEach((flag, index) => {
          itemBlock(
            `${index + 1}. ${flag.title}`,
            [
              flag.explanation,
              flag.exactQuote && flag.exactQuote !== "No exact quote found in document." ? `Quote: "${flag.exactQuote}"` : "",
              flag.legalContext ? `Legal context: ${flag.legalContext}` : "",
              flag.whatToDoAboutIt ? `What to do: ${flag.whatToDoAboutIt}` : "",
            ].filter(Boolean).join("\n"),
            `${flag.severity} risk | ${flag.confidence} confidence`,
            priorityColor(flag.severity)
          );
        });
      }

      if ((pdfResult.positivePoints?.length ?? 0) > 0) {
        section("Favourable clauses", colors.emerald, 20);
        pdfResult.positivePoints.forEach((point, index) => {
          itemBlock(
            `${index + 1}. ${point.title}`,
            [
              point.explanation,
              point.exactQuote && point.exactQuote !== "No exact quote found in document." ? `Quote: "${point.exactQuote}"` : "",
            ].filter(Boolean).join("\n"),
            `${point.confidence} confidence`,
            colors.emerald
          );
        });
      }

      if ((pdfResult.missingClauses?.length ?? 0) > 0) {
        section("Missing clauses", colors.amber, 20);
        pdfResult.missingClauses!.forEach((item, index) => {
          itemBlock(
            `${index + 1}. ${item.clause}`,
            [item.whyItMatters, item.whatToAdd ? `What to add: ${item.whatToAdd}` : ""].filter(Boolean).join("\n"),
            `${item.riskIfAbsent} risk if absent`,
            priorityColor(item.riskIfAbsent)
          );
        });
      }

      if ((pdfResult.actionItems?.length ?? 0) > 0) {
        section("Action checklist", colors.gold, 20);
        pdfResult.actionItems.forEach((item, index) => {
          itemBlock(
            `${checkedItems[index] ? "[Done]" : "[Open]"} ${item.action}`,
            item.reason,
            item.priority,
            checkedItems[index] ? colors.emerald : priorityColor(item.priority)
          );
        });
      }

      if ((pdfResult.negotiationTips?.length ?? 0) > 0) {
        section("Negotiation tips", colors.gold, 18);
        pdfResult.negotiationTips!.forEach((tip) => itemBlock(tip, "", undefined, colors.gold));
      }

      if (pdfResult.consumerRightsNote) {
        section("Consumer rights", colors.blue, 20);
        paragraph(pdfResult.consumerRightsNote);
      }

      if (pdfResult.stampDutyNote) {
        section("Stamp duty and registration", colors.amber, 20);
        paragraph(pdfResult.stampDutyNote);
      }

      section("Limitations", colors.amber, 20);
      (pdfResult.cannotDetermineList?.length ? pdfResult.cannotDetermineList : ["No specific limitations were provided."])
        .forEach((item) => itemBlock(item, "", undefined, colors.amber));

      section("Lawyer guidance", colors.gold, 20);
      paragraph(pdfResult.lawyerGuidance ?? "This AI summary is informational and not legal advice. Consult a qualified lawyer before making important legal or financial decisions.");

      if (followUpHistory.length > 0) {
        section("Follow-up questions", colors.gold, 20);
        followUpHistory.forEach((entry, index) => itemBlock(`${index + 1}. ${entry.question}`, entry.answer, undefined, colors.gold));
      }

      const totalPages = pdf.getNumberOfPages();
      for (let page = 1; page <= totalPages; page += 1) {
        pdf.setPage(page);
        setDraw(colors.line);
        pdf.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        setText(colors.muted);
        pdf.text("Lexalyze AI-generated analysis. Not legal advice.", margin, pageHeight - 8);
        pdf.text(`${page} / ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: "right" });
      }

      const fileName = `lexalyze-${safePdfName(pdfResult.documentTitle)}.pdf`;
      const pdfBlob = pdf.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);

      if (pdfWindow) {
        pdfWindow.location.href = pdfUrl;
      } else {
        window.open(pdfUrl, "_blank", "noopener,noreferrer");
      }

      const downloadLink = document.createElement("a");
      downloadLink.href = pdfUrl;
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();

      setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);
    } catch (err) {
      pdfWindow?.close();
      console.error("PDF download failed:", err);
    } finally {
      setIsDownloading(false);
    }
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


  async function handleShare() {
    const url = analysisId
      ? `${window.location.origin}/dashboard/analysis/${analysisId}`
      : window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: result.documentTitle || "Lexalyze Analysis", url });
        return;
      }
    } catch { /* fallback to clipboard */ }
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch { /* ignore */ }
  }

  const favourStyles = partyFavourStyles(result.partyFavour);

  return (
    <section id="analysis-result-content" className="w-full space-y-6 rounded-3xl bg-transparent text-white">

      {/* Floating Sticky action bar */}
      <div className="pointer-events-none sticky top-4 z-30 flex justify-end gap-2">
        {/* Share button */}
        <button
          type="button"
          onClick={handleShare}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#121216]/95 px-4 py-2.5 text-xs font-bold tracking-wider uppercase text-neutral-400 shadow-2xl shadow-black/80 backdrop-blur transition-all duration-300 hover:border-white/40 hover:text-white active:scale-95"
          aria-label="Share analysis"
        >
          {isCopied ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="size-4 text-emerald-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              </svg>
              <span>Share</span>
            </>
          )}
        </button>
        {/* Download PDF button */}
        <button
          type="button"
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#C9A84C]/45 bg-[#121216]/95 px-5 py-2.5 text-xs font-bold tracking-wider uppercase text-[#C9A84C] shadow-2xl shadow-black/80 backdrop-blur transition-all duration-300 hover:border-[#C9A84C] hover:bg-[#1E1B15] active:scale-95 disabled:opacity-50"
          aria-label="Download PDF"
        >
          {isDownloading ? (
            <>
              <span className="size-3.5 animate-spin rounded-full border-2 border-[#C9A84C]/30 border-t-[#C9A84C]" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              <span>Download PDF</span>
            </>
          )}
        </button>
      </div>

      {/* Document header Card */}
      <div className="rounded-3xl border border-white/[0.06] bg-[#0E0E12]/80 p-6 backdrop-blur-xl shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 rounded-3xl border border-[#C9A84C]/5 pointer-events-none" />
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold tracking-wider uppercase ${confidenceBadgeClass(result.overallConfidence)}`}>
            Confidence: {result.overallConfidence}
          </span>
          {result.documentType && (
            <span className="inline-flex rounded-full bg-white/[0.04] border border-white/[0.06] px-3 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              {result.documentType}
            </span>
          )}
          {result.riskScore !== undefined && (
            <span className={`inline-flex rounded-full bg-white/[0.04] border border-white/[0.06] px-3 py-1 text-[10px] font-bold tracking-wider uppercase ${riskScoreColor(result.riskScore)}`}>
              Risk Score: {result.riskScore}/10
            </span>
          )}
        </div>

        {result.overallConfidenceReason && (
          <p className="mt-3 text-xs leading-relaxed text-neutral-500 font-medium">{result.overallConfidenceReason}</p>
        )}

        <h1 className={`${playfair.className} mt-4 text-2xl font-bold leading-tight text-white sm:text-3xl`}>
          {result.documentTitle}
        </h1>

        <p className="mt-4 rounded-2xl border-l-2 border-[#C9A84C] bg-[#C9A84C]/5 px-5 py-4 text-sm leading-relaxed text-[#f5e2ac] italic">
          "{result.oneLineSummary}"
        </p>

        {result.partyFavour && (
          <div className={`mt-4 rounded-2xl border px-5 py-4 ${favourStyles.bg}`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${favourStyles.text}`}>
              Party Favour: {result.partyFavour.replace(/_/g, " ")}
            </p>
            {result.partyFavourReason && (
              <p className="mt-1.5 text-xs leading-relaxed text-neutral-400 font-medium">{result.partyFavourReason}</p>
            )}
          </div>
        )}
      </div>

      {/* Full summary */}
      <div className="rounded-3xl border border-white/[0.06] bg-[#0E0E12]/80 p-6 backdrop-blur-xl shadow-lg">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500">Executive Summary</h2>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-neutral-200 font-medium">{result.fullSummary}</p>
      </div>

      {/* Key numbers and dates */}
      {((result.keyNumbers?.length ?? 0) + (result.keyDeadlines?.length ?? 0)) > 0 && (
        <div className="rounded-3xl border border-white/[0.06] bg-[#0E0E12]/80 p-6 backdrop-blur-xl shadow-lg">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500">Key metrics &amp; deadlines</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {[...(result.keyNumbers ?? []), ...(result.keyDeadlines ?? [])].map((item, i) => (
              <li key={i} className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3.5 text-xs font-semibold text-neutral-300 shadow-sm">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A84C] shadow-[0_0_6px_rgba(201,168,76,0.6)]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risk score Gauge */}
      {result.riskScore !== undefined && result.riskScoreReason && (
        <div className="rounded-3xl border border-white/[0.06] bg-[#0E0E12]/80 p-6 backdrop-blur-xl shadow-lg">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500">Risk Assessment</h2>
          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className={`text-5xl font-extrabold ${riskScoreColor(result.riskScore)} tracking-tight`}>
              {result.riskScore}<span className="text-lg font-bold text-neutral-600">/10</span>
            </span>
            <div className="flex-1">
              
              {/* Luxury Horizontal Track Indicator */}
              <div className="relative h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 shadow-inner ${
                    result.riskScore >= 7
                      ? "bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500"
                      : result.riskScore >= 4
                      ? "bg-gradient-to-r from-emerald-500 to-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${result.riskScore * 10}%` }}
                />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-neutral-400 font-medium">{result.riskScoreReason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Risk flags */}
      {(result.redFlags?.length ?? 0) > 0 && (
        <div className="space-y-4 rounded-3xl border border-rose-500/25 bg-[#0E0E12]/80 p-6 backdrop-blur-xl shadow-lg">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-rose-400">Risk Alerts ({result.redFlags.length})</h2>
          {result.redFlags.map((flag, i) => (
            <article key={i} className={`rounded-2xl border p-5 transition duration-300 ${severityBorderClass(flag.severity)}`}>
              <div className="flex items-center justify-between gap-3 border-b border-rose-500/10 pb-3">
                <h3 className="font-bold text-rose-200 tracking-wide">{flag.title}</h3>
                <span className={`rounded-full px-3 py-1 text-[9px] font-bold tracking-wider uppercase ${confidenceBadgeClass(flag.confidence)}`}>
                  {flag.severity} RISK
                </span>
              </div>
              <p className="mt-3.5 text-xs leading-relaxed text-rose-100/90 font-medium">{flag.explanation}</p>
              
              {flag.exactQuote && flag.exactQuote !== "No exact quote found in document." && (
                <p className="mt-3.5 border-l-2 border-rose-400/40 pl-4 text-xs italic leading-relaxed text-rose-200/80">
                  "{flag.exactQuote}"
                </p>
              )}
              {flag.legalContext && (
                <p className="mt-3.5 rounded-xl bg-white/[0.03] px-4 py-3 text-xs font-semibold text-neutral-400 border border-white/[0.05]">
                  ⚖️ {flag.legalContext}
                </p>
              )}
              {flag.whatToDoAboutIt && (
                <p className="mt-3.5 text-xs font-bold text-emerald-400 flex items-start gap-1.5">
                  <span className="shrink-0">✓</span>
                  <span>{flag.whatToDoAboutIt}</span>
                </p>
              )}
              {flag.confidenceReason && (
                <p className="mt-3.5 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                  CONFIDENCE: {flag.confidence} · {flag.confidenceReason}
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Positive points */}
      {(result.positivePoints?.length ?? 0) > 0 && (
        <div className="space-y-4 rounded-3xl border border-emerald-500/25 bg-[#0E0E12]/80 p-6 backdrop-blur-xl shadow-lg">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400">Favourable clauses ({result.positivePoints.length})</h2>
          {result.positivePoints.map((point, i) => (
            <article key={i} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 border-l-4 border-l-emerald-500 p-5">
              <div className="flex items-center justify-between gap-3 border-b border-emerald-500/10 pb-3">
                <h3 className="font-bold text-emerald-200 tracking-wide">{point.title}</h3>
                <span className={`rounded-full px-3 py-1 text-[9px] font-bold tracking-wider uppercase ${confidenceBadgeClass(point.confidence)}`}>
                  {point.confidence}
                </span>
              </div>
              <p className="mt-3.5 text-xs leading-relaxed text-emerald-100/90 font-medium">{point.explanation}</p>
              {point.exactQuote && point.exactQuote !== "No exact quote found in document." && (
                <p className="mt-3.5 border-l-2 border-emerald-400/40 pl-4 text-xs italic leading-relaxed text-emerald-200/80">
                  "{point.exactQuote}"
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Missing clauses */}
      {(result.missingClauses?.length ?? 0) > 0 && (
        <div className="space-y-4 rounded-3xl border border-amber-500/25 bg-[#0E0E12]/80 p-6 backdrop-blur-xl shadow-lg">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">Missing Clauses ({result.missingClauses!.length})</h2>
          {result.missingClauses!.map((item, i) => (
            <article key={i} className={`rounded-2xl border p-5 transition duration-300 ${severityBorderClass(item.riskIfAbsent)}`}>
              <div className="flex items-center justify-between gap-3 border-b border-amber-500/10 pb-3">
                <h3 className="font-bold text-amber-200 tracking-wide">{item.clause}</h3>
                <span className={`rounded-full px-3 py-1 text-[9px] font-bold tracking-wider uppercase ${confidenceBadgeClass(item.riskIfAbsent)}`}>
                  {item.riskIfAbsent} RISK
                </span>
              </div>
              <p className="mt-3.5 text-xs leading-relaxed text-amber-100/90 font-medium">{item.whyItMatters}</p>
              {item.whatToAdd && (
                <p className="mt-3.5 rounded-xl bg-white/[0.03] px-4 py-3 text-xs font-semibold text-neutral-400 border border-white/[0.05]">
                  💡 {item.whatToAdd}
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Action checklist with checkboxes */}
      {(result.actionItems?.length ?? 0) > 0 && (
        <div className="rounded-3xl border border-white/[0.06] bg-[#0E0E12]/80 p-6 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between border-b border-white/[0.05] pb-4">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500">Action Checklist</h2>
            {checkedItems.some(Boolean) && (
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                {checkedItems.filter(Boolean).length}/{result.actionItems.length} completed
              </span>
            )}
          </div>
          <ul className="mt-5 space-y-3">
            {result.actionItems.map((item, i) => {
              const styles = priorityStyles(item.priority);
              const isChecked = checkedItems[i] ?? false;
              return (
                <li
                  key={i}
                  className={`flex gap-4 rounded-2xl border p-4.5 transition-all duration-300 cursor-pointer select-none ${
                    isChecked
                      ? "border-emerald-500/20 bg-emerald-500/5 opacity-60"
                      : "border-white/[0.05] bg-white/[0.01] hover:border-white/[0.12] hover:bg-white/[0.03]"
                  }`}
                  onClick={() => toggleCheck(i)}
                >
                  <div className="mt-0.5 flex shrink-0 items-start">
                    <div className={`flex size-5.5 items-center justify-center rounded-lg border-2 transition-all duration-300 ${
                      isChecked
                        ? "border-emerald-500 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                        : "border-white/20 bg-transparent"
                    }`}>
                      {isChecked && (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4.2" className="size-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold tracking-wider uppercase ${styles.badge}`}>
                        {styles.label}
                      </span>
                    </div>
                    <p className={`mt-2 text-sm font-semibold tracking-wide ${isChecked ? "line-through text-neutral-500" : "text-neutral-200"}`}>
                      {item.action}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-neutral-500 font-medium">{item.reason}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Negotiation tips */}
      {(result.negotiationTips?.length ?? 0) > 0 && (
        <div className="rounded-3xl border border-white/[0.06] bg-[#0E0E12]/80 p-6 backdrop-blur-xl shadow-lg">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500">Negotiation Strategy</h2>
          <ul className="mt-4 space-y-3">
            {result.negotiationTips!.map((tip, i) => (
              <li key={i} className="flex gap-3 text-xs font-semibold leading-relaxed text-neutral-300">
                <span className="mt-0.5 text-[#C9A84C] font-bold">→</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Consumer rights */}
      {result.consumerRightsNote && (
        <div className="rounded-3xl border border-blue-500/25 bg-[#0E0E12]/80 p-6 backdrop-blur-xl shadow-lg">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-blue-400">Your Consumer Rights</h2>
          <p className="mt-4 text-sm leading-relaxed text-neutral-200 font-medium">{result.consumerRightsNote}</p>
        </div>
      )}

      {/* Stamp duty */}
      {result.stampDutyNote && (
        <div className="rounded-3xl border border-purple-500/25 bg-[#0E0E12]/80 p-6 backdrop-blur-xl shadow-lg">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-purple-400">Stamp Duty &amp; Registration</h2>
          <p className="mt-4 text-sm leading-relaxed text-neutral-200 font-medium">{result.stampDutyNote}</p>
        </div>
      )}

      {/* Limitations */}
      <div className="rounded-3xl border border-amber-500/25 bg-[#0E0E12]/80 p-6 backdrop-blur-xl shadow-lg">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">Limitations of Analysis</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-xs leading-relaxed text-amber-100/90 font-medium">
          {(result.cannotDetermineList?.length
            ? result.cannotDetermineList
            : ["No specific limitations were provided."]
          ).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>

      {/* Lawyer guidance */}
      <div className="rounded-3xl border border-[#C9A84C]/35 bg-[#0E0E12]/80 p-6 backdrop-blur-xl shadow-lg">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C9A84C]">Lawyer Guidance</h2>
        <p className="mt-4 text-sm leading-relaxed text-neutral-200 font-medium">
          {result.lawyerGuidance ?? "This AI summary is informational and not legal advice. Consult a qualified lawyer before making important legal or financial decisions."}
        </p>
        <p className="mt-3.5 border-t border-white/[0.05] pt-3 text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">
          Not legal advice · Lexalyze provides AI-generated insights only.
        </p>
      </div>

      {/* Follow-up questions */}
      <div className="rounded-3xl border border-white/[0.06] bg-[#0E0E12]/80 p-6 backdrop-blur-xl shadow-lg">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500">Query Portal</h2>

        {followUpHistory.length > 0 && (
          <div className="mt-5 space-y-4">
            {followUpHistory.map((entry, i) => (
              <div key={i} className="space-y-2.5">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-wide">Q: {entry.question}</p>
                <div className="rounded-2xl border border-white/[0.06] bg-[#08080C] px-5 py-4 text-sm leading-relaxed text-neutral-200 font-medium shadow-inner">
                  {entry.answer}
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={onFollowUpSubmit} className="mt-5">
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <input
              value={followUpQuestion}
              onChange={(e) => setFollowUpQuestion(e.target.value)}
              placeholder={analysisId ? "Ask anything about this document..." : "Save an analysis first to ask follow-up questions"}
              disabled={!analysisId || followUpLoading}
              className="w-full rounded-full border border-white/[0.06] bg-[#08080C] px-5 py-4 text-xs font-semibold text-white placeholder:text-neutral-500 outline-none transition duration-300 focus:border-[#C9A84C]/50 focus:ring-2 focus:ring-[#C9A84C]/10 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!analysisId || followUpLoading || !followUpQuestion.trim()}
              className="rounded-full bg-gradient-to-r from-[#C9A84C] to-[#aa8426] px-6 py-4 text-xs font-bold tracking-widest uppercase text-[#0A0A0A] shadow-md transition duration-300 hover:from-[#d4b55d] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {followUpLoading ? "..." : "Ask"}
            </button>
          </div>

          {followUpLoading && (
            <div className="mt-4 flex items-center gap-2.5 text-xs font-semibold text-neutral-400">
              <span className="size-3.5 animate-spin rounded-full border-2 border-neutral-600 border-t-[#C9A84C]" />
              Processing clause indices...
            </div>
          )}

          {followUpError && (
            <div className="mt-4">
              <ErrorMessage errorType={followUpError} onDismiss={() => setFollowUpError("")} />
            </div>
          )}
        </form>
      </div>

    </section>
  );
}
