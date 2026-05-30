"use client";

import { useEffect, useState } from "react";

type AnalysisLoadingOverlayProps = {
  isVisible: boolean;
  steps?: readonly string[];
};

const LOADING_STEPS = [
  "📖 Reading your document...",
  "🔍 Identifying clauses...",
  "⚠️ Checking for risks...",
  "📋 Building action checklist...",
  "✅ Verifying citations...",
] as const;

const STEP_DURATION_MS = 1900;
const FADE_DURATION_MS = 220;

export default function AnalysisLoadingOverlay({
  isVisible,
  steps = LOADING_STEPS,
}: AnalysisLoadingOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [showStep, setShowStep] = useState(true);

  useEffect(() => {
    if (!isVisible) {
      const resetTimer = setTimeout(() => {
        setStepIndex(0);
        setShowStep(true);
      }, 0);
      return () => clearTimeout(resetTimer);
    }

    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    let stepTimer: ReturnType<typeof setTimeout> | undefined;

    const scheduleNext = () => {
      stepTimer = setTimeout(() => {
        setStepIndex((current) => {
          if (current >= steps.length - 1) return current;

          setShowStep(false);
          fadeTimer = setTimeout(() => {
            setStepIndex((inner) => Math.min(inner + 1, steps.length - 1));
            setShowStep(true);
          }, FADE_DURATION_MS);

          return current;
        });

        scheduleNext();
      }, STEP_DURATION_MS);
    };

    scheduleNext();

    return () => {
      if (stepTimer) clearTimeout(stepTimer);
      if (fadeTimer) clearTimeout(fadeTimer);
    };
  }, [isVisible, steps]);

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-xl rounded-2xl border border-white/10 bg-[#111111]/95 px-8 py-10 text-center shadow-2xl shadow-black/40">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-[#C9A84C]/35 bg-[#C9A84C]/10">
          <span
            className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#C9A84C]/25 border-t-[#C9A84C]"
            aria-hidden
          />
        </div>

        <p
          className={`text-lg font-medium tracking-tight text-white transition-opacity duration-200 sm:text-xl ${
            showStep ? "opacity-100" : "opacity-0"
          }`}
          aria-live="polite"
        >
          {steps[stepIndex]}
        </p>

        <p className="mt-3 text-sm text-neutral-400">
          Analysing your document with citation checks...
        </p>
      </div>
    </div>
  );
}
