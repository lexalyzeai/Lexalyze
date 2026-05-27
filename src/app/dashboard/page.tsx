"use client";

import { Playfair_Display } from "next/font/google";
import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  result: any;
  checkbox?: boolean[] | null;
  checklist_state?: boolean[] | null;
};

type FollowUpRow = {
  question: string;
  answer: string;
};

function ConfidenceDot({ confidence }: { confidence: string }) {
  const colors: Record<string, string> = {
    HIGH: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
    MEDIUM: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]",
    LOW: "bg-rose-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]",
  };
  return (
    <span className={`inline-block size-2 shrink-0 rounded-full ${colors[confidence] || colors.MEDIUM}`} />
  );
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// Fixed standard typography issues by ensuring title is sanitized
function cleanTitle(analysis: AnalysisRow) {
  return analysis.result?.oneLineSummary?.replace(/^text=/i, "").trim() || analysis.filename.replace(/\.[^/.]+$/, "");
}

function getLocalChecklist(analysisId: string) {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(`lexalyze-checklist:${analysisId}`);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function getSavedChecklist(analysis?: AnalysisRow | null): boolean[] {
  if (!analysis) return [];
  const localChecklist = getLocalChecklist(analysis.id);
  if (localChecklist) return localChecklist;
  if (Array.isArray(analysis.checkbox)) return analysis.checkbox;
  if (Array.isArray(analysis.checklist_state)) return analysis.checklist_state;
  if (Array.isArray(analysis.result?.checkbox)) return analysis.result.checkbox;
  if (Array.isArray(analysis.result?.checklistState)) return analysis.result.checklistState;
  return [];
}

function completionFor(analysis: AnalysisRow) {
  const total = analysis.result?.actionItems?.length ?? 0;
  const done = getSavedChecklist(analysis).filter(Boolean).length;
  return { done, total };
}

function riskTone(score?: number) {
  if (score === undefined || score === null) return "text-neutral-400";
  if (score >= 7) return "text-rose-400";
  if (score >= 4) return "text-amber-400";
  return "text-emerald-400";
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
  const [linkedBanner, setLinkedBanner] = useState(false);
  const [selectedFollowUps, setSelectedFollowUps] = useState<FollowUpRow[]>([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedSettingsTab, setSelectedSettingsTab] = useState<"general" | "billing" | "usage" | "security" | "deletion">("general");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<"history" | "account" | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [pinnedAnalysisIds, setPinnedAnalysisIds] = useState<string[]>([]);

  const selectedAnalysis = analyses.find((a) => a.id === selectedAnalysisId) || null;
  const totalActionItems = analyses.reduce((sum, analysis) => sum + (analysis.result?.actionItems?.length ?? 0), 0);
  const completedActionItems = analyses.reduce((sum, analysis) => sum + getSavedChecklist(analysis).filter(Boolean).length, 0);
  const highRiskCount = analyses.filter((analysis) => (analysis.result?.riskScore ?? 0) >= 7).length;
  const selectedCompletion = selectedAnalysis ? completionFor(selectedAnalysis) : null;

  const sortedAnalyses = [
    ...analyses.filter((analysis) => pinnedAnalysisIds.includes(analysis.id)),
    ...analyses.filter((analysis) => !pinnedAnalysisIds.includes(analysis.id)),
  ];

  const togglePin = (analysisId: string) => {
    setPinnedAnalysisIds((prev) =>
      prev.includes(analysisId)
        ? prev.filter((id) => id !== analysisId)
        : [...prev, analysisId]
    );
  };

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email || "");
    });
    fetchHistory();
  }, []);

  useEffect(() => {
    if (searchParams.get('linked') === 'true') {
      setLinkedBanner(true);
      router.replace('/dashboard');
      setTimeout(() => setLinkedBanner(false), 5000);
    }
  }, [searchParams, router]);

  useEffect(() => {
    document.body.style.overflow = isMobileNavOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileNavOpen]);

  // Load followups when selected analysis changes
  useEffect(() => {
    if (!selectedAnalysisId || view !== 'history') return;
    loadFollowUps(selectedAnalysisId);
  }, [selectedAnalysisId, view]);

  async function loadFollowUps(analysisId: string) {
    setFollowUpsLoading(true);
    const [followUpsResponse, analysisResponse] = await Promise.all([
      supabase
      .from('followups')
      .select('question, answer')
      .eq('analysis_id', analysisId)
        .order('created_at', { ascending: true }),
      supabase
        .from('analyses')
        .select('*')
        .eq('id', analysisId)
        .single(),
    ]);

    setSelectedFollowUps(followUpsResponse.data || []);
    if (analysisResponse.data) {
      setAnalyses((prev) =>
        prev.map((analysis) =>
          analysis.id === analysisId ? analysisResponse.data as AnalysisRow : analysis
        )
      );
    }
    setFollowUpsLoading(false);
  }

  async function handleChecklistChange(analysisId: string, newState: boolean[]) {
    const currentAnalysis = analyses.find((analysis) => analysis.id === analysisId);
    const nextResult = {
      ...(currentAnalysis?.result ?? {}),
      checkbox: newState,
      checklistState: newState,
    };

    setAnalyses((prev) =>
      prev.map((a) => a.id === analysisId ? { ...a, checkbox: newState, result: nextResult } : a)
    );

    const response = await fetch("/api/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysisId, checklist: newState }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      console.error("Checklist save failed:", data.error || response.statusText);
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId) {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-dropdown-trigger]') && !target.closest('[data-dropdown-menu]')) {
          setOpenDropdownId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  // Touch event handlers for swipe detection
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const swipeDistance = touchStart - e.changedTouches[0].clientX;
    if (swipeDistance > 50) setIsMobileNavOpen(false);
    setTouchStart(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobileNavOpen || !touchStart) return;
    const swipeDistance = touchStart - e.targetTouches[0].clientX;
    if (swipeDistance > 0 && drawerRef.current) {
      drawerRef.current.style.transform = `translateX(-${swipeDistance}px)`;
    }
  };

  async function fetchHistory() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data, error } = await supabase
      .from("analyses")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("History load failed:", error.message || error);
    }
    setAnalyses(data || []);
    setHistoryLoading(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  const renderSidebarContent = () => (
    <>
      <div className="px-4 pb-6 pt-2">
        <button
          type="button"
          onClick={() => {
            setSelectedAnalysisId(Date.now().toString());
            setView("new");
            setSelectedFollowUps([]);
            setFollowUpsLoading(false);
            router.push("/dashboard");
            setIsMobileNavOpen(false);
          }}
          className="group flex w-full items-center justify-between rounded-full bg-gradient-to-r from-[#C9A84C] to-[#aa8426] px-5 py-3.5 text-left text-xs font-bold tracking-wider text-[#0A0A0A] shadow-[0_4px_20px_rgba(201,168,76,0.15)] transition-all duration-300 hover:scale-[1.02] hover:from-[#d4b55d] hover:shadow-[0_6px_25px_rgba(201,168,76,0.25)] active:scale-[0.98]"
        >
          <span>NEW REVIEW</span>
          <span className="flex size-6 items-center justify-center rounded-full bg-black/10 text-sm leading-none font-bold transition group-hover:bg-black/15">+</span>
        </button>
      </div>

      <div className="flex items-center justify-between px-5 pb-3">
        <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-neutral-500">History</p>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.02] px-2.5 py-0.5 text-[10px] font-semibold text-neutral-400">{analyses.length}</span>
      </div>

      <div className="hide-scrollbar flex-1 overflow-y-auto px-3" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {historyLoading ? (
          <div className="flex items-center gap-2.5 px-3 py-4 text-xs text-neutral-500">
            <span className="size-3 animate-spin rounded-full border border-neutral-600 border-t-[#C9A84C]" />
            Loading index...
          </div>
        ) : analyses.length === 0 ? (
          <p className="px-4 py-4 text-xs leading-relaxed text-neutral-500">No analyses yet. Upload your first document to begin.</p>
        ) : (
          analyses.map((analysis) => (
            <button
              key={analysis.id}
              type="button"
              title={cleanTitle(analysis)}
              onClick={() => {
                setSelectedAnalysisId(analysis.id);
                setView("history");
                setSelectedFollowUps([]);
                setFollowUpsLoading(true);
                setIsMobileNavOpen(false);
              }}
              className={`group mb-2 flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all duration-300 ${
                selectedAnalysisId === analysis.id
                  ? "border-[#C9A84C]/35 bg-[#C9A84C]/10 text-white shadow-[0_4px_20px_rgba(201,168,76,0.05)]"
                  : "border-transparent text-neutral-400 hover:border-white/5 hover:bg-white/[0.03] hover:text-neutral-200"
              }`}
            >
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <ConfidenceDot confidence={analysis.result?.overallConfidence ?? "MEDIUM"} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold leading-snug tracking-wide group-hover:text-white transition duration-200">
                  {cleanTitle(analysis)}
                </p>
                <div className="mt-1 flex items-center gap-2 text-[10px] font-medium text-neutral-500">
                  <span>{formatDate(analysis.created_at)}</span>
                  <span className="h-1 w-1 rounded-full bg-neutral-600" />
                  {analysis.result?.riskScore !== undefined && (
                    <span className={riskTone(analysis.result.riskScore)}>Risk {analysis.result.riskScore}/10</span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="border-t border-white/[0.05] px-4 py-5">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-500">Account</p>
          <p className="mt-1.5 truncate text-xs font-semibold text-neutral-200" title={email}>{email || "Loading..."}</p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-3 w-full rounded-full border border-white/[0.08] bg-transparent py-2.5 text-xs font-semibold text-neutral-400 transition-all duration-300 hover:border-rose-500/30 hover:bg-rose-500/5 hover:text-rose-400"
        >
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#050507] text-white selection:bg-[#C9A84C]/25">

      {linkedBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-xs font-semibold text-emerald-300 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-4">
          <span>Your Google account has been linked successfully.</span>
          <button onClick={() => setLinkedBanner(false)} className="shrink-0 text-emerald-400 hover:text-emerald-200 font-bold">✕</button>
        </div>
      )}

      {!isMobileNavOpen && (
        <button
          type="button"
          onClick={() => setIsMobileNavOpen(true)}
          className="fixed top-4 left-4 z-40 flex size-11 items-center justify-center rounded-xl border border-white/[0.08] bg-[#0E0E12]/90 text-neutral-400 shadow-md transition-all duration-300 hover:border-[#C9A84C]/50 hover:bg-[#121216] hover:text-[#C9A84C] md:hidden"
          aria-label="Open navigation"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
      )}

      {/* Mobile drawer */}
      <div
        ref={drawerRef}
        className={`fixed inset-0 z-50 h-screen overflow-y-auto md:hidden ${isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsMobileNavOpen(false)} />
        <aside className="absolute left-0 top-0 h-full w-[280px] max-w-[80vw] flex flex-col border-r border-white/[0.06] bg-[#0B0C0E]">
          <div className="flex items-center justify-between px-5 pt-8 pb-5">
            <div>
              <p className={`${playfair.className} text-[1.25rem] font-bold leading-none tracking-[0.15em] text-[#C9A84C]`}>LEXALYZE</p>
              <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.25em] text-neutral-600">Workspace</p>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(false)}
              className="flex size-8 items-center justify-center rounded-full text-neutral-400 hover:bg-white/[0.04] hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {renderSidebarContent()}
        </aside>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-[280px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0A0A0C] md:flex">
        <div className="px-5 pt-8 pb-5">
          <p className={`${playfair.className} text-[1.35rem] font-bold leading-none tracking-[0.18em] text-[#C9A84C]`}>LEXALYZE</p>
          <p className="mt-1.5 text-[8px] font-bold uppercase tracking-[0.28em] text-neutral-500">Document intelligence</p>
        </div>
        {renderSidebarContent()}
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto bg-[linear-gradient(135deg,#050507_0%,#0A0A0C_48%,#0B0E0D_100%)]">
        
        {/* Subtle decorative mesh circles */}
        <div className="pointer-events-none absolute right-0 top-0 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(201,168,76,0.04)_0%,rgba(0,0,0,0)_70%)] blur-3xl" />

        <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-6 px-4 pb-12 pt-24 sm:px-8 sm:pt-8 lg:px-10">

          <header className="flex flex-col gap-5 border-b border-white/[0.06] pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C9A84C]">
                {view === "history" ? "Saved Review" : "Workspace Hub"}
              </p>
              <h1 className={`${playfair.className} mt-2.5 text-3xl font-bold leading-tight text-white sm:text-4xl`}>
                {view === "history" && selectedAnalysis ? cleanTitle(selectedAnalysis) : "Analyze legal contracts"}
              </h1>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-neutral-400 sm:text-sm">
                {view === "history" && selectedAnalysis
                  ? `${formatDate(selectedAnalysis.created_at)} · ${selectedAnalysis.result?.documentType || "Contract Document"}`
                  : "Review, flag risks, create action items, and query legal agreements in seconds."}
              </p>
            </div>

            {/* Metrics cards grid */}
            <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
              <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 min-w-[70px] shadow-sm">
                <p className="text-[8px] font-bold uppercase tracking-widest text-neutral-500">Reviews</p>
                <p className="mt-1.5 text-lg font-bold text-white">{analyses.length}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 min-w-[70px] shadow-sm border-l-rose-500/40">
                <p className="text-[8px] font-bold uppercase tracking-widest text-neutral-500">High risk</p>
                <p className="mt-1.5 text-lg font-bold text-rose-400">{highRiskCount}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 min-w-[70px] shadow-sm border-l-emerald-500/40">
                <p className="text-[8px] font-bold uppercase tracking-widest text-neutral-500">Actions</p>
                <p className="mt-1.5 text-lg font-bold text-emerald-400">{completedActionItems}/{totalActionItems || 0}</p>
              </div>
            </div>
          </header>

          {view === "new" && (
            <section className="grid flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              
              {/* Workspace Card */}
              <div className="rounded-3xl border border-white/[0.06] bg-[#0E0E12]/80 p-4 shadow-xl backdrop-blur-xl sm:p-6">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.05] pb-4">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#C9A84C]">Command Desk</span>
                    <h2 className="mt-1.5 text-lg font-bold text-white tracking-wide">Upload Contract Files</h2>
                  </div>

                  {/* Language switch pill */}
                  <div className="inline-flex w-fit rounded-full border border-white/[0.08] bg-[#060608] p-1 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setLanguage("EN")}
                      className={`rounded-full px-4.5 py-1.5 text-xs font-bold transition-all duration-300 ${language === "EN" ? "bg-gradient-to-r from-[#C9A84C] to-[#aa8426] text-black shadow-md" : "text-neutral-400 hover:text-white"}`}
                      aria-pressed={language === "EN"}
                    >
                      EN
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage("HI")}
                      className={`rounded-full px-4.5 py-1.5 text-xs font-bold transition-all duration-300 ${language === "HI" ? "bg-gradient-to-r from-[#C9A84C] to-[#aa8426] text-black shadow-md" : "text-neutral-400 hover:text-white"}`}
                      aria-pressed={language === "HI"}
                    >
                      हिंदी
                    </button>
                  </div>
                </div>

                <DocumentUpload
                  key={selectedAnalysisId ?? "new"}
                  language={language}
                  onAnalysisComplete={fetchHistory}
                />
              </div>

              {/* Sidebar stats widgets */}
              <aside className="space-y-5">
                <div className="rounded-3xl border border-white/[0.06] bg-[#0E0E12]/80 p-6 shadow-lg backdrop-blur-xl">
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-500">Portfolio health</span>
                  <div className="mt-5 space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-neutral-400">Action completion</span>
                        <span className="text-emerald-400">{completedActionItems}/{totalActionItems || 0}</span>
                      </div>
                      
                      {/* Premium linear track progress */}
                      <div className="mt-2.5 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                          style={{ width: `${totalActionItems ? Math.round((completedActionItems / totalActionItems) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3.5 pt-2">
                      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 shadow-sm">
                        <p className="text-[8px] font-bold uppercase tracking-widest text-neutral-500">Saved</p>
                        <p className="mt-2 text-2xl font-bold text-white">{analyses.length}</p>
                      </div>
                      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 shadow-sm border-l-rose-500/20">
                        <p className="text-[8px] font-bold uppercase tracking-widest text-neutral-500">Alerts</p>
                        <p className="mt-2 text-2xl font-bold text-rose-400">{highRiskCount}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/[0.06] bg-[#0E0E12]/80 p-6 shadow-lg backdrop-blur-xl">
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-500">Recent reviews</span>
                  <div className="mt-4 space-y-3">
                    {analyses.slice(0, 3).length === 0 ? (
                      <p className="text-xs leading-relaxed text-neutral-500">No saved analyses yet.</p>
                    ) : analyses.slice(0, 3).map((analysis) => (
                      <button
                        key={analysis.id}
                        type="button"
                        onClick={() => {
                          setSelectedAnalysisId(analysis.id);
                          setView("history");
                          setSelectedFollowUps([]);
                          setFollowUpsLoading(true);
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 text-left transition-all duration-300 hover:border-[#C9A84C]/35 hover:bg-white/[0.04]"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-bold leading-tight tracking-wide text-neutral-200">{cleanTitle(analysis)}</span>
                          <span className="mt-1 block text-[10px] font-medium text-neutral-500">{formatDate(analysis.created_at)}</span>
                        </span>
                        {analysis.result?.riskScore !== undefined && (
                          <span className={`shrink-0 text-xs font-bold leading-none ${riskTone(analysis.result.riskScore)}`}>{analysis.result.riskScore}/10</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </aside>
            </section>
          )}

          {view === "history" && selectedAnalysis && (
            <section className="space-y-6">
              <div className="flex flex-col gap-4 rounded-3xl border border-white/[0.06] bg-[#0E0E12]/80 p-4 shadow-xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-6 py-4.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-[11px] font-bold tracking-wide ${riskTone(selectedAnalysis.result?.riskScore)}`}>
                    Risk {selectedAnalysis.result?.riskScore ?? "-"}/10
                  </span>
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-[11px] font-bold tracking-wide text-neutral-300">
                    Confidence {selectedAnalysis.result?.overallConfidence ?? "MEDIUM"}
                  </span>
                  {selectedCompletion && selectedCompletion.total > 0 && (
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1 text-[11px] font-bold tracking-wide text-emerald-300 shadow-sm">
                      {selectedCompletion.done}/{selectedCompletion.total} actions complete
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-neutral-500">PDF export is available at the top right of the report.</p>
              </div>
              {followUpsLoading ? (
                <div className="flex items-center gap-3 rounded-3xl border border-white/[0.06] bg-[#0E0E12]/80 p-6 text-sm text-neutral-500 shadow-xl backdrop-blur-xl">
                  <span className="size-3.5 animate-spin rounded-full border-2 border-neutral-600 border-t-[#C9A84C]" />
                  Compiling follow-up logs...
                </div>
              ) : (
                <AnalysisResult
                  key={selectedAnalysis.id}
                  result={selectedAnalysis.result}
                  analysisId={selectedAnalysis.id}
                  savedFollowUps={selectedFollowUps}
                  savedChecklist={getSavedChecklist(selectedAnalysis)}
                  onChecklistChange={(newState) => handleChecklistChange(selectedAnalysis.id, newState)}
                />
              )}
            </section>
          )}

        </div>
      </main>

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsSettingsModalOpen(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="relative w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#111111] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2
                  className={`${playfair.className} text-2xl font-bold text-[#C9A84C]`}
                >
                  Settings
                </h2>
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="flex size-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-white/[0.04] hover:text-white"
                  aria-label="Close settings"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="size-5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Tabs navigation */}
              <div className="flex gap-2 mb-6 border-b border-white/[0.06] pb-4">
                <button
                  type="button"
                  onClick={() => setSelectedSettingsTab("general")}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    selectedSettingsTab === "general"
                      ? "text-[#C9A84C]"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  General
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSettingsTab("billing")}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    selectedSettingsTab === "billing"
                      ? "text-[#C9A84C]"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  Billing
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSettingsTab("usage")}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    selectedSettingsTab === "usage"
                      ? "text-[#C9A84C]"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  Usage
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSettingsTab("security")}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    selectedSettingsTab === "security"
                      ? "text-[#C9A84C]"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  Security
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSettingsTab("deletion")}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    selectedSettingsTab === "deletion"
                      ? "text-[#C9A84C]"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  Deletion
                </button>
              </div>

              {/* Tab content */}
              {selectedSettingsTab === "general" ? (
                <div className="space-y-4">
                  {/* Email address */}
                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2">
                      Email Address
                    </p>
                    <p className="text-sm text-white">
                      {email || "Loading..."}
                    </p>
                  </div>

                  {/* Sign out */}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full rounded-lg border border-white/10 bg-transparent px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:border-[#C9A84C]/40 hover:bg-white/[0.04] hover:text-[#C9A84C]"
                  >
                    Sign out
                  </button>

                  {/* Delete Account */}
                  <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400 mb-2">
                      Delete Account
                    </p>
                    <p className="text-sm text-neutral-400 mb-4">
                      This action is permanent and cannot be undone.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirmation("account")}
                      className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                    >
                      Delete my account
                    </button>
                  </div>
                </div>
              ) : selectedSettingsTab === "billing" ? (
                <div className="space-y-4">
                  {/* Current Plan */}
                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2">
                      Current Plan
                    </p>
                    <p className="text-sm font-medium text-white">
                      Free Plan
                    </p>
                  </div>

                  {/* Usage This Month */}
                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2">
                      Usage This Month
                    </p>
                    <p className="text-sm text-neutral-300 mb-3">
                      Documents analyzed: 3 / 10
                    </p>
                    <div className="h-2 w-full rounded-full bg-white/[0.08] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#C9A84C] transition-all"
                        style={{ width: "30%" }}
                      />
                    </div>
                  </div>

                  {/* Upgrade Plan */}
                  <button
                    type="button"
                    className="w-full rounded-lg bg-[#C9A84C] px-4 py-2.5 text-sm font-semibold text-[#0A0A0A] transition hover:bg-[#d4b55d]"
                  >
                    Upgrade to Pro
                  </button>

                  {/* Billing History */}
                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2">
                      Billing History
                    </p>
                    <p className="text-sm text-neutral-400">
                      No invoices yet
                    </p>
                  </div>

                  {/* Manage Subscription */}
                  <button
                    type="button"
                    className="w-full rounded-lg border border-white/10 bg-transparent px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:border-[#C9A84C]/40 hover:bg-white/[0.04] hover:text-[#C9A84C]"
                  >
                    Manage Subscription
                  </button>
                </div>
              ) : selectedSettingsTab === "usage" ? (
                <div className="space-y-4">
                  {/* Documents analyzed */}
                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2">
                      Documents Analyzed
                    </p>
                    <p className="text-2xl font-bold text-[#C9A84C]">
                      12
                    </p>
                  </div>

                  {/* Follow-up questions asked */}
                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2">
                      Follow-up Questions Asked
                    </p>
                    <p className="text-2xl font-bold text-[#C9A84C]">
                      31
                    </p>
                  </div>

                  {/* Average analysis time */}
                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2">
                      Average Analysis Time
                    </p>
                    <p className="text-2xl font-bold text-[#C9A84C]">
                      42 sec
                    </p>
                  </div>

                  {/* Last analysis date */}
                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2">
                      Last Analysis Date
                    </p>
                    <p className="text-2xl font-bold text-[#C9A84C]">
                      13 May 2026
                    </p>
                  </div>

                  {/* Storage used */}
                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2">
                      Storage Used
                    </p>
                    <p className="text-2xl font-bold text-[#C9A84C]">
                      18 MB
                    </p>
                  </div>
                </div>
              ) : selectedSettingsTab === "security" ? (
                <div className="space-y-4">
                  {/* Change Password */}
                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2">
                      Change Password
                    </p>
                    <button
                      type="button"
                      className="w-full rounded-lg border border-white/10 bg-transparent px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:border-[#C9A84C]/40 hover:bg-white/[0.04] hover:text-[#C9A84C]"
                    >
                      Change password
                    </button>
                  </div>

                  {/* Reset Password */}
                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2">
                      Reset Password
                    </p>
                    <button
                      type="button"
                      className="w-full rounded-lg border border-white/10 bg-transparent px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:border-[#C9A84C]/40 hover:bg-white/[0.04] hover:text-[#C9A84C]"
                    >
                      Send password reset email
                    </button>
                  </div>

                  {/* Active Session */}
                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2">
                      Active Session
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-neutral-400">
                          Current device:
                        </p>
                        <p className="text-sm text-white">
                          Chrome on Windows
                        </p>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-neutral-400">
                          Status:
                        </p>
                        <p className="text-sm text-[#C9A84C]">
                          Active now
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Sign Out All Devices */}
                  <button
                    type="button"
                    className="w-full rounded-lg border border-white/10 bg-transparent px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:border-[#C9A84C]/40 hover:bg-white/[0.04] hover:text-[#C9A84C]"
                  >
                    Sign out all devices
                  </button>

                  {/* Security Notice */}
                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2">
                      Security Notice
                    </p>
                    <p className="text-sm text-neutral-400 leading-relaxed">
                      Your documents are encrypted in transit and deleted after analysis. Lexalyze is designed with privacy and confidentiality in mind.
                    </p>
                  </div>
                </div>
              ) : selectedSettingsTab === "deletion" ? (
                <div className="space-y-4">
                  {/* Delete Analysis History */}
                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2">
                      Delete Analysis History
                    </p>
                    <p className="text-sm text-neutral-400 mb-4">
                      Permanently remove all saved analysis results from your account.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirmation("history")}
                      className="w-full rounded-lg border border-white/10 bg-transparent px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
                    >
                      Delete all saved analyses
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Delete Confirmation Modal */}
              {showDeleteConfirmation && (
                <>
                  <div
                    className="absolute inset-0 rounded-2xl bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowDeleteConfirmation(null)}
                  />
                  <div className="absolute inset-4 flex items-center justify-center">
                    <div
                      className="w-full max-w-sm rounded-xl border border-white/[0.08] bg-[#111111] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Confirm Deletion
                      </h3>
                      <p className="text-sm text-neutral-400 mb-6">
                        {showDeleteConfirmation === "account"
                          ? "Are you sure you want to delete your account? This action cannot be undone."
                          : "Are you sure you want to delete all analysis history? This action cannot be undone."}
                      </p>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirmation(null)}
                          className="flex-1 rounded-lg border border-white/10 bg-transparent px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowDeleteConfirmation(null);
                          }}
                          className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
