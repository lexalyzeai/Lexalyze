"use client";

import { FRIENDLY_ERRORS, toErrorCode, type AppErrorCode } from "@/lib/error-handling";

export type ErrorTone = "red" | "amber" | "blue";
export type ErrorType = AppErrorCode;

export function mapBackendError(error: string | Error | unknown): ErrorType {
  return toErrorCode(error);
}

type ErrorMessageProps = {
  title?: string;
  message?: string;
  hint?: string;
  tone?: ErrorTone;
  onDismiss?: () => void;
  className?: string;
  errorType?: ErrorType;
};

const TONE_STYLES: Record<ErrorTone, string> = {
  red: "border-rose-500/35 bg-rose-500/10 text-rose-100",
  amber: "border-amber-400/35 bg-amber-400/10 text-amber-100",
  blue: "border-sky-400/35 bg-sky-400/10 text-sky-100",
};

const ERROR_TONES: Record<ErrorType, ErrorTone> = {
  unauthorized: "amber",
  forbidden: "red",
  not_found: "amber",
  validation: "amber",
  file_too_large: "amber",
  unsupported_file_type: "amber",
  non_legal_document: "amber",
  no_text_extracted: "red",
  parse_error: "red",
  rate_limit_hit: "blue",
  storage_limit_hit: "blue",
  ai_capacity: "blue",
  network_error: "amber",
  save_failed: "red",
  delete_failed: "red",
  load_failed: "amber",
  checklist_save_failed: "amber",
  download_failed: "red",
  share_failed: "red",
  api_failure: "red",
};

const ERROR_ICONS: Record<ErrorType, string> = {
  unauthorized: "!",
  forbidden: "!",
  not_found: "?",
  validation: "!",
  file_too_large: "!",
  unsupported_file_type: "!",
  non_legal_document: "!",
  no_text_extracted: "?",
  parse_error: "!",
  rate_limit_hit: "i",
  storage_limit_hit: "i",
  ai_capacity: "i",
  network_error: "!",
  save_failed: "!",
  delete_failed: "!",
  load_failed: "!",
  checklist_save_failed: "!",
  download_failed: "!",
  share_failed: "!",
  api_failure: "!",
};

export default function ErrorMessage({
  title,
  message,
  hint,
  tone,
  onDismiss,
  className = "",
  errorType,
}: ErrorMessageProps) {
  const config = errorType ? FRIENDLY_ERRORS[errorType] : null;
  const finalTitle = title || config?.title || "Error";
  const finalMessage = message || config?.message || "Something went wrong.";
  const finalTone = tone || (errorType ? ERROR_TONES[errorType] : "red");
  const icon = errorType ? ERROR_ICONS[errorType] : "!";

  return (
    <div
      className={`animate-[fadeIn_220ms_ease-out_both] rounded-xl border p-3 ${TONE_STYLES[finalTone]} ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-current/30 text-[11px] font-bold"
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{finalTitle}</p>
          <p className="mt-1 text-sm leading-6 opacity-95">{finalMessage}</p>
          {hint ? <p className="mt-1 text-xs opacity-80">{hint}</p> : null}
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-md px-1.5 py-0.5 text-xs opacity-80 transition hover:opacity-100"
            aria-label="Dismiss error"
          >
            x
          </button>
        ) : null}
      </div>
    </div>
  );
}
