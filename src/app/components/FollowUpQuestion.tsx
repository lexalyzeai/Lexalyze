"use client";

import { FormEvent, useState } from "react";

type FollowUpResponse = {
  answer?: string;
  fromDocument?: boolean;
};

type FollowUpQuestionProps = {
  analysisId: string;
};

export default function FollowUpQuestion({
  analysisId,
}: FollowUpQuestionProps) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [fromDocument, setFromDocument] = useState<boolean | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || loading) return;

    setLoading(true);
    setError("");
    setAnswer("");
    setFromDocument(null);

    try {
      const response = await fetch("/api/followup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: trimmedQuestion,
          analysisId,
          language: "en",
        }),
      });

      const data = (await response.json()) as FollowUpResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error || "Could not fetch follow-up answer."
        );
      }

      if (!data.answer) {
        throw new Error("No answer was returned.");
      }

      setAnswer(data.answer);
      setFromDocument(Boolean(data.fromDocument));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while searching the document."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full rounded-xl border border-white/10 bg-[#121212] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.28)] sm:p-6">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask anything about this document..."
            className="w-full rounded-lg border border-white/10 bg-[#0F0F0F] px-4 py-3 text-sm text-white placeholder:text-neutral-500 outline-none transition focus:border-[#C9A84C]/60 focus:ring-2 focus:ring-[#C9A84C]/20"
          />

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[#C9A84C] px-5 py-3 text-sm font-semibold text-[#0A0A0A] transition hover:bg-[#d4b55d] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Searching document..." : "Ask"}
          </button>
        </div>

        {error ? (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      {answer ? (
        <div className="mt-4 rounded-lg border border-white/10 bg-[#0E0E0E] p-4">
          <p
            className={`text-xs font-semibold uppercase tracking-wide ${
              fromDocument ? "text-emerald-300" : "text-amber-300"
            }`}
          >
            {fromDocument ? "From your document" : "AI-generated answer"}
          </p>

          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-200">
            {answer}
          </p>
        </div>
      ) : null}
    </section>
  );
}