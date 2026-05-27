"use client";

import { useMemo, useRef, useState } from "react";
import AnalysisResult from "@/app/components/AnalysisResult";
import ErrorMessage, { ErrorType, mapBackendError } from "@/app/components/ErrorMessage";

const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "image/png",
  "image/jpeg",
]);

function isAccepted(file: File): boolean {
  if (ACCEPTED_MIME_TYPES.has(file.type)) return true;
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".pdf") ||
    name.endsWith(".txt") ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg")
  );
}

type LoadingStage = "idle" | "reading" | "extracting" | "ready" | "analysing";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type DocumentUploadProps = {
  language: "EN" | "HI";
  onAnalysisComplete?: () => void;
};

export default function DocumentUpload({ language, onAnalysisComplete }: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<ErrorType | "">("");
  const [loadingStage, setLoadingStage] = useState<LoadingStage>("idle");
  const [extractedText, setExtractedText] = useState("");
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string>("");

  const acceptAttr = useMemo(
    () => ".pdf,.txt,.png,.jpg,.jpeg,application/pdf,text/plain,image/png,image/jpeg",
    []
  );

  const canAnalyze = extractedText.trim().length > 0 && loadingStage === "idle";

  async function extractText(file: File) {
    setError("");
    setExtractedText("");
    setAnalysisResult(null);
    setCurrentAnalysisId("");
    setLoadingStage("reading");

    try {
      await sleep(350);
      setLoadingStage("extracting");

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/extract-text", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Failed to extract text. Please try again.";
        const mappedError = mapBackendError(errorMessage) || "api_failure";
        setError(mappedError);
        setLoadingStage("idle");
        return;
      }

      const data = (await response.json()) as { text?: string };

      if (!data.text) {
        setError("no_text_extracted");
        setLoadingStage("idle");
        return;
      }

      setExtractedText(data.text);
      setLoadingStage("ready");
      await sleep(700);
      setLoadingStage("idle");
    } catch (err) {
      setExtractedText("");
      const errorMessage = err instanceof Error ? err.message : "Something went wrong while extracting text.";
      const mappedError = mapBackendError(errorMessage) || "api_failure";
      setError(mappedError);
      setLoadingStage("idle");
    }
  }

  async function setFile(file: File) {
    if (!isAccepted(file)) {
      setSelectedFile(null);
      setError("unsupported_file_type");
      return;
    }
    setError("");
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || "Analysis failed.";
        const mappedError = mapBackendError(errorMessage) || "api_failure";
        setError(mappedError);
        setLoadingStage("idle");
        return;
      }

      setAnalysisResult(data.result);
      setCurrentAnalysisId(data.analysisId || "");
      onAnalysisComplete?.();
      setLoadingStage("idle");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong while analyzing the document.";
      const mappedError = mapBackendError(errorMessage) || "api_failure";
      setError(mappedError);
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
          const file = e.currentTarget.files?.[0];
          if (file) await setFile(file);
          if (e.target instanceof HTMLInputElement) e.target.value = "";
        }}
      />

      <div
        className="w-full max-w-lg rounded-2xl border border-dashed border-white/20 bg-[#1A1A1A] px-10 py-16 text-center shadow-lg shadow-black/20"
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) await setFile(file);
        }}
        aria-label="Upload area"
      >
        <p className="text-lg font-medium tracking-tight text-white sm:text-xl">
          Upload document to analyze
        </p>
        <p className="mt-3 text-sm text-neutral-500">
          Drag &amp; drop your file here
        </p>
        <button
          type="button"
          onClick={openPicker}
          className="mt-6 rounded-lg border border-white/10 bg-[#111111] px-6 py-2.5 text-sm font-medium text-neutral-300 transition hover:border-[#C9A84C]/40 hover:bg-white/[0.04] hover:text-[#C9A84C]"
        >
          Choose file
        </button>
        {selectedFile && (
          <p className="mt-4 text-sm text-neutral-300" aria-live="polite">
            Selected: <span className="font-medium">{selectedFile.name}</span>
          </p>
        )}
        {error && (
          <div className="mt-4 w-full max-w-lg">
            <ErrorMessage 
              errorType={error}
              onDismiss={() => setError("")}
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
            "This is a sample rental agreement. The tenant agrees to pay rent of ₹15,000 per month. The security deposit is ₹30,000. The notice period is 2 months."
          );
          setSelectedFile(
            new File([""], "rental_agreement_sample.pdf", { type: "application/pdf" })
          );
        }}
        className="mt-4 text-sm text-neutral-500 underline underline-offset-4 transition hover:text-[#C9A84C]"
      >
        Try with sample document
      </button>

      {loadingStage !== "idle" && (
        <p
          className="mt-4 inline-flex items-center gap-2 text-sm text-neutral-400"
          aria-live="polite"
        >
          <span
            className="size-3 animate-spin rounded-full border-2 border-neutral-600 border-t-[#C9A84C]"
            aria-hidden
          />
          {loadingStage === "reading" && "Reading your file..."}
          {loadingStage === "extracting" && "Extracting text..."}
          {loadingStage === "ready" && "Ready to analyse"}
          {loadingStage === "analysing" && "Analysing document..."}
        </p>
      )}

      {extractedText && !analysisResult && (
        <div className="mt-4 max-h-80 w-full max-w-lg overflow-auto rounded-xl border border-white/10 bg-[#111111] p-4 text-sm text-neutral-100">
          <pre className="whitespace-pre-wrap break-words font-mono text-[0.8rem]">
            {extractedText}
          </pre>
        </div>
      )}

      <button
        type="button"
        disabled={!canAnalyze}
        onClick={handleAnalyze}
        className="mt-4 w-full max-w-lg rounded-lg bg-[#C9A84C] py-3 text-center text-base font-semibold text-[#0A0A0A] transition hover:bg-[#d4b55d] active:bg-[#b89542] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[#C9A84C]"
      >
        Analyse document
      </button>

      {analysisResult && (
        <div className="mt-8 w-full max-w-4xl">
          <AnalysisResult result={analysisResult} analysisId={currentAnalysisId} />
        </div>
      )}
    </div>
  );
}