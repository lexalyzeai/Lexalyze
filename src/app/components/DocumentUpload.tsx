"use client";

import { useMemo, useRef, useState } from "react";

const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "image/png",
  "image/jpeg",
]);

function isAccepted(file: File): boolean {
  if (ACCEPTED_MIME_TYPES.has(file.type)) return true;
  // Some environments may provide an empty mime type; fall back to extension.
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".pdf") ||
    name.endsWith(".txt") ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg")
  );
}

type LoadingStage = "idle" | "reading" | "extracting" | "ready";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function DocumentUpload() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loadingStage, setLoadingStage] = useState<LoadingStage>("idle");
  const [extractedText, setExtractedText] = useState("");

  const acceptAttr = useMemo(
    () => ".pdf,.txt,.png,.jpg,.jpeg,application/pdf,text/plain,image/png,image/jpeg",
    [],
  );
  const canAnalyze = extractedText.trim().length > 0;

  async function extractText(file: File) {
    setError("");
    setExtractedText("");
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
        throw new Error("Failed to extract text. Please try again.");
      }

      const data = (await response.json()) as { text?: string };
      if (!data.text) {
        throw new Error("No text was returned from the document.");
      }

      setExtractedText(data.text);
      setLoadingStage("ready");
      await sleep(700);
      setLoadingStage("idle");
    } catch (err) {
      setExtractedText("");
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while extracting text.",
      );
      setLoadingStage("idle");
    }
  }

  async function setFile(file: File) {
    if (!isAccepted(file)) {
      setSelectedFile(null);
      setError("Unsupported file type. Please upload a PDF, TXT, PNG, or JPG.");
      return;
    }
    setError("");
    setSelectedFile(file);
    await extractText(file);
  }

  function openPicker() {
    inputRef.current?.click();
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={acceptAttr}
        onChange={async (e) => {
          const file = e.currentTarget.files?.[0];
          if (file) {
            await setFile(file);
          }
          // Allow selecting the same file again.
          if (e.target instanceof HTMLInputElement) {
            e.target.value = "";
          }
        }}
      />

      <div
        className="w-full max-w-lg rounded-2xl border border-dashed border-white/20 bg-[#1A1A1A] px-10 py-16 text-center shadow-lg shadow-black/20"
        role="button"
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") openPicker();
        }}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={async (e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) {
            await setFile(file);
          }
        }}
        aria-label="Upload area"
      >
        <p className="text-lg font-medium tracking-tight text-white sm:text-xl">
          Upload document to analyze
        </p>
        <p className="mt-3 text-sm text-neutral-500">
          Drag &amp; drop or click to upload
        </p>

        {selectedFile ? (
          <p className="mt-4 text-sm text-neutral-300" aria-live="polite">
            Selected: <span className="font-medium">{selectedFile.name}</span>
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => {
            setExtractedText("This is a sample rental agreement. The tenant agrees to pay rent of ₹15,000 per month. The security deposit is ₹30,000. The notice period is 2 months.")
            setSelectedFile(new File([""], "rental_agreement_sample.pdf", { type: "application/pdf" }))
          }}
        className="mt-4 text-sm text-neutral-500 underline underline-offset-4 transition hover:text-[#C9A84C]"
      >
        Try with sample document
      </button>

      {loadingStage !== "idle" ? (
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
        </p>
      ) : null}

      {extractedText ? (
        <div className="mt-4 max-h-80 w-full max-w-lg overflow-auto rounded-xl border border-white/10 bg-[#111111] p-4 text-sm text-neutral-100">
          <pre className="whitespace-pre-wrap break-words font-mono text-[0.8rem]">
            {extractedText}
          </pre>
        </div>
      ) : null}

      <button
        type="button"
        disabled={!canAnalyze}
        onClick={() => {
          if (!canAnalyze) return;
          console.log("Analyse clicked");
        }}
        className="mt-4 w-full max-w-lg rounded-lg bg-[#C9A84C] py-3 text-center text-base font-semibold text-[#0A0A0A] transition hover:bg-[#d4b55d] active:bg-[#b89542] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[#C9A84C]"
      >
        Analyse document
      </button>
    </div>
  );
}
