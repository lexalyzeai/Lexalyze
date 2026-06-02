"use client";

import { Playfair_Display } from "next/font/google";
import { FormEvent, useEffect, useRef, useState } from "react";
import ErrorMessage, { ErrorType, mapBackendError } from "@/app/components/ErrorMessage";
import { normalizePlan, type PlanId } from "@/lib/plans";
import { readApiError } from "@/lib/error-handling";

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
  result?: AnalysisResultData | null;
  analysisId?: string;
  plan?: PlanId | string | null;
  savedFollowUps?: { question: string; answer: string }[];
  savedChecklist?: boolean[];
  onChecklistChange?: (newState: boolean[]) => void;
  language?: "en" | "hi" | string | null;
  readOnlyPublic?: boolean;
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

type SharedFeedbackEntry = {
  id: string;
  kind: "comment" | "edit";
  author_name: string;
  body: string;
  suggested_text?: string | null;
  created_at: string;
};

const EMPTY_FOLLOW_UPS: FollowUpEntry[] = [];
const EMPTY_CHECKLIST: boolean[] = [];
const CHECKLIST_STORAGE_PREFIX = "lexalyze-checklist:";

type ChecklistResult = AnalysisResultData & {
  checkbox?: boolean[];
  checklistState?: boolean[];
};

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

