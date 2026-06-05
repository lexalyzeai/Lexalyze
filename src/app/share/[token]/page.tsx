import { notFound } from "next/navigation";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";
import AnalysisResult from "@/app/components/AnalysisResult";
import SharedFeedback from "@/app/components/SharedFeedback";
import BrandMark from "@/app/components/BrandMark";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });

export default async function SharedAnalysisPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[a-f0-9]{32}$/i.test(token)) notFound();

  const admin = createSupabaseAdmin();
  const { data: analysis, error } = await admin
    .from("analyses")
    .select("id, filename, result, language, checklist_state, created_at, share_enabled, share_mode")
    .eq("share_token", token)
    .eq("share_enabled", true)
    .maybeSingle();

  if (error) {
    console.error("Shared analysis lookup failed:", error);
    notFound();
  }

  if (!analysis) notFound();

  const { data: followUps } = await admin
    .from("followups")
    .select("question, answer")
    .eq("analysis_id", analysis.id)
    .order("created_at", { ascending: true });

  const { data: feedback } = await admin
    .from("share_feedback")
    .select("id, kind, author_name, body, suggested_text, created_at")
    .eq("analysis_id", analysis.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="mb-8 flex flex-col gap-4 border-b border-white/[0.06] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <BrandMark href="/" size="sm" subtitle="Shared report" />
            <h1 className={`${playfair.className} mt-2 text-2xl font-bold text-white`}>
              {analysis.result?.documentTitle || analysis.filename || "Document analysis"}
            </h1>
            <p className="mt-2 text-xs text-neutral-500">
              {analysis.share_mode === "edit"
                ? "Shared with comments and edit suggestions enabled."
                : analysis.share_mode === "comment"
                  ? "Shared with comments enabled."
                  : "View-only link. Sign in to analyse your own documents."}
            </p>
          </div>
          <Link
            href="/auth/signup"
            className="inline-flex rounded-full border border-[#C9A84C]/30 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#C9A84C] transition hover:border-[#C9A84C] hover:bg-[#C9A84C]/10"
          >
            Get started
          </Link>
        </div>

        <AnalysisResult
          result={analysis.result}
          plan="free"
          language={analysis.language || "en"}
          savedChecklist={analysis.checklist_state || analysis.result?.checkbox || []}
          savedFollowUps={followUps || []}
          readOnlyPublic
        />
        <SharedFeedback
          token={token}
          mode={analysis.share_mode || "view"}
          initialFeedback={feedback || []}
        />
      </div>
    </main>
  );
}
