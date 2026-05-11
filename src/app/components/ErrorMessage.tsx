"use client";

export type ErrorTone = "red" | "amber" | "blue";

export type ErrorType = 
  | "file_too_large"
  | "unsupported_file_type" 
  | "api_failure"
  | "rate_limit_hit"
  | "no_text_extracted"
  | "parse_error";

// Helper function to map backend errors to user-friendly error types
export function mapBackendError(error: string | Error | unknown): ErrorType | null {
  if (typeof error !== 'string') return null;
  
  const lowerError = error.toLowerCase();
  
  // File size errors
  if (lowerError.includes('too large') || lowerError.includes('file size') || lowerError.includes('max size') || lowerError.includes('10mb')) {
    return 'file_too_large';
  }
  
  // File type errors
  if (lowerError.includes('unsupported') || lowerError.includes('file type') || lowerError.includes('mime') || lowerError.includes('format')) {
    return 'unsupported_file_type';
  }
  
  // Rate limit errors
  if (lowerError.includes('rate limit') || lowerError.includes('daily limit') || lowerError.includes('quota') || lowerError.includes('limit reached')) {
    return 'rate_limit_hit';
  }
  
  // Text extraction errors
  if (lowerError.includes('no text') || lowerError.includes('extract') || lowerError.includes('readable') || lowerError.includes('ocr')) {
    return 'no_text_extracted';
  }
  
  // Parse errors
  if (lowerError.includes('parse') || lowerError.includes('corrupted') || lowerError.includes('invalid') || lowerError.includes('malformed')) {
    return 'parse_error';
  }
  
  // Default to API failure for network/server errors
  if (lowerError.includes('network') || lowerError.includes('server') || lowerError.includes('timeout') || lowerError.includes('500') || lowerError.includes('502') || lowerError.includes('503') || lowerError.includes('504')) {
    return 'api_failure';
  }
  
  return null;
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

const ERROR_CONFIG: Record<ErrorType, { title: string; message: string; tone: ErrorTone; icon: string }> = {
  file_too_large: {
    title: "File too large",
    message: "Please upload a document smaller than 10MB.",
    tone: "amber",
    icon: "📏"
  },
  unsupported_file_type: {
    title: "Unsupported file type", 
    message: "Please upload a PDF, TXT, PNG, or JPG document.",
    tone: "amber",
    icon: "📄"
  },
  api_failure: {
    title: "Something went wrong",
    message: "We couldn't process your document right now. Please try again.",
    tone: "red",
    icon: "⚠️"
  },
  rate_limit_hit: {
    title: "Daily limit reached",
    message: "You've reached today's free analysis limit. Please try again tomorrow.",
    tone: "blue",
    icon: "⏰"
  },
  no_text_extracted: {
    title: "Couldn't read this document",
    message: "We couldn't detect readable text. Try a clearer or text-based file.",
    tone: "red",
    icon: "🔍"
  },
  parse_error: {
    title: "Document could not be analysed",
    message: "This file may be corrupted or formatted in a way we can't read yet.",
    tone: "red",
    icon: "📋"
  }
};

export default function ErrorMessage({
  title,
  message,
  hint,
  tone = "red",
  onDismiss,
  className = "",
  errorType,
}: ErrorMessageProps) {
  // Use error type config if provided, otherwise fall back to manual props
  const config = errorType ? ERROR_CONFIG[errorType] : null;
  const finalTitle = title || config?.title || "Error";
  const finalMessage = message || config?.message || "Something went wrong.";
  const finalTone = tone || config?.tone || "red";
  const icon = config?.icon || "⚠️";

  return (
    <div
      className={`animate-[fadeIn_220ms_ease-out_both] rounded-xl border p-3 ${TONE_STYLES[finalTone]} ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-sm" aria-hidden>
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
            ✕
          </button>
        ) : null}
      </div>
    </div>
  );
}