function getInitialChecklist(savedChecklist: boolean[], result: AnalysisResultData | null | undefined, analysisId: string | undefined) {
  const itemCount = result?.actionItems?.length ?? 0;
  const localChecklist = readLocalChecklist(analysisId, itemCount);
  if (localChecklist) return localChecklist;

  const checklistResult = result as ChecklistResult | undefined;
  const resultChecklist = Array.isArray(checklistResult?.checkbox)
    ? checklistResult.checkbox
    : Array.isArray(checklistResult?.checklistState)
      ? checklistResult.checklistState
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

function pdfCopy(language?: string | null) {
  const isHindi = language?.toLowerCase().startsWith("hi");

  if (!isHindi) {
    return {
      reportType: "DOCUMENT INTELLIGENCE REPORT",
      generated: "Generated",
      documentAnalysis: "Document analysis",
      completed: "Analysis completed.",
      executiveSnapshot: "Executive snapshot",
      documentType: "Document type",
      notSpecified: "Not specified",
      confidence: "Confidence",
      riskScore: "Risk score",
      notScored: "Not scored",
      partyFavour: "Party favour",
      summary: "Summary",
      noSummary: "No full summary provided.",
      keyItems: "Key numbers and dates",
      riskFlags: "Risk flags",
      quote: "Quote",
      legalContext: "Legal context",
      whatToDo: "What to do",
      favourableClauses: "Favourable clauses",
      missingClauses: "Missing clauses",
      whatToAdd: "What to add",
      actionChecklist: "Action checklist",
      done: "[Done]",
      open: "[Open]",
      negotiationTips: "Negotiation tips",
      consumerRights: "Consumer rights",
      stampDuty: "Stamp duty and registration",
      limitations: "Limitations",
      noLimitations: "No specific limitations were provided.",
      lawyerGuidance: "Lawyer guidance",
      fallbackGuidance: "This AI summary is informational and not legal advice. Consult a qualified lawyer before making important legal or financial decisions.",
      followUps: "Follow-up questions",
      footer: "Lexalyze AI-generated analysis. Not legal advice.",
    };
  }

  return {
    reportType: "कानूनी दस्तावेज़ विश्लेषण रिपोर्ट",
    generated: "तैयार किया गया",
    documentAnalysis: "दस्तावेज़ विश्लेषण",
    completed: "विश्लेषण पूरा हुआ.",
    executiveSnapshot: "मुख्य झलक",
    documentType: "दस्तावेज़ प्रकार",
    notSpecified: "स्पष्ट नहीं",
    confidence: "विश्वसनीयता",
    riskScore: "जोखिम स्कोर",
    notScored: "स्कोर उपलब्ध नहीं",
    partyFavour: "किस पक्ष में",
    summary: "सारांश",
    noSummary: "पूरा सारांश उपलब्ध नहीं है.",
    keyItems: "मुख्य संख्याएं और तारीखें",
    riskFlags: "जोखिम संकेत",
    quote: "उद्धरण",
    legalContext: "कानूनी संदर्भ",
    whatToDo: "क्या करें",
    favourableClauses: "अनुकूल धाराएं",
    missingClauses: "छूटी हुई धाराएं",
    whatToAdd: "क्या जोड़ें",
    actionChecklist: "कार्य सूची",
    done: "[पूरा]",
    open: "[बाकी]",
    negotiationTips: "बातचीत सुझाव",
    consumerRights: "उपभोक्ता अधिकार",
    stampDuty: "स्टाम्प ड्यूटी और पंजीकरण",
    limitations: "सीमाएं",
    noLimitations: "कोई विशेष सीमा नहीं दी गई.",
    lawyerGuidance: "वकील मार्गदर्शन",
    fallbackGuidance: "यह AI सारांश केवल जानकारी के लिए है, कानूनी सलाह नहीं. महत्वपूर्ण कानूनी या वित्तीय निर्णय से पहले योग्य वकील से सलाह लें.",
    followUps: "फॉलो-अप प्रश्न",
    footer: "Lexalyze AI-generated analysis. Not legal advice.",
  };
}

async function fetchFontAsBase64(path: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load PDF font: ${path}`);

  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

async function registerHindiPdfFont(pdf: {
  addFileToVFS: (filename: string, data: string) => void;
  addFont: (filename: string, fontName: string, fontStyle: string) => void;
}) {
  const [regular, bold] = await Promise.all([
    fetchFontAsBase64("/fonts/NotoSansDevanagari-Regular.ttf"),
    fetchFontAsBase64("/fonts/NotoSansDevanagari-Bold.ttf"),
  ]);

  pdf.addFileToVFS("NotoSansDevanagari-Regular.ttf", regular);
  pdf.addFont("NotoSansDevanagari-Regular.ttf", "NotoSansDevanagari", "normal");
  pdf.addFileToVFS("NotoSansDevanagari-Bold.ttf", bold);
  pdf.addFont("NotoSansDevanagari-Bold.ttf", "NotoSansDevanagari", "bold");
}

function escapeXml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeCsv(value: string | number | undefined | null) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function analysisRows(result: AnalysisResultData, checklist: boolean[]) {
  const rows: Array<[string, string, string, string]> = [
    ["Summary", result.documentTitle || "Document analysis", result.fullSummary || result.oneLineSummary || "", ""],
    ["Risk", "Risk score", result.riskScore !== undefined ? `${result.riskScore}/10` : "", result.riskScoreReason || ""],
    ["Confidence", result.overallConfidence || "", result.overallConfidenceReason || "", ""],
  ];

  result.keyNumbers?.forEach((item) => rows.push(["Key number", item, "", ""]));
  result.keyDeadlines?.forEach((item) => rows.push(["Key deadline", item, "", ""]));
  result.redFlags?.forEach((flag) => rows.push(["Risk flag", flag.title, flag.explanation, `${flag.severity} risk | ${flag.confidence} confidence`]));
  result.positivePoints?.forEach((point) => rows.push(["Favourable clause", point.title, point.explanation, `${point.confidence} confidence`]));
  result.missingClauses?.forEach((item) => rows.push(["Missing clause", item.clause, item.whyItMatters, `${item.riskIfAbsent} risk if absent`]));
  result.actionItems?.forEach((item, index) => rows.push(["Action item", item.action, item.reason, `${item.priority}${checklist[index] ? " | Done" : " | Open"}`]));
  result.negotiationTips?.forEach((tip) => rows.push(["Negotiation tip", tip, "", ""]));
  result.cannotDetermineList?.forEach((item) => rows.push(["Limitation", item, "", ""]));

  if (result.consumerRightsNote) rows.push(["Consumer rights", "Consumer rights", result.consumerRightsNote, ""]);
  if (result.stampDutyNote) rows.push(["Stamp duty", "Stamp duty and registration", result.stampDutyNote, ""]);
  if (result.lawyerGuidance) rows.push(["Lawyer guidance", "Lawyer guidance", result.lawyerGuidance, ""]);

  return rows;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(bytes: number[], value: number) {
  bytes.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeUint32(bytes: number[], value: number) {
  bytes.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function concatBytes(parts: Uint8Array[]) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

function createZip(files: Array<{ name: string; content: string }>) {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    const local: number[] = [];
    writeUint32(local, 0x04034b50);
    writeUint16(local, 20);
    writeUint16(local, 0);
    writeUint16(local, 0);
    writeUint16(local, dosTime);
    writeUint16(local, dosDate);
    writeUint32(local, crc);
    writeUint32(local, data.length);
    writeUint32(local, data.length);
    writeUint16(local, nameBytes.length);
    writeUint16(local, 0);
    const localHeader = concatBytes([new Uint8Array(local), nameBytes, data]);
    parts.push(localHeader);

    const central: number[] = [];
    writeUint32(central, 0x02014b50);
    writeUint16(central, 20);
    writeUint16(central, 20);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, dosTime);
    writeUint16(central, dosDate);
    writeUint32(central, crc);
    writeUint32(central, data.length);
    writeUint32(central, data.length);
    writeUint16(central, nameBytes.length);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint32(central, 0);
    writeUint32(central, offset);
    centralParts.push(concatBytes([new Uint8Array(central), nameBytes]));
    offset += localHeader.length;
  });

  const centralDirectory = concatBytes(centralParts);
  const end: number[] = [];
  writeUint32(end, 0x06054b50);
  writeUint16(end, 0);
  writeUint16(end, 0);
  writeUint16(end, files.length);
  writeUint16(end, files.length);
  writeUint32(end, centralDirectory.length);
  writeUint32(end, offset);
  writeUint16(end, 0);

  return concatBytes([...parts, centralDirectory, new Uint8Array(end)]);
}

function buildDocxBlob(result: AnalysisResultData, checklist: boolean[]) {
  const runFonts = '<w:rFonts w:ascii="Aptos" w:hAnsi="Aptos" w:eastAsia="Noto Sans Devanagari" w:cs="Noto Sans Devanagari"/>';
  const textRuns = (text: string) => String(text || "")
    .split("\n")
    .map((line, index) => `${index > 0 ? "<w:br/>" : ""}<w:t xml:space="preserve">${escapeXml(line)}</w:t>`)
    .join("");
  const paragraph = (
    text: string,
    options: {
      bold?: boolean;
      color?: string;
      size?: number;
      align?: "left" | "center" | "right";
      before?: number;
      after?: number;
      shade?: string;
      border?: string;
    } = {}
  ) => `
    <w:p>
      <w:pPr>
        ${options.align ? `<w:jc w:val="${options.align}"/>` : ""}
        <w:spacing w:before="${options.before ?? 0}" w:after="${options.after ?? 180}" w:line="300" w:lineRule="auto"/>
        ${options.shade ? `<w:shd w:fill="${options.shade}"/>` : ""}
        ${options.border ? `<w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="${options.border}"/></w:pBdr>` : ""}
      </w:pPr>
      <w:r>
        <w:rPr>
          ${runFonts}
          ${options.bold ? "<w:b/><w:bCs/>" : ""}
          <w:color w:val="${options.color ?? "202020"}"/>
          <w:sz w:val="${options.size ?? 22}"/><w:szCs w:val="${options.size ?? 22}"/>
        </w:rPr>
        ${textRuns(text)}
      </w:r>
    </w:p>`;
  const cell = (content: string, shade = "FFFFFF", color = "202020", bold = false) => `
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="2600" w:type="dxa"/>
        <w:shd w:fill="${shade}"/>
        <w:tcBorders>
          <w:top w:val="single" w:sz="6" w:color="E9E1CB"/>
          <w:left w:val="single" w:sz="6" w:color="E9E1CB"/>
          <w:bottom w:val="single" w:sz="6" w:color="E9E1CB"/>
          <w:right w:val="single" w:sz="6" w:color="E9E1CB"/>
        </w:tcBorders>
      </w:tcPr>
      ${paragraph(content, { color, bold, size: bold ? 20 : 19, after: 80 })}
    </w:tc>`;
  const table = (rows: string[][]) => `
    <w:tbl>
      <w:tblPr><w:tblW w:w="10000" w:type="dxa"/><w:tblLook w:firstRow="1" w:noHBand="0" w:noVBand="1"/></w:tblPr>
      ${rows.map((row) => `<w:tr>${row.map((item, index) => cell(item, index % 2 === 0 ? "FBF8EF" : "FFFFFF", index % 2 === 0 ? "8A6419" : "202020", index % 2 === 0)).join("")}</w:tr>`).join("")}
    </w:tbl>`;
  const sectionTitle = (text: string, color = "A88426") => paragraph(text.toUpperCase(), { bold: true, color, size: 22, before: 260, after: 100 });
  const card = (title: string, body: string, meta = "", color = "A88426") => [
    paragraph(title, { bold: true, color: "202020", size: 23, before: 80, after: 80, shade: "FCFAF4", border: color }),
    meta ? paragraph(meta.toUpperCase(), { bold: true, color, size: 16, after: 60 }) : "",
    body ? paragraph(body, { color: "595959", size: 19, after: 120 }) : "",
  ].join("");

  const facts = [
    ["Document type", result.documentType || "Not specified"],
    ["Confidence", result.overallConfidence || "Not specified"],
    ["Risk score", result.riskScore !== undefined ? `${result.riskScore}/10` : "Not scored"],
    ["Party favour", result.partyFavour ? result.partyFavour.replace(/_/g, " ") : "Not specified"],
  ];

  const body = [
    paragraph("LEXALYZE", { bold: true, color: "8A6419", size: 34, after: 40 }),
    paragraph("Document intelligence report", { color: "777777", size: 17, after: 260 }),
    paragraph(result.documentTitle || "Document analysis", { bold: true, color: "111111", size: 34, after: 180 }),
    paragraph(result.oneLineSummary || result.fullSummary || "Analysis completed.", { color: "202020", size: 22, shade: "FBF8EF", border: "C9A84C", before: 80, after: 240 }),
    sectionTitle("Executive snapshot"),
    table(facts),
    result.overallConfidenceReason ? card("Confidence note", result.overallConfidenceReason, "", "A88426") : "",
    result.riskScoreReason ? card("Risk note", result.riskScoreReason, "", "B45309") : "",
    sectionTitle("Summary"),
    paragraph(result.fullSummary || "No full summary provided.", { size: 21, after: 180 }),
    [...(result.keyNumbers ?? []), ...(result.keyDeadlines ?? [])].length > 0 ? sectionTitle("Key numbers and dates") : "",
    ...(result.keyNumbers ?? []).map((item) => card("Key number", item, "", "A88426")),
    ...(result.keyDeadlines ?? []).map((item) => card("Key deadline", item, "", "A88426")),
    ...(result.redFlags ?? []).length > 0 ? sectionTitle("Risk flags", "B91C1C") : "",
    ...(result.redFlags ?? []).map((flag, index) => card(
      `${index + 1}. ${flag.title}`,
      [flag.explanation, flag.exactQuote ? `Quote: "${flag.exactQuote}"` : "", flag.legalContext ? `Legal context: ${flag.legalContext}` : "", flag.whatToDoAboutIt ? `What to do: ${flag.whatToDoAboutIt}` : ""].filter(Boolean).join("\n"),
      `${flag.severity} risk | ${flag.confidence} confidence`,
      flag.severity === "HIGH" ? "B91C1C" : flag.severity === "MEDIUM" ? "B45309" : "047857"
    )),
    ...(result.positivePoints ?? []).length > 0 ? sectionTitle("Favourable clauses", "047857") : "",
    ...(result.positivePoints ?? []).map((point, index) => card(
      `${index + 1}. ${point.title}`,
      [point.explanation, point.exactQuote ? `Quote: "${point.exactQuote}"` : ""].filter(Boolean).join("\n"),
      `${point.confidence} confidence`,
      "047857"
    )),
    ...(result.missingClauses ?? []).length > 0 ? sectionTitle("Missing clauses", "B45309") : "",
    ...(result.missingClauses ?? []).map((item, index) => card(
      `${index + 1}. ${item.clause}`,
      [item.whyItMatters, item.whatToAdd ? `What to add: ${item.whatToAdd}` : ""].filter(Boolean).join("\n"),
      `${item.riskIfAbsent} risk if absent`,
      item.riskIfAbsent === "HIGH" ? "B91C1C" : item.riskIfAbsent === "MEDIUM" ? "B45309" : "047857"
    )),
    ...(result.actionItems ?? []).length > 0 ? sectionTitle("Action checklist") : "",
    ...(result.actionItems ?? []).map((item, index) => card(
      `${checklist[index] ? "[Done]" : "[Open]"} ${item.action}`,
      item.reason,
      item.priority,
      checklist[index] ? "047857" : "A88426"
    )),
    ...(result.negotiationTips ?? []).length > 0 ? sectionTitle("Negotiation tips") : "",
    ...(result.negotiationTips ?? []).map((tip) => card("Negotiation tip", tip, "", "A88426")),
    result.consumerRightsNote ? sectionTitle("Consumer rights", "1D4ED8") : "",
    result.consumerRightsNote ? paragraph(result.consumerRightsNote, { size: 21, after: 180 }) : "",
    result.stampDutyNote ? sectionTitle("Stamp duty and registration", "B45309") : "",
    result.stampDutyNote ? paragraph(result.stampDutyNote, { size: 21, after: 180 }) : "",
    sectionTitle("Limitations", "B45309"),
    ...(result.cannotDetermineList?.length ? result.cannotDetermineList : ["No specific limitations were provided."]).map((item) => card("Limitation", item, "", "B45309")),
    sectionTitle("Lawyer guidance"),
    paragraph(result.lawyerGuidance || "This AI summary is informational and not legal advice. Consult a qualified lawyer before making important legal or financial decisions.", { size: 20, after: 180 }),
    paragraph("Lexalyze AI-generated analysis. Not legal advice.", { color: "777777", size: 16, before: 260, after: 0 }),
  ].join("");

  const files = [
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    },
    {
      name: "word/document.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/></w:sectPr></w:body></w:document>`,
    },
  ];

  return new Blob([createZip(files)], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

function buildCsvBlob(result: AnalysisResultData, checklist: boolean[]) {
  const header = ["Category", "Title", "Detail", "Meta"].map(escapeCsv).join(",");
  const lines = analysisRows(result, checklist).map((row) => row.map(escapeCsv).join(","));
  return new Blob([[header, ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
}

export default function AnalysisResult({
  result,
  analysisId,
  plan,
  savedFollowUps = EMPTY_FOLLOW_UPS,
  savedChecklist = EMPTY_CHECKLIST,
  onChecklistChange,
  language = "en",
  readOnlyPublic = false,
}: AnalysisResultProps) {
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpHistory, setFollowUpHistory] = useState<FollowUpEntry[]>(savedFollowUps);
  const [followUpError, setFollowUpError] = useState<ErrorType | "">("");
  const [followUpErrorMessage, setFollowUpErrorMessage] = useState("");
  const [actionError, setActionError] = useState<ErrorType | "">("");
  const [checkedItems, setCheckedItems] = useState<boolean[]>(
    getInitialChecklist(savedChecklist, result, analysisId)
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [sharingMode, setSharingMode] = useState<"view" | "comment" | "edit" | null>(null);
  const [shareMode, setShareMode] = useState<"view" | "comment" | "edit">("view");
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const [ownerFeedback, setOwnerFeedback] = useState<SharedFeedbackEntry[]>([]);
  const [ownerFeedbackLoading, setOwnerFeedbackLoading] = useState(false);
  const [ownerFeedbackError, setOwnerFeedbackError] = useState("");
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!analysisId || readOnlyPublic) {
      return;
    }

    let cancelled = false;

    void Promise.resolve().then(async () => {
      if (cancelled) return;
      setOwnerFeedbackLoading(true);
      setOwnerFeedbackError("");

      try {
        const response = await fetch(`/api/share/feedback?analysisId=${encodeURIComponent(analysisId)}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          const apiError = await readApiError(response, "load_failed");
          throw new Error(apiError.message);
        }

        const data = await response.json();
        if (!cancelled) {
          setOwnerFeedback(Array.isArray(data.feedback) ? data.feedback : []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Shared feedback load failed:", error);
          setOwnerFeedbackError(error instanceof Error ? error.message : "Shared feedback could not be loaded.");
        }
      } finally {
        if (!cancelled) setOwnerFeedbackLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [analysisId, readOnlyPublic]);

  useEffect(() => {
    if (!isShareMenuOpen && !isDownloadMenuOpen) return;

    function closeOnOutsideClick(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && actionMenuRef.current?.contains(target)) return;
      setIsShareMenuOpen(false);
      setIsDownloadMenuOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [isShareMenuOpen, isDownloadMenuOpen]);

  if (!result) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#0E0E12] p-8 text-center shadow-lg">
        <p className="text-neutral-500 font-medium">No analysis logs located.</p>
      </div>
    );
  }

  const currentPlan = normalizePlan(plan);
  const canUseOutputs = currentPlan !== "free";
  const canExportCsv = currentPlan === "team";
  const report = result;

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
        setActionError("checklist_save_failed");
      })
      .catch((error) => {
        console.error("Checklist save failed:", error instanceof Error ? error.message : error);
        setActionError("checklist_save_failed");
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
    if (!canUseOutputs) return;
    setActionError("");
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
      const copy = pdfCopy(language);
      const isHindiPdf = language?.toLowerCase().startsWith("hi");
      const pdfFont = isHindiPdf ? "NotoSansDevanagari" : "helvetica";
      if (isHindiPdf) {
        await registerHindiPdfFont(pdf);
      }
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
      const setPdfFont = (style: "normal" | "bold") => pdf.setFont(pdfFont, style);
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
        setPdfFont("bold");
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
        setPdfFont("normal");
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
        setPdfFont("normal");
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
        setPdfFont("bold");
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
        setPdfFont("normal");
        pdf.setFontSize(8.7);
        setText(colors.muted);
        if (bodyLines.length > 0) {
          pdf.text(bodyLines, margin + 6, textY);
        }
        y += height + 4;
      };

      paintPage();
      setPdfFont("bold");
      pdf.setFontSize(18);
      setText(colors.goldDark);
      pdf.text("LEXALYZE", margin, y);
      pdf.setFontSize(8);
      setText(colors.muted);
      pdf.text(copy.reportType, margin, y + 7);
      pdf.text(
        new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        pageWidth - margin,
        y,
        { align: "right" }
      );
      y += 18;

      setPdfFont("bold");
      pdf.setFontSize(19);
      setText(colors.ink);
      pdf.text(lines(pdfResult.documentTitle || copy.documentAnalysis, contentWidth), margin, y);
      y += Math.max(12, lines(pdfResult.documentTitle || copy.documentAnalysis, contentWidth).length * 8);
      callout(pdfResult.oneLineSummary || copy.completed, colors.gold);

      section(copy.executiveSnapshot, colors.gold, 38);
      const facts = [
        [copy.documentType, pdfResult.documentType || copy.notSpecified],
        [copy.confidence, pdfResult.overallConfidence],
        [copy.riskScore, pdfResult.riskScore !== undefined ? `${pdfResult.riskScore}/10` : copy.notScored],
        [copy.partyFavour, pdfResult.partyFavour ? pdfResult.partyFavour.replace(/_/g, " ") : copy.notSpecified],
      ];
      facts.forEach(([label, value]) => itemBlock(label, value, undefined, colors.gold));
      if (pdfResult.overallConfidenceReason) paragraph(pdfResult.overallConfidenceReason, { accent: colors.muted });
      if (pdfResult.riskScoreReason) paragraph(pdfResult.riskScoreReason, { accent: colors.muted });

      section(copy.summary, colors.gold, 24);
      paragraph(pdfResult.fullSummary || copy.noSummary);

      const keyItems = [...(pdfResult.keyNumbers ?? []), ...(pdfResult.keyDeadlines ?? [])];
      if (keyItems.length > 0) {
        section(copy.keyItems, colors.gold, 18);
        keyItems.forEach((item) => itemBlock(item, "", undefined, colors.gold));
      }

      if ((pdfResult.redFlags?.length ?? 0) > 0) {
        section(copy.riskFlags, colors.rose, 24);
        pdfResult.redFlags.forEach((flag, index) => {
          itemBlock(
            `${index + 1}. ${flag.title}`,
            [
              flag.explanation,
              flag.exactQuote && flag.exactQuote !== "No exact quote found in document." ? `${copy.quote}: "${flag.exactQuote}"` : "",
              flag.legalContext ? `${copy.legalContext}: ${flag.legalContext}` : "",
              flag.whatToDoAboutIt ? `${copy.whatToDo}: ${flag.whatToDoAboutIt}` : "",
            ].filter(Boolean).join("\n"),
            `${flag.severity} risk | ${flag.confidence} confidence`,
            priorityColor(flag.severity)
          );
        });
      }

      if ((pdfResult.positivePoints?.length ?? 0) > 0) {
        section(copy.favourableClauses, colors.emerald, 20);
        pdfResult.positivePoints.forEach((point, index) => {
          itemBlock(
            `${index + 1}. ${point.title}`,
            [
              point.explanation,
              point.exactQuote && point.exactQuote !== "No exact quote found in document." ? `${copy.quote}: "${point.exactQuote}"` : "",
            ].filter(Boolean).join("\n"),
            `${point.confidence} confidence`,
            colors.emerald
          );
        });
      }

      if ((pdfResult.missingClauses?.length ?? 0) > 0) {
        section(copy.missingClauses, colors.amber, 20);
        pdfResult.missingClauses!.forEach((item, index) => {
          itemBlock(
            `${index + 1}. ${item.clause}`,
            [item.whyItMatters, item.whatToAdd ? `${copy.whatToAdd}: ${item.whatToAdd}` : ""].filter(Boolean).join("\n"),
            `${item.riskIfAbsent} risk if absent`,
            priorityColor(item.riskIfAbsent)
          );
        });
      }

      if ((pdfResult.actionItems?.length ?? 0) > 0) {
        section(copy.actionChecklist, colors.gold, 20);
        pdfResult.actionItems.forEach((item, index) => {
          itemBlock(
            `${checkedItems[index] ? copy.done : copy.open} ${item.action}`,
            item.reason,
            item.priority,
            checkedItems[index] ? colors.emerald : priorityColor(item.priority)
          );
        });
      }

      if ((pdfResult.negotiationTips?.length ?? 0) > 0) {
        section(copy.negotiationTips, colors.gold, 18);
        pdfResult.negotiationTips!.forEach((tip) => itemBlock(tip, "", undefined, colors.gold));
      }

      if (pdfResult.consumerRightsNote) {
        section(copy.consumerRights, colors.blue, 20);
        paragraph(pdfResult.consumerRightsNote);
      }

      if (pdfResult.stampDutyNote) {
        section(copy.stampDuty, colors.amber, 20);
        paragraph(pdfResult.stampDutyNote);
      }

      section(copy.limitations, colors.amber, 20);
      (pdfResult.cannotDetermineList?.length ? pdfResult.cannotDetermineList : [copy.noLimitations])
        .forEach((item) => itemBlock(item, "", undefined, colors.amber));

      section(copy.lawyerGuidance, colors.gold, 20);
      paragraph(pdfResult.lawyerGuidance ?? copy.fallbackGuidance);

      if (followUpHistory.length > 0) {
        section(copy.followUps, colors.gold, 20);
        followUpHistory.forEach((entry, index) => itemBlock(`${index + 1}. ${entry.question}`, entry.answer, undefined, colors.gold));
      }

      const totalPages = pdf.getNumberOfPages();
      for (let page = 1; page <= totalPages; page += 1) {
        pdf.setPage(page);
        setDraw(colors.line);
        pdf.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
        setPdfFont("normal");
        pdf.setFontSize(7.5);
        setText(colors.muted);
        pdf.text(copy.footer, margin, pageHeight - 8);
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
      setActionError("download_failed");
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
    setFollowUpErrorMessage("");
    setFollowUpQuestion("");

    try {
      const response = await fetch("/api/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, analysisId, language: language || "en" }),
      });

      if (!response.ok) {
        const apiError = await readApiError(response, "api_failure");
        setFollowUpError(apiError.code);
        setFollowUpErrorMessage(apiError.message);
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!data.answer) {
        setFollowUpError("api_failure");
        return;
      }

      setFollowUpHistory((prev) => [...prev, { question, answer: data.answer }]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      const mappedError = mapBackendError(errorMessage) || "api_failure";
      setFollowUpError(mappedError);
      setFollowUpErrorMessage(errorMessage);
    } finally {
      setFollowUpLoading(false);
    }
  }


  async function handleShare(nextMode = shareMode) {
    if (!canUseOutputs) return;
    setActionError("");
    setSharingMode(nextMode);
    setShareMode(nextMode);
    let url = window.location.href;
    try {
      if (analysisId) {
        const response = await fetch("/api/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ analysisId, mode: nextMode }),
        });

        if (!response.ok) {
          const apiError = await readApiError(response, "share_failed");
          setActionError(apiError.code);
          return;
        }

        const data = await response.json().catch(() => ({}));
        if (typeof data.url === "string") url = data.url;
      }

      if (navigator.share) {
        setIsShareMenuOpen(false);
        setSharingMode(null);
        await navigator.share({ title: result?.documentTitle || "Lexalyze Analysis", url });
        return;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setIsShareMenuOpen(false);
        setSharingMode(null);
        return;
      }
      if (err && typeof err === "object" && "name" in err && err.name === "AbortError") {
        setIsShareMenuOpen(false);
        setSharingMode(null);
        return;
      }
      /* fallback to clipboard */
    }
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      setIsShareMenuOpen(false);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setActionError("share_failed");
    } finally {
      setSharingMode(null);
    }
  }

  function handleDownloadDOCX() {
    if (!canUseOutputs) return;
    setActionError("");
    try {
      downloadBlob(buildDocxBlob(report, checkedItems), `lexalyze-${safePdfName(report.documentTitle)}.docx`);
    } catch (err) {
      console.error("DOCX download failed:", err);
      setActionError("download_failed");
    }
  }

  function handleDownloadCSV() {
    if (!canExportCsv) return;
    setActionError("");
    try {
      downloadBlob(buildCsvBlob(report, checkedItems), `lexalyze-${safePdfName(report.documentTitle)}.csv`);
    } catch (err) {
      console.error("CSV download failed:", err);
      setActionError("download_failed");
    }
  }

  const favourStyles = partyFavourStyles(result.partyFavour);
  const shareModes: Array<"view" | "comment" | "edit"> = currentPlan === "team" ? ["view", "comment", "edit"] : ["view"];

  return (
    <section id="analysis-result-content" className="w-full space-y-6 rounded-3xl bg-transparent text-white">

      {!readOnlyPublic && (
      <>
      {/* Floating Sticky action bar */}
      <div ref={actionMenuRef} className="pointer-events-none sticky top-4 z-30 flex flex-wrap justify-end gap-2">
        <div className="pointer-events-auto relative">
          <button
            type="button"
            onClick={() => {
              setIsShareMenuOpen((open) => !open);
              setIsDownloadMenuOpen(false);
            }}
            disabled={!canUseOutputs || sharingMode !== null}
            title={canUseOutputs ? "Share analysis" : "Upgrade to Solo to unlock sharing"}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#121216]/95 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-400 shadow-2xl shadow-black/80 backdrop-blur transition-all duration-300 hover:border-white/40 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-white/20 disabled:hover:text-neutral-400"
            aria-label="Share analysis"
            aria-expanded={isShareMenuOpen}
          >
            {sharingMode ? (
              <>
                <span className="size-3.5 animate-spin rounded-full border-2 border-neutral-600 border-t-[#C9A84C]" />
                <span>Sharing...</span>
              </>
            ) : isCopied ? <span className="text-emerald-400">Copied!</span> : <span>Share</span>}
          </button>
          {isShareMenuOpen && canUseOutputs ? (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-white/10 bg-[#101014] p-2 shadow-2xl shadow-black/70">
              <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-500">Share access</p>
              {shareModes.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  disabled={sharingMode !== null}
                  onClick={() => void handleShare(mode)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${
                    shareMode === mode ? "bg-[#C9A84C]/12 text-[#C9A84C]" : "text-neutral-300 hover:bg-white/[0.04] hover:text-white"
                  } disabled:cursor-wait disabled:opacity-70`}
                >
                  <span>{mode === "view" ? "View-only link" : mode === "comment" ? "Comments link" : "Comments + edits link"}</span>
                  {sharingMode === mode ? (
                    <span className="inline-flex items-center gap-1 text-[#C9A84C]">
                      <span className="size-3 animate-spin rounded-full border-2 border-[#C9A84C]/25 border-t-[#C9A84C]" />
                      Creating
                    </span>
                  ) : shareMode === mode ? (
                    <span className="text-emerald-400">Active</span>
                  ) : null}
                </button>
              ))}
              <p className="px-3 pb-2 pt-1 text-[11px] leading-relaxed text-neutral-500">
                Creates a link-access page and copies it to your clipboard. It is not publicly listed, but anyone with the link can open the enabled access mode.
              </p>
            </div>
          ) : null}
        </div>

        <div className="pointer-events-auto relative">
          <button
            type="button"
            onClick={() => {
              setIsDownloadMenuOpen((open) => !open);
              setIsShareMenuOpen(false);
            }}
            disabled={isDownloading || !canUseOutputs}
            title={canUseOutputs ? "Download analysis" : "Upgrade to Solo to unlock downloads"}
            className="inline-flex items-center gap-2 rounded-full border border-[#C9A84C]/45 bg-[#121216]/95 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#C9A84C] shadow-2xl shadow-black/80 backdrop-blur transition-all duration-300 hover:border-[#C9A84C] hover:bg-[#1E1B15] active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[#121216]/95"
            aria-label="Download analysis"
            aria-expanded={isDownloadMenuOpen}
          >
            {isDownloading ? (
              <>
                <span className="size-3.5 animate-spin rounded-full border-2 border-[#C9A84C]/30 border-t-[#C9A84C]" />
                <span>Generating...</span>
              </>
            ) : (
              <span>Download</span>
            )}
          </button>
          {isDownloadMenuOpen && canUseOutputs ? (
            <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-white/10 bg-[#101014] p-2 shadow-2xl shadow-black/70">
              <button
                type="button"
                onClick={() => {
                  setIsDownloadMenuOpen(false);
                  void handleDownloadPDF();
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-neutral-300 transition hover:bg-white/[0.04] hover:text-white"
              >
                <span>PDF</span>
                <span className="text-[#C9A84C]">Export</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDownloadMenuOpen(false);
                  handleDownloadDOCX();
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-neutral-300 transition hover:bg-white/[0.04] hover:text-white"
              >
                <span>DOCX</span>
                <span className="text-[#C9A84C]">Export</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDownloadMenuOpen(false);
                  handleDownloadCSV();
                }}
                disabled={!canExportCsv}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-neutral-300 transition hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-300"
              >
                <span>CSV</span>
                <span>{canExportCsv ? "Team" : "Team only"}</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      </>
      )}

      {!readOnlyPublic && actionError && (
        <ErrorMessage
          errorType={actionError}
          className="mx-auto max-w-2xl"
          onDismiss={() => setActionError("")}
        />
      )}

      {!readOnlyPublic && (ownerFeedbackLoading || ownerFeedbackError || ownerFeedback.length > 0) && (
        <div className="rounded-3xl border border-[#C9A84C]/20 bg-[#0E0E12]/85 p-6 shadow-lg backdrop-blur-xl">
          <div className="flex flex-col gap-2 border-b border-white/[0.06] pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C9A84C]">Shared Review Inbox</p>
              <h2 className="mt-2 text-lg font-semibold text-white">Comments and edit suggestions</h2>
              <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                Feedback posted by people who opened your shared link appears here.
              </p>
            </div>
            {ownerFeedback.length > 0 && (
              <span className="w-fit rounded-full border border-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                {ownerFeedback.length} item{ownerFeedback.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {ownerFeedbackLoading ? (
            <div className="mt-5 flex items-center gap-2.5 text-xs font-semibold text-neutral-400">
              <span className="size-3.5 animate-spin rounded-full border-2 border-neutral-600 border-t-[#C9A84C]" />
              Loading shared feedback...
            </div>
          ) : ownerFeedbackError ? (
            <p className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-200">
              {ownerFeedbackError}
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {ownerFeedback.map((item) => (
                <article key={item.id} className="rounded-2xl border border-white/[0.06] bg-[#08080C] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.author_name || "Reviewer"}</p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
                        {new Date(item.created_at).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      item.kind === "edit"
                        ? "border border-[#C9A84C]/25 bg-[#C9A84C]/10 text-[#C9A84C]"
                        : "bg-white/[0.04] text-neutral-400"
                    }`}>
                      {item.kind === "edit" ? "Edit suggestion" : "Comment"}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-300">{item.body}</p>
                  {item.suggested_text ? (
                    <p className="mt-3 rounded-xl border border-[#C9A84C]/20 bg-[#C9A84C]/5 px-4 py-3 text-sm leading-6 text-[#f5e2ac]">
                      {item.suggested_text}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      )}

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
          &quot;{result.oneLineSummary}&quot;
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
                  &quot;{flag.exactQuote}&quot;
                </p>
              )}
              {flag.legalContext && (
                <p className="mt-3.5 rounded-xl bg-white/[0.03] px-4 py-3 text-xs font-semibold text-neutral-400 border border-white/[0.05]">
                  Legal: {flag.legalContext}
                </p>
              )}
              {flag.whatToDoAboutIt && (
                <p className="mt-3.5 text-xs font-bold text-emerald-400 flex items-start gap-1.5">
                  <span className="shrink-0">Next:</span>
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
                  &quot;{point.exactQuote}&quot;
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
                  Add: {item.whatToAdd}
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
                <span className="mt-0.5 text-[#C9A84C] font-bold">Tip</span>
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
      {(followUpHistory.length > 0 || !readOnlyPublic) && (
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

        {!readOnlyPublic && (
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
              <ErrorMessage
                errorType={followUpError}
                message={followUpErrorMessage || undefined}
                onDismiss={() => {
                  setFollowUpError("");
                  setFollowUpErrorMessage("");
                }}
              />
            </div>
          )}
        </form>
        )}
      </div>
      )}

    </section>
  );
}
