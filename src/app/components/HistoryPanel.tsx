"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import type { AnalysisResultData } from "@/app/components/AnalysisResult";

type AnalysisRow = {
  id: string;
  filename: string;
  created_at: string;
  overall_confidence: string;
  result: Pick<AnalysisResultData, "oneLineSummary"> | null;
};

const HISTORY_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: PromiseLike<T>, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(message)), HISTORY_TIMEOUT_MS);
    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const styles: Record<string, string> = {
    HIGH: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
    MEDIUM: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
    LOW: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[confidence] || styles.MEDIUM}`}>
      {confidence}
    </span>
  );
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function HistoryPanel() {
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function fetchHistory() {
      try {
        const { data: { session } } = await withTimeout(supabase.auth.getSession(), "Your session is taking too long to load.");
        if (!session) {
          setAnalyses([]);
          return;
        }

        const { data, error: historyError } = await withTimeout(
          supabase
            .from("analyses")
            .select("id, filename, created_at, overall_confidence, result")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false }),
          "History is taking too long to load."
        );

        if (historyError) throw historyError;
        setAnalyses(data || []);
      } catch (historyError) {
        console.error("History load failed:", historyError);
        setError(historyError instanceof Error ? historyError.message : "History could not be loaded. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-400 py-10">
        <span className="size-3 animate-spin rounded-full border-2 border-neutral-600 border-t-[#C9A84C]" />
        Loading history...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-6 text-sm text-rose-100">
        {error} Refresh the page to retry.
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#111111] p-10 text-center">
        <p className="text-neutral-400">No analyses yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-white mb-4">Analysis History</h2>
      {analyses.map((analysis) => (
        <button
          key={analysis.id}
          type="button"
          onClick={() => router.push(`/dashboard/analysis/${analysis.id}`)}
          className="w-full text-left rounded-xl border border-white/10 bg-[#111111] p-5 transition hover:border-[#C9A84C]/40 hover:bg-[#161616]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-white">{analysis.filename}</p>
              <p className="mt-1 text-sm text-neutral-400">
                {analysis.result?.oneLineSummary || "No summary available"}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <ConfidenceBadge confidence={analysis.overall_confidence} />
              <span className="text-xs text-neutral-500">
                {formatDate(analysis.created_at)}
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
