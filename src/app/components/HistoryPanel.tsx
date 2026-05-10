"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type AnalysisRow = {
  id: string;
  filename: string;
  created_at: string;
  overall_confidence: string;
  result: any;
};

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
  const router = useRouter();

  useEffect(() => {
    async function fetchHistory() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from("analyses")
        .select("id, filename, created_at, overall_confidence, result")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      setAnalyses(data || []);
      setLoading(false);
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