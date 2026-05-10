"use client";

export type ErrorTone = "red" | "amber" | "blue";

type ErrorMessageProps = {
  title: string;
  message: string;
  hint?: string;
  tone?: ErrorTone;
  onDismiss?: () => void;
  className?: string;
};

const TONE_STYLES: Record<ErrorTone, string> = {
  red: "border-rose-500/35 bg-rose-500/10 text-rose-100",
  amber: "border-amber-400/35 bg-amber-400/10 text-amber-100",
  blue: "border-sky-400/35 bg-sky-400/10 text-sky-100",
};

export default function ErrorMessage({
  title,
  message,
  hint,
  tone = "red",
  onDismiss,
  className = "",
}: ErrorMessageProps) {
  return (
    <div
      className={`animate-[fadeIn_220ms_ease-out_both] rounded-xl border p-3 ${TONE_STYLES[tone]} ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-sm" aria-hidden>
          ⚠️
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-6 opacity-95">{message}</p>
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
