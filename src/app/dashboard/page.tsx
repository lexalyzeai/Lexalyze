"use client";

import { Playfair_Display } from "next/font/google";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import DocumentUpload from "../components/DocumentUpload";
import AnalysisResult from "../components/AnalysisResult";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

type Language = "EN" | "HI";

type AnalysisRow = {
  id: string;
  filename: string;
  created_at: string;
  overall_confidence: string;
  result: any;
};

function ConfidenceDot({ confidence }: { confidence: string }) {
  const colors: Record<string, string> = {
    HIGH: "bg-emerald-400",
    MEDIUM: "bg-amber-400",
    LOW: "bg-rose-400",
  };

  return (
    <span
      className={`inline-block size-2 shrink-0 rounded-full ${
        colors[confidence] || colors.MEDIUM
      }`}
    />
  );
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export default function DashboardPage() {
  const [language, setLanguage] = useState<Language>("EN");
  const [email, setEmail] = useState("");
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [view, setView] = useState<"new" | "history">("new");
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const selectedAnalysis =
    analyses.find((a) => a.id === selectedAnalysisId) || null;

  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email || "");
    });

    fetchHistory();
  }, []);

  // Prevent body scroll when mobile nav is open
  useEffect(() => {
    if (isMobileNavOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileNavOpen]);

  // Touch event handlers for swipe detection
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touchEnd = e.changedTouches[0].clientX;
    const swipeDistance = touchStart - touchEnd;
    
    // Detect right-to-left swipe (positive distance)
    if (swipeDistance > 50) {
      setIsMobileNavOpen(false);
    }
    
    setTouchStart(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobileNavOpen || !touchStart) return;
    
    const currentX = e.targetTouches[0].clientX;
    const swipeDistance = touchStart - currentX;
    
    // If swiping right-to-left, follow the finger
    if (swipeDistance > 0 && drawerRef.current) {
      drawerRef.current.style.transform = `translateX(-${swipeDistance}px)`;
    }
  };

  async function fetchHistory() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return;

    const { data } = await supabase
      .from("analyses")
      .select("id, filename, created_at, overall_confidence, result")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    setAnalyses(data || []);
    setHistoryLoading(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0A0A0A]">

      {/* Mobile Hamburger Menu */}
      {!isMobileNavOpen && (
        <button
          type="button"
          onClick={() => setIsMobileNavOpen(true)}
          className="fixed top-4 left-4 z-50 flex size-10 items-center justify-center rounded-lg border border-white/10 bg-[#111111] text-neutral-400 transition hover:border-[#C9A84C]/40 hover:bg-white/[0.04] hover:text-[#C9A84C] md:hidden"
          aria-label="Open navigation"
        >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="size-5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 6h18M3 18h18" />
        </svg>
        </button>
      )}

      {/* Mobile Navigation Drawer */}
      <div
        ref={drawerRef}
        className={`fixed inset-0 z-40 h-screen overflow-y-auto md:hidden ${
          isMobileNavOpen 
            ? 'translate-x-0' 
            : '-translate-x-full'
        } transition-transform duration-300 ease-in-out`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60"
          onClick={() => setIsMobileNavOpen(false)}
        />
        
        {/* Drawer Content */}
        <aside className="absolute left-0 top-0 h-full w-[280px] max-w-[80vw] flex-col border-r border-white/[0.06] bg-[#111111]">
          
          {/* Close Button */}
          <div className="flex items-center justify-between px-5 pt-8 pb-4">
            <p
              className={`${playfair.className} text-[1.35rem] font-bold leading-tight tracking-[0.12em] text-[#C9A84C]`}
            >
              LEXALYZE
            </p>
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(false)}
              className="flex size-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-white/[0.04] hover:text-white"
              aria-label="Close navigation"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="size-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* New Analysis button */}
          <div className="px-3 pb-3">
            <button
              type="button"
              onClick={() => {
                setSelectedAnalysisId(Date.now().toString());
                setView("new");
                router.push("/dashboard");
                setIsMobileNavOpen(false);
              }}
              className="w-full rounded-lg bg-[#C9A84C] px-3 py-2.5 text-left text-sm font-semibold text-[#0A0A0A] transition hover:bg-[#d4b55d]"
            >
              + New Analysis
            </button>
          </div>

          <div className="px-4 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
              History
            </p>
          </div>

          {/* History list — scrollable */}
          <div
            className="hide-scrollbar flex-1 overflow-y-auto px-2"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {historyLoading ? (
              <div className="flex items-center gap-2 px-2 py-3 text-xs text-neutral-500">
                <span className="size-2.5 animate-spin rounded-full border border-neutral-600 border-t-[#C9A84C]" />
                Loading...
              </div>
            ) : analyses.length === 0 ? (
              <p className="px-3 py-3 text-xs text-neutral-600">
                No analyses yet. Upload your first document.
              </p>
            ) : (
              analyses.map((analysis) => (
                <button
                  key={analysis.id}
                  type="button"
                  title={analysis.result?.oneLineSummary?.replace(/^text=/i, '').trim() || analysis.filename}
                  onClick={() => {
                    setSelectedAnalysisId(analysis.id);
                    setView("history");
                    setIsMobileNavOpen(false);
                  }}
                  className={`group mb-0.5 flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition ${
                    selectedAnalysisId === analysis.id
                      ? "bg-white/[0.08] text-white"
                      : "text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200"
                  }`}
                >
                  <ConfidenceDot confidence={analysis.result?.overallConfidence ?? "MEDIUM"} />

                  <div className="min-w-0 flex-1">
                  <p 
    className="truncate text-xs font-medium leading-snug"
    title={analysis.result?.oneLineSummary || analysis.filename}
  >
    {analysis.result?.oneLineSummary || analysis.filename.replace(/\.[^/.]+$/, "")}
  </p>

                    <p className="mt-0.5 text-[10px] text-neutral-600">
                      {formatDate(analysis.created_at)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* User + sign out */}
          <div className="border-t border-white/[0.06] px-4 py-4">
            <p
              className="truncate text-xs text-neutral-500"
              title={email}
            >
              {email || "Loading..."}
            </p>

            <button
              type="button"
              onClick={handleSignOut}
              className="mt-2.5 w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm font-medium text-neutral-300 transition hover:border-[#C9A84C]/40 hover:bg-white/[0.04] hover:text-[#C9A84C]"
            >
              Sign out
            </button>
          </div>
        </aside>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex h-screen w-[260px] shrink-0 flex-col border-r border-white/[0.06] bg-[#111111]">

        {/* Logo */}
        <div className="px-5 pt-8 pb-4">
          <p
            className={`${playfair.className} text-[1.35rem] font-bold leading-tight tracking-[0.12em] text-[#C9A84C]`}
          >
            LEXALYZE
          </p>
        </div>

        {/* New Analysis button */}
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={() => {
              setSelectedAnalysisId(Date.now().toString());
              setView("new");
              router.push("/dashboard");
            }}
            className="w-full rounded-lg bg-[#C9A84C] px-3 py-2.5 text-left text-sm font-semibold text-[#0A0A0A] transition hover:bg-[#d4b55d]"
          >
            + New Analysis
          </button>
        </div>

        <div className="px-4 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
            History
          </p>
        </div>

        {/* History list — scrollable */}
        <div
          className="hide-scrollbar flex-1 overflow-y-auto px-2"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {historyLoading ? (
            <div className="flex items-center gap-2 px-2 py-3 text-xs text-neutral-500">
              <span className="size-2.5 animate-spin rounded-full border border-neutral-600 border-t-[#C9A84C]" />
              Loading...
            </div>
          ) : analyses.length === 0 ? (
            <p className="px-3 py-3 text-xs text-neutral-600">
              No analyses yet. Upload your first document.
            </p>
          ) : (
            analyses.map((analysis) => (
              <button
                key={analysis.id}
                type="button"
                title={analysis.result?.oneLineSummary?.replace(/^text=/i, '').trim() || analysis.filename}
                onClick={() => {
                  setSelectedAnalysisId(analysis.id);
                  setView("history");
                }}
                className={`group mb-0.5 flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition ${
                  selectedAnalysisId === analysis.id
                    ? "bg-white/[0.08] text-white"
                    : "text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200"
                }`}
              >
                <ConfidenceDot confidence={analysis.result?.overallConfidence ?? "MEDIUM"} />

                <div className="min-w-0 flex-1">
                <p 
  className="truncate text-xs font-medium leading-snug"
  title={analysis.result?.oneLineSummary || analysis.filename}
>
  {analysis.result?.oneLineSummary || analysis.filename.replace(/\.[^/.]+$/, "")}
</p>

                  <p className="mt-0.5 text-[10px] text-neutral-600">
                    {formatDate(analysis.created_at)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* User + sign out */}
        <div className="border-t border-white/[0.06] px-4 py-4">
          <p
            className="truncate text-xs text-neutral-500"
            title={email}
          >
            {email || "Loading..."}
          </p>

          <button
            type="button"
            onClick={handleSignOut}
            className="mt-2.5 w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm font-medium text-neutral-300 transition hover:border-[#C9A84C]/40 hover:bg-white/[0.04] hover:text-[#C9A84C]"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="flex min-h-full flex-col items-center justify-start pt-20 p-6 sm:pt-10 sm:p-10">

          {view === "new" && (
            <div className="w-full max-w-lg">

              <p className="mb-2 text-xs font-medium tracking-wide text-neutral-500">
                Analysis Language
              </p>

              <div className="mb-6 inline-flex rounded-full border border-white/10 bg-[#111111] p-1">

                <button
                  type="button"
                  onClick={() => setLanguage("EN")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    language === "EN"
                      ? "bg-[#C9A84C] text-[#0A0A0A]"
                      : "text-neutral-300 hover:bg-white/[0.06] hover:text-white"
                  }`}
                  aria-pressed={language === "EN"}
                >
                  EN
                </button>

                <button
                  type="button"
                  onClick={() => setLanguage("HI")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    language === "HI"
                      ? "bg-[#C9A84C] text-[#0A0A0A]"
                      : "text-neutral-300 hover:bg-white/[0.06] hover:text-white"
                  }`}
                  aria-pressed={language === "HI"}
                >
                  हिंदी
                </button>

              </div>

              <DocumentUpload
                key={selectedAnalysisId ?? "new"}
                language={language}
                onAnalysisComplete={fetchHistory}
              />

            </div>
          )}

          {view === "history" && selectedAnalysis && (
            <div className="w-full max-w-4xl">
              <AnalysisResult
  result={selectedAnalysis.result}
  analysisId={selectedAnalysis.id}
/>
            </div>
          )}

        </div>
      </main>

    </div>
  );
}