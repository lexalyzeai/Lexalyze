"use client";

import { FormEvent, useState } from "react";
import ErrorMessage, { type ErrorType } from "@/app/components/ErrorMessage";
import { readApiError } from "@/lib/error-handling";

type SharedFeedbackEntry = {
  id: string;
  kind: "comment" | "edit";
  author_name: string;
  body: string;
  suggested_text?: string | null;
  created_at: string;
};

type SharedFeedbackProps = {
  token: string;
  mode?: "view" | "comment" | "edit";
  initialFeedback?: SharedFeedbackEntry[];
};

export default function SharedFeedback({ token, mode = "view", initialFeedback = [] }: SharedFeedbackProps) {
  const [feedback, setFeedback] = useState(initialFeedback);
  const [authorName, setAuthorName] = useState("");
  const [body, setBody] = useState("");
  const [suggestedText, setSuggestedText] = useState("");
  const [kind, setKind] = useState<"comment" | "edit">(mode === "edit" ? "edit" : "comment");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorType | "">("");
  const [errorMessage, setErrorMessage] = useState("");

  const canComment = mode === "comment" || mode === "edit";
  if (!canComment && feedback.length === 0) return null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim() || loading) return;
    setLoading(true);
    setError("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/share/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          kind,
          authorName,
          body,
          suggestedText: kind === "edit" ? suggestedText : "",
        }),
      });

      if (!response.ok) {
        const apiError = await readApiError(response, "save_failed");
        setError(apiError.code);
        setErrorMessage(apiError.message);
        return;
      }

      const data = await response.json().catch(() => ({}));
      if (data.feedback) {
        setFeedback((current) => [data.feedback, ...current]);
        setBody("");
        setSuggestedText("");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8 rounded-3xl border border-white/[0.08] bg-[#0E0E12]/80 p-6 shadow-lg backdrop-blur-xl">
      <div className="flex flex-col gap-2 border-b border-white/[0.06] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C9A84C]">Shared Review</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Comments and edit suggestions</h2>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
          {mode === "edit" ? "Comments + edits" : mode === "comment" ? "Comments enabled" : "View only"}
        </span>
      </div>

      {canComment ? (
        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              value={authorName}
              onChange={(event) => setAuthorName(event.target.value)}
              placeholder="Your name"
              className="rounded-2xl border border-white/[0.06] bg-[#08080C] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C9A84C]/50"
            />
            {mode === "edit" ? (
              <div className="inline-flex rounded-2xl border border-white/[0.06] bg-[#08080C] p-1">
                {(["comment", "edit"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setKind(item)}
                    className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                      kind === item ? "bg-[#C9A84C] text-black" : "text-neutral-500 hover:text-neutral-200"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={kind === "edit" ? "Describe the edit you suggest..." : "Leave a comment on this report..."}
            rows={3}
            className="w-full rounded-2xl border border-white/[0.06] bg-[#08080C] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-neutral-600 focus:border-[#C9A84C]/50"
          />
          {kind === "edit" ? (
            <textarea
              value={suggestedText}
              onChange={(event) => setSuggestedText(event.target.value)}
              placeholder="Optional replacement wording or clause suggestion..."
              rows={3}
              className="w-full rounded-2xl border border-[#C9A84C]/20 bg-[#C9A84C]/5 px-4 py-3 text-sm leading-6 text-[#f5e2ac] outline-none transition placeholder:text-[#C9A84C]/45 focus:border-[#C9A84C]/60"
            />
          ) : null}
          <button
            type="submit"
            disabled={loading || !body.trim()}
            className="rounded-full bg-gradient-to-r from-[#C9A84C] to-[#aa8426] px-5 py-3 text-xs font-bold uppercase tracking-wider text-black transition hover:from-[#d4b55d] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Saving..." : kind === "edit" ? "Suggest edit" : "Post comment"}
          </button>
          {error ? (
            <ErrorMessage
              errorType={error}
              message={errorMessage || undefined}
              onDismiss={() => {
                setError("");
                setErrorMessage("");
              }}
            />
          ) : null}
        </form>
      ) : null}

      {feedback.length > 0 ? (
        <div className="mt-6 space-y-3">
          {feedback.map((item) => (
            <article key={item.id} className="rounded-2xl border border-white/[0.06] bg-[#08080C] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">{item.author_name}</p>
                <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
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
      ) : (
        <p className="mt-5 text-sm text-neutral-500">No comments yet.</p>
      )}
    </section>
  );
}
