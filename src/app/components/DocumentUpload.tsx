"use client";

import { useMemo, useRef, useState } from "react";
import AnalysisResult, { type AnalysisResultData } from "@/app/components/AnalysisResult";
import ErrorMessage, { ErrorType, mapBackendError } from "@/app/components/ErrorMessage";
import type { PlanId } from "@/lib/plans";
import { readApiError } from "@/lib/error-handling";
import { trackEvent } from "@/lib/analytics";

const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

function isAccepted(file: File): boolean {
  if (ACCEPTED_MIME_TYPES.has(file.type)) return true;
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".pdf") ||
    name.endsWith(".txt") ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".docx") ||
    name.endsWith(".doc")
  );
}
type LoadingStage = "idle" | "reading" | "extracting" | "ready" | "analysing";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
type DocumentUploadProps = {
  language: "EN" | "HI";
  plan?: PlanId;
  workspaceId?: string | null;
  onAnalysisComplete?: () => void;
};

export default function DocumentUpload({ language, plan = "free", workspaceId = null, onAnalysisComplete }: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<ErrorType | "">("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingStage, setLoadingStage] = useState<LoadingStage>("idle");
  const [extractedText, setExtractedText] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultData | null>(null);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string>("");

  const acceptAttr = useMemo(
    () => ".pdf,.txt,.png,.jpg,.jpeg,.docx,.doc,application/pdf,text/plain,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    []
  );

  const canAnalyze = extractedText.trim().length > 0 && loadingStage === "idle";

  async function extractFileText(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/extract-text", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const apiError = await readApiError(response, "no_text_extracted");
      throw new Error(apiError.message);
    }

    const data = (await response.json()) as { text?: string };
    if (!data.text) throw new Error("We couldn't detect readable text. Try a clearer or text-based file.");
    return data.text;
  }

  async function extractText(file: File) {
    setError("");
    setErrorMessage("");
    setExtractedText("");
    setAnalysisResult(null);
    setCurrentAnalysisId("");
    setLoadingStage("reading");

    try {
      await sleep(350);
      setLoadingStage("extracting");

      const text = await extractFileText(file);
      setExtractedText(text);
      trackEvent("document_uploaded", {
        fileType: file.type || "unknown",
        workspace: workspaceId ? "team" : "personal",
        plan,
      });
      setLoadingStage("ready");
      await sleep(700);
      setLoadingStage("idle");
    } catch (err) {
      setExtractedText("");
      const errorMessage = err instanceof Error ? err.message : "Something went wrong while extracting text.";
      const mappedError = mapBackendError(errorMessage) || "api_failure";
      setError(mappedError);
      setErrorMessage(errorMessage);
      setLoadingStage("idle");
    }
  }

  async function setFile(file: File) {
    if (!isAccepted(file)) {
      setSelectedFile(null);
      setError("unsupported_file_type");
      setErrorMessage("");
      return;
    }
    setError("");
    setErrorMessage("");
    setSelectedFile(file);
    await extractText(file);
  }

  function openPicker() {
    inputRef.current?.click();
  }

  async function handleAnalyze() {
    if (!canAnalyze) return;

    try {
      setError("");
      setErrorMessage("");
      setAnalysisResult(null);
      setCurrentAnalysisId("");
      setLoadingStage("analysing");
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: extractedText,
          language: language === "HI" ? "hi" : "en",
          filename: selectedFile?.name || "document.txt",
          workspaceId,
        }),
      });

      if (!response.ok) {
        const apiError = await readApiError(response, "api_failure");
        setError(apiError.code);
        setErrorMessage(apiError.message);
        setLoadingStage("idle");
        trackEvent("analysis_failed", { reason: apiError.code, workspace: workspaceId ? "team" : "personal" });
        return;
      }

      const data = await response.json().catch(() => ({}));

      setAnalysisResult(data.result);
      setCurrentAnalysisId(data.analysisId || "");
      trackEvent("analysis_completed", {
        workspace: workspaceId ? "team" : "personal",
        plan,
      });
      onAnalysisComplete?.();
      setLoadingStage("idle");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong while analyzing the document.";
      const mappedError = mapBackendError(errorMessage) || "api_failure";
      setError(mappedError);
      setErrorMessage(errorMessage);
      trackEvent("analysis_failed", { reason: mappedError, workspace: workspaceId ? "team" : "personal" });
      setLoadingStage("idle");
    }
  }

  return (
    <div className="flex w-full flex-col items-center">
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={acceptAttr}
        onChange={async (e) => {
          const files = Array.from(e.currentTarget.files || []);
          if (files[0]) await setFile(files[0]);
          if (e.target instanceof HTMLInputElement) e.target.value = "";
        }}
      />

      <div
        className="group relative w-full max-w-lg rounded-3xl border border-dashed border-white/[0.08] bg-[#121216]/40 px-8 py-14 text-center shadow-[0_12px_36px_rgba(0,0,0,0.3)] backdrop-blur-md transition-all duration-500 hover:border-[#C9A84C]/45 hover:bg-[#121216]/70 hover:shadow-[0_15px_40px_rgba(201,168,76,0.04)] cursor-pointer outline-none"
        role="button"
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") openPicker();
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          e.preventDefault();
          const files = Array.from(e.dataTransfer.files || []);
          if (files[0]) await setFile(files[0]);
        }}
        aria-label="Upload area"
      >
        
        {/* Gold padlock file vector icon */}
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-[#C9A84C]/25 bg-[#C9A84C]/5 text-[#C9A84C] shadow-inner transition-transform duration-500 group-hover:scale-110">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a2.25 2.25 0 01-2.25-2.25V6.75a2.25 2.25 0 012.25-2.25h10.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25H6.75z" />
          </svg>
        </div>

        <p className="mt-5 text-base font-bold tracking-wide text-white transition duration-300 group-hover:text-[#C9A84C]">
          Upload document to analyze
        </p>
        <p className="mt-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
          Drag &amp; drop or click to browse
        </p>
        <p className="mt-1.5 text-[10px] font-bold tracking-widest text-neutral-600 uppercase">
          Legal PDF, DOCX, TXT, PNG, JPG
        </p>
        
        {selectedFile && (
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-4 py-1.5 text-xs text-neutral-300" aria-live="polite">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Selected: <span className="font-semibold text-white">{selectedFile.name}</span>
          </div>
        )}
        
        {error && (
          <div className="mt-5 w-full max-w-lg">
            <ErrorMessage
              errorType={error}
              message={errorMessage || undefined}
              onDismiss={() => {
                setError("");
                setErrorMessage("");
              }}
            />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          setAnalysisResult(null);
          setCurrentAnalysisId("");
          setExtractedText(
            "This is a sample rental agreement. The tenant agrees to pay rent of Rs. 15,000 per month. The security deposit is Rs. 30,000. The notice period is 2 months."
          );
          setSelectedFile(
            new File([""], "rental_agreement_sample.pdf", { type: "application/pdf" })
          );
        }}
        className="mt-5 text-xs font-bold uppercase tracking-wider text-neutral-500 underline underline-offset-4 transition hover:text-[#C9A84C]"
      >
        Try with sample document
      </button>

      {loadingStage !== "idle" && (
        <div className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.02] px-5 py-2.5 text-xs font-bold text-neutral-400" aria-live="polite">
          <span className="size-3.5 animate-spin rounded-full border-2 border-neutral-600 border-t-[#C9A84C]" aria-hidden />
          {loadingStage === "reading" && "Reading contract files..."}
          {loadingStage === "extracting" && "Extracting clause nodes..."}
          {loadingStage === "ready" && "Ready to run analysis"}
          {loadingStage === "analysing" && "Structuring insights..."}
        </div>
      )}

      {extractedText && !analysisResult && (
        <div className="mt-6 max-h-60 w-full max-w-lg overflow-auto rounded-2xl border border-white/[0.06] bg-[#0A0A0C] p-5 shadow-inner">
          <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-neutral-400">
            {extractedText}
          </pre>
        </div>
      )}

      <button
        type="button"
        disabled={!canAnalyze}
        onClick={handleAnalyze}
        className="mt-6 w-full max-w-lg rounded-full bg-gradient-to-r from-[#C9A84C] to-[#aa8426] py-4 text-center text-xs font-bold tracking-widest uppercase text-[#0A0A0A] shadow-[0_4px_20px_rgba(201,168,76,0.15)] transition-all duration-300 hover:scale-[1.01] hover:from-[#d4b55d] hover:shadow-[0_6px_25px_rgba(201,168,76,0.25)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:from-[#C9A84C]"
      >
        Analyse document
      </button>

      {analysisResult && (
        <div className="mt-10 w-full max-w-4xl animate-[fadeIn_600ms_cubic-bezier(0.16,1,0.3,1)_both]">
          <AnalysisResult result={analysisResult} analysisId={currentAnalysisId} plan={plan} language={language === "HI" ? "hi" : "en"} />
        </div>
      )}
    </div>
  );
}
