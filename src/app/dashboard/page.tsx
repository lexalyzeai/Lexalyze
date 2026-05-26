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
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedSettingsTab, setSelectedSettingsTab] = useState<"general" | "billing" | "usage" | "security" | "deletion">("general");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<"history" | "account" | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [pinnedAnalysisIds, setPinnedAnalysisIds] = useState<string[]>([]);

  const selectedAnalysis =
    analyses.find((a) => a.id === selectedAnalysisId) || null;

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
              sortedAnalyses.map((analysis) => {
                const isPinned = pinnedAnalysisIds.includes(analysis.id);

                return (
                  <div key={analysis.id} className="relative group mb-0.5">
                    <button
                      type="button"
                      title={analysis.result?.oneLineSummary?.replace(/^text=/i, '').trim() || analysis.filename}
                      onClick={() => {
                        setSelectedAnalysisId(analysis.id);
                        setView("history");
                        setIsMobileNavOpen(false);
                      }}
                      className={`flex w-full items-start gap-2.5 rounded-lg px-3 pr-10 py-2.5 text-left transition ${
                        selectedAnalysisId === analysis.id
                          ? "bg-white/[0.08] text-white"
                          : "text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200"
                      }`}
                    >
                      <ConfidenceDot confidence={analysis.result?.overallConfidence ?? "MEDIUM"} />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          {isPinned && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="size-3 text-[#C9A84C]"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 3.75a.75.75 0 01.75.75v2.516c0 .214.082.42.23.57l1.973 1.973a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06 0l-1.973-1.973a.75.75 0 01-.23-.57V8.25a.75.75 0 01.75-.75h2.516a.75.75 0 00.53-.22l1.317-1.317a.75.75 0 011.06 0l1.317 1.317c.14.14.33.22.53.22z" />
                            </svg>
                          )}
                          <p
                            className="truncate text-xs font-medium leading-snug"
                            title={analysis.result?.oneLineSummary || analysis.filename}
                          >
                            {analysis.result?.oneLineSummary || analysis.filename.replace(/\.[^/.]+$/, "")}
                          </p>
                        </div>

                        <p className="mt-0.5 text-[10px] text-neutral-600">
                          {formatDate(analysis.created_at)}
                        </p>
                      </div>
                    </button>

                  <button
                    type="button"
                    data-dropdown-trigger
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex shrink-0 items-center justify-center rounded p-1 text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200"
                    aria-label="More options"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdownId(openDropdownId === analysis.id ? null : analysis.id);
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="size-4"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {openDropdownId === analysis.id && (
                    <div
                      data-dropdown-menu
                      className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border border-white/[0.08] bg-[#1A1A1A] shadow-xl animate-in fade-in zoom-in-95 duration-150"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          togglePin(analysis.id);
                          setOpenDropdownId(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-neutral-300 transition hover:bg-white/[0.06] hover:text-[#C9A84C]"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="size-3.5"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75V16.5L12 21l-4.5-4.5V3.75m9 0H18a2.25 2.25 0 012.25 2.25v6.75A2.25 2.25 0 0118 12.75h-.75m-9 0H9a2.25 2.25 0 00-2.25 2.25v6.75A2.25 2.25 0 009 12.75h.75m-9 0H3.375c-.621 0-1.125.504-1.125 1.125v3.75c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.75c0-.621-.504-1.125-1.125-1.125H18" />
                        </svg>
                        {isPinned ? "Unpin analysis" : "Pin analysis"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          console.log('Delete analysis:', analysis.id);
                          setOpenDropdownId(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-neutral-300 transition hover:bg-white/[0.06] hover:text-red-400"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="size-3.5"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                        Delete analysis
                      </button>
                    </div>
                  )}
                </div>
              )})
            )}
          </div>

          {/* User + sign out */}
          <div className="border-t border-white/[0.06] px-4 py-4">
            <div className="flex items-center justify-between gap-2">
              <p
                className="truncate text-xs text-neutral-500"
                title={email}
              >
                {email || "Loading..."}
              </p>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(true)}
                className="flex shrink-0 items-center justify-center rounded-md p-1.5 text-neutral-400 transition hover:bg-white/[0.04] hover:text-[#C9A84C]"
                aria-label="Settings"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="size-4"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.212 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>

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
              sortedAnalyses.map((analysis) => {
                const isPinned = pinnedAnalysisIds.includes(analysis.id);

                return (
                  <div key={analysis.id} className="relative group mb-0.5">
                    <button
                      type="button"
                      title={analysis.result?.oneLineSummary?.replace(/^text=/i, '').trim() || analysis.filename}
                      onClick={() => {
                        setSelectedAnalysisId(analysis.id);
                        setView("history");
                      }}
                      className={`flex w-full items-start gap-2.5 rounded-lg px-3 pr-10 py-2.5 text-left transition ${
                        selectedAnalysisId === analysis.id
                          ? "bg-white/[0.08] text-white"
                          : "text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200"
                      }`}
                    >
                      <ConfidenceDot confidence={analysis.result?.overallConfidence ?? "MEDIUM"} />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          {isPinned && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="size-3 text-[#C9A84C]"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 3.75a.75.75 0 01.75.75v2.516c0 .214.082.42.23.57l1.973 1.973a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06 0l-1.973-1.973a.75.75 0 01-.23-.57V8.25a.75.75 0 01.75-.75h2.516a.75.75 0 00.53-.22l1.317-1.317a.75.75 0 011.06 0l1.317 1.317c.14.14.33.22.53.22z" />
                            </svg>
                          )}
                          <p
                            className="truncate text-xs font-medium leading-snug"
                            title={analysis.result?.oneLineSummary || analysis.filename}
                          >
                            {analysis.result?.oneLineSummary || analysis.filename.replace(/\.[^/.]+$/, "")}
                          </p>
                        </div>

                        <p className="mt-0.5 text-[10px] text-neutral-600">
                          {formatDate(analysis.created_at)}
                        </p>
                      </div>
                    </button>
                <button
                  type="button"
                  data-dropdown-trigger
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex shrink-0 items-center justify-center rounded p-1 text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200"
                  aria-label="More options"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdownId(openDropdownId === analysis.id ? null : analysis.id);
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="size-4"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {openDropdownId === analysis.id && (
                  <div
                    data-dropdown-menu
                    className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border border-white/[0.08] bg-[#1A1A1A] shadow-xl animate-in fade-in zoom-in-95 duration-150"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        togglePin(analysis.id);
                        setOpenDropdownId(null);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-neutral-300 transition hover:bg-white/[0.06] hover:text-[#C9A84C]"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-3.5"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75V16.5L12 21l-4.5-4.5V3.75m9 0H18a2.25 2.25 0 012.25 2.25v6.75A2.25 2.25 0 0118 12.75h-.75m-9 0H9a2.25 2.25 0 00-2.25 2.25v6.75A2.25 2.25 0 009 12.75h.75m-9 0H3.375c-.621 0-1.125.504-1.125 1.125v3.75c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.75c0-.621-.504-1.125-1.125-1.125H18" />
                      </svg>
                      {isPinned ? "Unpin analysis" : "Pin analysis"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        console.log('Delete analysis:', analysis.id);
                        setOpenDropdownId(null);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-neutral-300 transition hover:bg-white/[0.06] hover:text-red-400"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-3.5"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                      Delete analysis
                    </button>
                  </div>
                )}
              </div>
            );
          })
        </div>

        {/* User + sign out */}
        <div className="border-t border-white/[0.06] px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <p
              className="truncate text-xs text-neutral-500"
              title={email}
            >
              {email || "Loading..."}
            </p>
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="flex shrink-0 items-center justify-center rounded-md p-1.5 text-neutral-400 transition hover:bg-white/[0.04] hover:text-[#C9A84C]"
              aria-label="Settings"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="size-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.212 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

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
        <div className={`flex min-h-full flex-col items-center justify-start pt-20 p-6 sm:pt-10 sm:p-10 ${isSettingsModalOpen ? 'blur-sm' : ''}`}>

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