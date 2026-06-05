"use client";

import { Playfair_Display } from "next/font/google";
import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { currentUsageMonth, normalizePlan, PLAN_CATALOG, PLAN_LIMITS } from "@/lib/plans";
import { readApiError, toUserMessage } from "@/lib/error-handling";
import { getAuthRedirectUrl } from "@/lib/site-url";
import DocumentUpload from "../components/DocumentUpload";
import AnalysisResult, { type AnalysisResultData } from "../components/AnalysisResult";
import ErrorMessage from "../components/ErrorMessage";
import BrandMark from "../components/BrandMark";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

type Language = "EN" | "HI";

type AnalysisRow = {
  id: string;
  filename: string;
  created_at: string;
  workspace_id?: string | null;
  language?: string | null;
  result: (AnalysisResultData & { checkbox?: boolean[]; checklistState?: boolean[] }) | null;
  checkbox?: boolean[] | null;
  checklist_state?: boolean[] | null;
};

type FollowUpRow = {
  question: string;
  answer: string;
};

type ProfileUsage = {
  plan?: string | null;
  usage_month?: string | null;
  monthly_analyses_used?: number | null;
};

type ActiveSession = {
  id: string;
  device_id: string;
  device_name?: string | null;
  browser_name?: string | null;
  os_name?: string | null;
  created_at?: string | null;
  last_seen?: string | null;
  isCurrent?: boolean;
};

type TeamMember = {
  id: string;
  email: string;
  role: "owner" | "admin" | "member" | "viewer";
  status: "active" | "invited";
  created_at?: string | null;
};

type TeamWorkspace = {
  id: string;
  name: string;
};

const DASHBOARD_TIMEOUT_MS = 8000;
const authLoadError = "Your account details are taking too long to load. This is a Supabase connection delay, not the page itself. Refresh or try again in a moment.";
const historyLoadError = "History is taking too long to load. Refresh or try again in a moment.";

function withTimeout<T>(promise: PromiseLike<T>, message: string, timeoutMs = DASHBOARD_TIMEOUT_MS) {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(message)), timeoutMs);
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

function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, message = "Request timed out. Please try again.") {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), DASHBOARD_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => window.clearTimeout(timeout)).catch((error) => {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(message);
    }
    throw error;
  });
}

async function getSessionSafely() {
  const { data: { session } } = await withTimeout(supabase.auth.getSession(), authLoadError, 6000);
  return session;
}

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
function getDeviceId() {
  if (typeof window === "undefined") return "";
  const key = "lexalyze-device-id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const next = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(key, next);
  return next;
}

function detectDevice() {
  if (typeof navigator === "undefined") {
    return { deviceName: "Unknown device", browserName: "Unknown browser", osName: "Unknown OS" };
  }

  const ua = navigator.userAgent;
  const browserName = ua.includes("Edg/")
    ? "Microsoft Edge"
    : ua.includes("Chrome/")
      ? "Chrome"
      : ua.includes("Firefox/")
        ? "Firefox"
        : ua.includes("Safari/")
          ? "Safari"
          : "Browser";
  const osName = ua.includes("Windows")
    ? "Windows"
    : ua.includes("Mac OS")
      ? "macOS"
      : ua.includes("Android")
        ? "Android"
        : ua.includes("iPhone") || ua.includes("iPad")
          ? "iOS"
          : "Unknown OS";
  const deviceName = `${browserName} on ${osName}`;

  return { deviceName, browserName, osName };
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
  const [selectedSettingsTab, setSelectedSettingsTab] = useState<"general" | "billing" | "usage" | "team" | "security" | "deletion">("general");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<"history" | "account" | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [pinnedAnalysisIds, setPinnedAnalysisIds] = useState<string[]>([]);
  const [isPasswordResetLoading, setIsPasswordResetLoading] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [isSigningOutAll, setIsSigningOutAll] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingHistory, setIsDeletingHistory] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [profileUsage, setProfileUsage] = useState<ProfileUsage | null>(null);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const settingsMessageRef = useRef<HTMLDivElement | null>(null);
  const [dashboardMsg, setDashboardMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamSeatLimit, setTeamSeatLimit] = useState(3);
  const [hasTeamWorkspace, setHasTeamWorkspace] = useState(false);
  const [canManageTeam, setCanManageTeam] = useState(false);
  const [currentTeamRole, setCurrentTeamRole] = useState<TeamMember["role"] | "">("");
  const [teamLoading, setTeamLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member");
  const [activeWorkspace, setActiveWorkspace] = useState<"personal" | "team">("personal");
  const [teamWorkspace, setTeamWorkspace] = useState<TeamWorkspace | null>(null);

  const selectedAnalysis = analyses.find((a) => a.id === selectedAnalysisId) || null;
  const totalActionItems = analyses.reduce((sum, analysis) => sum + (analysis.result?.actionItems?.length ?? 0), 0);
  const completedActionItems = analyses.reduce((sum, analysis) => sum + getSavedChecklist(analysis).filter(Boolean).length, 0);
  const highRiskCount = analyses.filter((analysis) => (analysis.result?.riskScore ?? 0) >= 7).length;
  const selectedCompletion = selectedAnalysis ? completionFor(selectedAnalysis) : null;
  const plan = normalizePlan(profileUsage?.plan);
  const canOpenTeamSettings = plan === "team" || hasTeamWorkspace;
  const isTeamActive = activeWorkspace === "team" && Boolean(teamWorkspace);
  const activeWorkspaceId = isTeamActive ? teamWorkspace?.id ?? null : null;
  const effectivePlan = isTeamActive ? "team" : plan;
  const monthlyLimit = PLAN_LIMITS[effectivePlan].monthlyDocuments;
  const docsThisMonth = profileUsage?.usage_month === currentUsageMonth() ? profileUsage?.monthly_analyses_used ?? 0 : 0;
  const remainingDocs = monthlyLimit === null ? null : Math.max(0, monthlyLimit - docsThisMonth);
  const currentPlanDetails = PLAN_CATALOG[effectivePlan];

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

  function switchWorkspace(nextWorkspace: "personal" | "team") {
    if (nextWorkspace === "team" && !teamWorkspace) return;
    setActiveWorkspace(nextWorkspace);
    setSelectedAnalysisId(null);
    setSelectedFollowUps([]);
    setView("new");
    setOpenDropdownId(null);
  }

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!settingsMsg) return;
    settingsMessageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [settingsMsg]);

  useEffect(() => {
    getSessionSafely()
      .then((session) => {
        setEmail(session?.user?.email || "");
        if (session) {
          registerCurrentSession();
        }
      })
      .catch((error) => {
        console.error("Session load failed:", error);
        setEmail("Unable to load");
        setDashboardMsg({ type: "error", text: authLoadError });
      });
    fetchHistory();
    fetchProfileUsage();
    fetchTeamWorkspace(true);
    // Session registration should run once when the dashboard mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchParams.get('linked') === 'true') {
      const timer = setTimeout(() => {
        setLinkedBanner(true);
        router.replace('/dashboard');
        setTimeout(() => setLinkedBanner(false), 5000);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (activeWorkspace === "team" && !teamWorkspace) return;
    void Promise.resolve().then(() => {
      fetchHistory(activeWorkspace === "team" ? teamWorkspace?.id ?? null : null);
    });
    // Fetch history when the active workspace changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace, teamWorkspace?.id]);

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
    try {
      const [followUpsResponse, analysisResponse] = await Promise.all([
        withTimeout(
          supabase
          .from('followups')
          .select('question, answer')
          .eq('analysis_id', analysisId)
            .order('created_at', { ascending: true }),
          "Follow-up messages are taking too long to load. Please try again."
        ),
        withTimeout(
          supabase
            .from('analyses')
            .select('*')
            .eq('id', analysisId)
            .single(),
          "This analysis is taking too long to load. Please try again."
        ),
      ]);

      setSelectedFollowUps(followUpsResponse.data || []);
      if (analysisResponse.data) {
        setAnalyses((prev) =>
          prev.map((analysis) =>
            analysis.id === analysisId ? analysisResponse.data as AnalysisRow : analysis
          )
        );
      }
    } catch (error) {
      console.error("Analysis detail load failed:", error);
      setDashboardMsg({ type: "error", text: error instanceof Error ? error.message : "This analysis could not be loaded. Please try again." });
    } finally {
      setFollowUpsLoading(false);
    }
  }

  async function handleChecklistChange(analysisId: string, newState: boolean[]) {
    const currentAnalysis = analyses.find((analysis) => analysis.id === analysisId);
    if (!currentAnalysis?.result) return;

    const nextResult = {
      ...currentAnalysis.result,
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
      setDashboardMsg({ type: "error", text: "Checklist saved locally, but could not sync yet." });
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

  async function cleanupPlanRetention(workspaceId?: string | null) {
    if (workspaceId) return true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), DASHBOARD_TIMEOUT_MS);
    try {
      const response = await fetch("/api/retention", { method: "POST", cache: "no-store", signal: controller.signal });
      if (!response.ok && response.status !== 401) {
        console.error("Plan retention cleanup failed", await response.text().catch(() => ""));
        return false;
      }
      return true;
    } catch (error) {
      console.error("Plan retention cleanup failed", error);
      return false;
    } finally {
      window.clearTimeout(timeout);
    }
  }
  async function fetchHistory(workspaceId = activeWorkspaceId) {
    setHistoryLoading(true);
    try {
      const session = await getSessionSafely();
      if (!session) {
        setAnalyses([]);
        return;
      }

      const cleanupOk = await cleanupPlanRetention(workspaceId);
      const response = await fetchWithTimeout(
        `/api/history${workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ""}`,
        { cache: "no-store" },
        historyLoadError
      );

      if (!response.ok) {
        const apiError = await readApiError(response, "load_failed");
        console.error("History load failed:", apiError.message);
        setDashboardMsg({ type: "error", text: apiError.message });
      } else if (!cleanupOk) {
        setDashboardMsg({ type: "error", text: "Older history could not be cleaned up yet. Refresh and try again before uploading more documents." });
      }
      const payload = await response.json().catch(() => ({ analyses: [] }));
      const nextAnalyses = Array.isArray(payload.analyses) ? payload.analyses : [];
      setAnalyses(nextAnalyses);
      if (selectedAnalysisId && !nextAnalyses.some((analysis: AnalysisRow) => analysis.id === selectedAnalysisId)) {
        setSelectedAnalysisId(null);
        setSelectedFollowUps([]);
      }
    } catch (error) {
      console.error("History load failed:", error);
      setDashboardMsg({ type: "error", text: error instanceof Error ? error.message : historyLoadError });
    } finally {
      setHistoryLoading(false);
    }
  }

  async function fetchProfileUsage() {
    try {
      const session = await getSessionSafely();
      if (!session) return;

      const { data, error } = await withTimeout(
        supabase
          .from("profiles")
          .select("plan, usage_month, monthly_analyses_used")
          .eq("id", session.user.id)
          .maybeSingle(),
        "Plan and usage details are taking too long to load. Refresh to try again."
      );

      if (error) {
        console.error("Profile usage load failed:", error.message || error);
        setDashboardMsg({ type: "error", text: "Plan and usage details could not be loaded. Refresh to try again." });
        return;
      }

      setProfileUsage(data || { plan: "free", usage_month: currentUsageMonth(), monthly_analyses_used: 0 });
    } catch (error) {
      console.error("Profile usage load failed:", error);
      setDashboardMsg({ type: "error", text: error instanceof Error ? error.message : "Plan and usage details could not be loaded. Refresh to try again." });
    }
  }

  async function fetchActiveSessions(currentDeviceId = getDeviceId()) {
    setSessionsLoading(true);
    try {
      const response = await fetchWithTimeout("/api/sessions", { cache: "no-store" }, "Active sessions are taking too long to load. Please try again.");
      if (!response.ok) {
        const apiError = await readApiError(response, "load_failed");
        setSettingsMsg({ type: "error", text: apiError.message });
        return;
      }

      const data = await response.json().catch(() => ({ sessions: [] }));
      const sessions = Array.isArray(data.sessions) ? data.sessions : [];
      setActiveSessions(
        sessions.map((session: ActiveSession) => ({
          ...session,
          isCurrent: session.device_id === currentDeviceId,
        }))
      );
    } finally {
      setSessionsLoading(false);
    }
  }

  async function registerCurrentSession() {
    const deviceId = getDeviceId();
    const device = detectDevice();
    try {
      const response = await fetchWithTimeout("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, ...device }),
      }, "Current session registration took too long.");

      if (!response.ok) {
        console.error("Could not register active session", await response.text().catch(() => ""));
        return;
      }

      await fetchActiveSessions(deviceId);
    } catch (error) {
      console.error("Could not register active session", error);
    }
  }

  function clearLocalSessionState() {
    if (typeof window === "undefined") return;
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith("sb-") || key.startsWith("lexalyze-checklist:"))
      .forEach((key) => window.localStorage.removeItem(key));
    window.sessionStorage.clear();
  }

  async function handleSignOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    await fetchWithTimeout("/api/sessions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: getDeviceId() }),
    }, "Sign out is taking too long. Continuing locally.").catch(() => null);
    try {
      const { error } = await withTimeout(supabase.auth.signOut({ scope: "local" }), "Sign out is taking too long. Please try again.", 6000);
      if (error) {
        setDashboardMsg({ type: "error", text: "Sign out failed. Please try again." });
        setIsSigningOut(false);
        return;
      }
    } catch (error) {
      console.error("Sign out failed:", error);
      setDashboardMsg({ type: "error", text: "Sign out failed. Please try again." });
      setIsSigningOut(false);
      return;
    }
    clearLocalSessionState();
    router.replace("/auth/login");
    router.refresh();
  }

  async function handlePasswordReset() {
    if (!email) return;
    setIsPasswordResetLoading(true);
    setSettingsMsg(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getAuthRedirectUrl("/auth/reset-password"),
    });
    setIsPasswordResetLoading(false);
    setPasswordResetSent(!error);
    setSettingsMsg(
      error
        ? { type: "error", text: toUserMessage(error.message, "api_failure") }
        : { type: "success", text: "Reset link sent - check your inbox." }
    );
    setTimeout(() => setSettingsMsg(null), 5000);
  }

  async function handleSignOutAll() {
    setIsSigningOutAll(true);
    setSettingsMsg(null);

    try {
      const response = await fetchWithTimeout("/api/sessions", { method: "DELETE" }, "Sign out from all devices is taking too long. Please try again.");
      if (!response.ok) {
        const apiError = await readApiError(response, "api_failure");
        setSettingsMsg({ type: "error", text: apiError.message });
        setIsSigningOutAll(false);
        return;
      }
    } catch (error) {
      console.error("Sign out from all devices failed:", error);
      setSettingsMsg({ type: "error", text: error instanceof Error ? error.message : "Sign out from all devices failed. Please try again." });
      setIsSigningOutAll(false);
      return;
    }

    await withTimeout(supabase.auth.signOut({ scope: "global" }), "Sign out from all devices is taking too long. Please try again.", 6000).catch(() => null);
    clearLocalSessionState();
    router.replace("/auth/login");
    router.refresh();
  }

  async function handleDeleteHistory() {
    setIsDeletingHistory(true);
    setSettingsMsg(null);

    const response = await fetch(`/api/history${activeWorkspaceId ? `?workspaceId=${encodeURIComponent(activeWorkspaceId)}` : ""}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await readApiError(response, "delete_failed");
      setSettingsMsg({ type: "error", text: data.message });
      setIsDeletingHistory(false);
      return;
    }

    setAnalyses([]);
    setSelectedAnalysisId(null);
    setSelectedFollowUps([]);
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith("lexalyze-checklist:"))
      .forEach((key) => window.localStorage.removeItem(key));
    setIsDeletingHistory(false);
    setShowDeleteConfirmation(null);
    setSettingsMsg({ type: "success", text: "Analysis history deleted." });
  }

  async function handleDeleteAnalysis(id: string) {
    const response = await fetch(`/api/history/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await readApiError(response, "delete_failed");
      setDashboardMsg({ type: "error", text: data.message });
      return;
    }

    setAnalyses((prev) => prev.filter((a) => a.id !== id));
    setPinnedAnalysisIds((prev) => prev.filter((pinnedId) => pinnedId !== id));
    window.localStorage.removeItem(`lexalyze-checklist:${id}`);
    if (selectedAnalysisId === id) {
      setSelectedAnalysisId(null);
      setSelectedFollowUps([]);
    }
    setDashboardMsg({ type: "success", text: "Analysis deleted." });
  }

  async function handleDeleteAccount() {
    if (isDeletingAccount) return;
    setIsDeletingAccount(true);
    setSettingsMsg(null);

    const response = await fetch("/api/account", { method: "DELETE" });
    if (!response.ok) {
      const data = await readApiError(response, "delete_failed");
      setSettingsMsg({ type: "error", text: data.message });
      setIsDeletingAccount(false);
      return;
    }

    await supabase.auth.signOut({ scope: "local" }).catch(() => null);
    clearLocalSessionState();
    router.replace("/auth/login?error=account_deleted");
    router.refresh();
  }

  function closeSettingsModal() {
    setSettingsMsg(null);
    setShowDeleteConfirmation(null);
    setIsSettingsModalOpen(false);
  }

  function switchSettingsTab(tab: typeof selectedSettingsTab) {
    setSettingsMsg(null);
    setShowDeleteConfirmation(null);
    setSelectedSettingsTab(tab);
    if (tab === "security") {
      fetchActiveSessions();
    }
    if (tab === "team" && canOpenTeamSettings) {
      fetchTeamWorkspace();
    }
  }

  function handleManageSubscription() {
    if (plan === "free") {
      setSettingsMsg({ type: "error", text: "You need an active subscription before you can manage billing." });
      return;
    }
    closeSettingsModal();
    router.push("/subscription");
  }

  async function fetchTeamWorkspace(silent = false) {
    setTeamLoading(true);
    try {
      const response = await fetchWithTimeout("/api/team", { cache: "no-store" }, "Team settings are taking too long to load. Please try again.");
      if (!response.ok) {
        const apiError = await readApiError(response, "load_failed");
        if (!silent) setSettingsMsg({ type: "error", text: apiError.message });
        setHasTeamWorkspace(false);
        setTeamWorkspace(null);
        setActiveWorkspace("personal");
        setCanManageTeam(false);
        setCurrentTeamRole("");
        return;
      }
      const data = await response.json().catch(() => ({}));
      setTeamMembers(Array.isArray(data.members) ? data.members : []);
      setTeamSeatLimit(Number(data.seatLimit || 3));
      setHasTeamWorkspace(true);
      setTeamWorkspace(data.workspace?.id ? { id: data.workspace.id, name: data.workspace.name || "Team workspace" } : null);
      setCanManageTeam(Boolean(data.canManage));
      setCurrentTeamRole(data.currentMember?.role || "");
    } finally {
      setTeamLoading(false);
    }
  }

  async function updateTeam(action: string, payload: Record<string, string>) {
    setTeamLoading(true);
    setSettingsMsg(null);
    try {
      const response = await fetchWithTimeout("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      }, "Team changes are taking too long to save. Please try again.");

      if (!response.ok) {
        const apiError = await readApiError(response, "save_failed");
        setSettingsMsg({ type: "error", text: apiError.message });
        return false;
      }

      const data = await response.json().catch(() => ({}));
      setTeamMembers(Array.isArray(data.members) ? data.members : []);
      setTeamSeatLimit(Number(data.seatLimit || 3));
      setHasTeamWorkspace(true);
      setTeamWorkspace(data.workspace?.id ? { id: data.workspace.id, name: data.workspace.name || "Team workspace" } : null);
      setCanManageTeam(Boolean(data.canManage));
      setCurrentTeamRole(data.currentMember?.role || "");
      return true;
    } finally {
      setTeamLoading(false);
    }
  }

  async function inviteTeamMember() {
    const ok = await updateTeam("invite", { email: inviteEmail, role: inviteRole });
    if (ok) {
      setInviteEmail("");
      setSettingsMsg({ type: "success", text: "Teammate seat added. They can sign in with that email to activate their seat." });
    }
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
          className="group flex w-full items-center justify-between rounded-full bg-gradient-to-r from-[#E3C35B] via-[#C9A84C] to-[#A9822C] px-5 py-3.5 text-left text-xs font-bold tracking-wider text-[#0A0A0A] shadow-[0_4px_20px_rgba(201,168,76,0.18)] transition-all duration-300 hover:scale-[1.02] hover:from-[#f0d36c] hover:via-[#d4b55d] hover:to-[#b89542] hover:shadow-[0_6px_25px_rgba(201,168,76,0.28)] active:scale-[0.98]"
        >
          <span>NEW REVIEW</span>
          <span className="flex size-6 items-center justify-center rounded-full bg-black/10 text-sm leading-none font-bold transition group-hover:bg-black/15">+</span>
        </button>

        {hasTeamWorkspace && teamWorkspace ? (
          <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-1">
            <button
              type="button"
              onClick={() => switchWorkspace("personal")}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider transition ${
                activeWorkspace === "personal"
                  ? "bg-[#C9A84C]/12 text-[#C9A84C]"
                  : "text-neutral-500 hover:bg-white/[0.04] hover:text-neutral-200"
              }`}
            >
              <span>Personal</span>
              <span className="text-[10px] normal-case tracking-normal">{plan === "team" ? "Team plan" : PLAN_CATALOG[plan].name}</span>
            </button>
            <button
              type="button"
              onClick={() => switchWorkspace("team")}
              className={`mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider transition ${
                activeWorkspace === "team"
                  ? "bg-[#C9A84C]/12 text-[#C9A84C]"
                  : "text-neutral-500 hover:bg-white/[0.04] hover:text-neutral-200"
              }`}
            >
              <span className="min-w-0 truncate">Team</span>
              <span className="max-w-[120px] truncate text-[10px] normal-case tracking-normal">{teamWorkspace.name}</span>
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between px-5 pb-3">
        <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-neutral-500">{isTeamActive ? "Team history" : "History"}</p>
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
          sortedAnalyses.map((analysis) => {
            const isPinned = pinnedAnalysisIds.includes(analysis.id);
            return (
              <div key={analysis.id} className="relative group mb-1.5">
                <button
                  type="button"
                  title={cleanTitle(analysis)}
                  onClick={() => {
                    setSelectedAnalysisId(analysis.id);
                    setView("history");
                    setSelectedFollowUps([]);
                    setFollowUpsLoading(true);
                    setIsMobileNavOpen(false);
                  }}
                  className={`flex w-full items-start gap-3 rounded-2xl border pr-9 px-4 py-3.5 text-left transition-all duration-300 ${
                    selectedAnalysisId === analysis.id
                      ? "border-[#C9A84C]/35 bg-[#C9A84C]/10 text-white shadow-[0_4px_20px_rgba(201,168,76,0.05)]"
                      : "border-transparent text-neutral-400 hover:border-white/5 hover:bg-white/[0.03] hover:text-neutral-200"
                  }`}
                >
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02]">
                    <ConfidenceDot confidence={analysis.result?.overallConfidence ?? "MEDIUM"} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      {isPinned && (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3 shrink-0 text-[#C9A84C]">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75V16.5L12 21l-4.5-4.5V3.75m9 0H18a2.25 2.25 0 012.25 2.25v6.75A2.25 2.25 0 0118 12.75h-.75m-9 0H9a2.25 2.25 0 00-2.25 2.25v6.75A2.25 2.25 0 009 12.75h.75m-9 0H3.375c-.621 0-1.125.504-1.125 1.125v3.75c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.75c0-.621-.504-1.125-1.125-1.125H18" />
                        </svg>
                      )}
                      <p className="truncate text-xs font-semibold leading-snug tracking-wide group-hover:text-white transition duration-200">
                        {cleanTitle(analysis)}
                      </p>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[10px] font-medium text-neutral-500">
                      <span>{formatDate(analysis.created_at)}</span>
                      <span className="h-1 w-1 rounded-full bg-neutral-600" />
                      {analysis.result?.riskScore !== undefined && (
                        <span className={riskTone(analysis.result.riskScore)}>Risk {analysis.result.riskScore}/10</span>
                      )}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  data-dropdown-trigger="true"
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex size-6 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:bg-white/[0.06] hover:text-neutral-300"
                  aria-label="More options"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdownId(openDropdownId === analysis.id ? null : analysis.id);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                  </svg>
                </button>

                {openDropdownId === analysis.id && (
                  <div
                    data-dropdown-menu="true"
                    className="absolute right-9 top-1/2 z-50 w-44 -translate-y-1/2 rounded-xl border border-white/[0.08] bg-[#0E0E12] shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => { togglePin(analysis.id); setOpenDropdownId(null); }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-xs font-semibold text-neutral-300 transition hover:bg-white/[0.06] hover:text-[#C9A84C] rounded-t-xl"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75V16.5L12 21l-4.5-4.5V3.75m9 0H18a2.25 2.25 0 012.25 2.25v6.75A2.25 2.25 0 0118 12.75h-.75m-9 0H9a2.25 2.25 0 00-2.25 2.25v6.75A2.25 2.25 0 009 12.75h.75m-9 0H3.375c-.621 0-1.125.504-1.125 1.125v3.75c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.75c0-.621-.504-1.125-1.125-1.125H18" />
                      </svg>
                      {isPinned ? "Unpin" : "Pin to top"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleDeleteAnalysis(analysis.id); setOpenDropdownId(null); }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-xs font-semibold text-neutral-300 transition hover:bg-white/[0.06] hover:text-rose-400 rounded-b-xl"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-white/[0.05] px-4 py-5">
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-500">Account</p>
            <p className="mt-1 truncate text-xs font-semibold text-neutral-200" title={email}>{email || "Loading..."}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex shrink-0 size-8 items-center justify-center rounded-full text-neutral-500 transition hover:bg-white/[0.06] hover:text-[#C9A84C]"
            aria-label="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.212 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
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
          <button onClick={() => setLinkedBanner(false)} className="shrink-0 text-emerald-400 hover:text-emerald-200 font-bold">OK</button>
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
            <BrandMark href="/" size="sm" subtitle="Workspace" />
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
          <BrandMark href="/" size="md" subtitle="Document intelligence" />
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

          {dashboardMsg && (
            <ErrorMessage
              title={dashboardMsg.type === "success" ? "Done" : undefined}
              message={dashboardMsg.text}
              tone={dashboardMsg.type === "success" ? "blue" : "red"}
              onDismiss={() => setDashboardMsg(null)}
            />
          )}

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
                      हिन्दी
                    </button>
                  </div>
                </div>

                <DocumentUpload
                  key={selectedAnalysisId ?? "new"}
                  language={language}
                  plan={effectivePlan}
                  workspaceId={activeWorkspaceId}
                  onAnalysisComplete={() => {
                    fetchHistory(activeWorkspaceId);
                    fetchProfileUsage();
                  }}
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
                <p className="text-xs font-semibold text-neutral-500">Exports and sharing are available at the top right of the report.</p>
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
                  plan={effectivePlan}
                  language={selectedAnalysis.language || language.toLowerCase()}
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
            onClick={closeSettingsModal}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111111] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="mb-6 flex shrink-0 items-center justify-between">
                <h2
                  className={`${playfair.className} text-2xl font-bold text-[#C9A84C]`}
                >
                  Settings
                </h2>
                <button
                  type="button"
                  onClick={closeSettingsModal}
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
              <div className="hide-scrollbar mb-6 flex shrink-0 gap-2 overflow-x-auto border-b border-white/[0.06] pb-4 [&>button]:shrink-0 [&>button]:whitespace-nowrap" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                <button
                  type="button"
                  onClick={() => switchSettingsTab("general")}
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
                  onClick={() => switchSettingsTab("billing")}
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
                  onClick={() => switchSettingsTab("usage")}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    selectedSettingsTab === "usage"
                      ? "text-[#C9A84C]"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  Usage
                </button>
                {canOpenTeamSettings ? (
                  <button
                    type="button"
                    onClick={() => switchSettingsTab("team")}
                    className={`px-4 py-2 text-sm font-medium transition ${
                      selectedSettingsTab === "team"
                        ? "text-[#C9A84C]"
                        : "text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    Team
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => switchSettingsTab("security")}
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
                  onClick={() => switchSettingsTab("deletion")}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    selectedSettingsTab === "deletion"
                      ? "text-[#C9A84C]"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  Deletion
                </button>
              </div>

              <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto pr-1" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
              {settingsMsg && (
                <div ref={settingsMessageRef} className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${settingsMsg.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
                  {settingsMsg.text}
                </div>
              )}

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
                    disabled={isSigningOut}
                    className="w-full rounded-lg border border-white/10 bg-transparent px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:border-[#C9A84C]/40 hover:bg-white/[0.04] hover:text-[#C9A84C] disabled:opacity-50"
                  >
                    {isSigningOut ? "Signing out..." : "Sign out"}
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
                      disabled={isDeletingAccount}
                      className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                    >
                      {isDeletingAccount ? "Deleting..." : "Delete my account"}
                    </button>
                  </div>
                </div>
              ) : selectedSettingsTab === "billing" ? (
                <div className="space-y-4">
                  {(() => {
                    const pct = monthlyLimit === null ? 100 : Math.min(100, Math.round((docsThisMonth / monthlyLimit) * 100));
                    return (
                      <>
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2">Current Plan</p>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-white">{currentPlanDetails.name}{plan === "free" ? " (Free)" : ""}</p>
                            <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-400">
                              {plan === "free" ? "Free forever" : "Active"}
                            </span>
                          </div>
                        </div>
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-1">Documents This Month</p>
                          <p className="text-sm text-neutral-300 mb-3">
                            {monthlyLimit === null ? `${docsThisMonth} used` : `${docsThisMonth} / ${monthlyLimit} used`}
                          </p>
                          <div className="h-2 w-full rounded-full bg-white/[0.08] overflow-hidden">
                            <div className="h-full rounded-full bg-[#C9A84C] transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="mt-2 text-xs text-neutral-500">
                            {remainingDocs === null ? "Unlimited documents on this plan" : `${remainingDocs} documents remaining this month`}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2">Plan Access</p>
                          <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400">
                            <span>Follow-ups: {currentPlanDetails.monthlyFollowUps === null ? "Unlimited" : `${currentPlanDetails.monthlyFollowUps}/month`}</span>
                            <span>History: {currentPlanDetails.historyDays === null ? "Unlimited" : `${currentPlanDetails.historyDays} days`}</span>
                            <span>Storage: {currentPlanDetails.storageMb} MB</span>
                            <span>{plan === "team" ? `Seats: ${currentPlanDetails.includedSeats}` : `Outputs: ${plan === "solo" ? "PDF, DOCX" : "Locked"}`}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => { closeSettingsModal(); router.push("/pricing"); }}
                          className="w-full rounded-lg bg-[#C9A84C] px-4 py-2.5 text-sm font-semibold text-[#0A0A0A] transition hover:bg-[#d4b55d]"
                        >
                          Upgrade Plan
                        </button>
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2">Billing History</p>
                          <p className="text-sm text-neutral-400">No invoices yet</p>
                          <p className="mt-2 text-xs leading-5 text-neutral-500">
                            Paid plans renew automatically every month until cancelled. Completed subscription payments are non-refundable.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleManageSubscription}
                          className="w-full rounded-lg border border-white/10 bg-transparent px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:border-[#C9A84C]/40 hover:bg-white/[0.04] hover:text-[#C9A84C]"
                        >
                          Manage Subscription
                        </button>
                      </>
                    );
                  })()}
                </div>
              ) : selectedSettingsTab === "usage" ? (
                <div className="space-y-4">
                  {(() => {
                    const lastAnalysis = analyses[0];
                    const lastDate = lastAnalysis ? new Date(lastAnalysis.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "--";
                    return (
                      <>
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2">Total Documents Analyzed</p>
                          <p className="text-2xl font-bold text-[#C9A84C]">{analyses.length}</p>
                        </div>
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2">This Month</p>
                          <p className="text-2xl font-bold text-[#C9A84C]">
                            {docsThisMonth} <span className="text-sm font-normal text-neutral-500">/ {monthlyLimit === null ? "unlimited" : monthlyLimit}</span>
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2">High Risk Documents</p>
                          <p className="text-2xl font-bold text-rose-400">{highRiskCount}</p>
                        </div>
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2">Last Analysis</p>
                          <p className="text-base font-semibold text-[#C9A84C]">{lastDate}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : selectedSettingsTab === "team" ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-[#C9A84C]/20 bg-[#C9A84C]/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#C9A84C] mb-2">Team Workspace</p>
                        <p className="text-sm text-neutral-300">
                          {teamMembers.length} / {teamSeatLimit} seats used. Roles control who can manage the workspace.
                          {currentTeamRole ? ` Your role: ${currentTeamRole}.` : ""}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-neutral-500">
                          Owner and Admin can manage seats. Member and Viewer can access the workspace only.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => fetchTeamWorkspace()}
                        disabled={teamLoading}
                        className="rounded-full border border-[#C9A84C]/30 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#C9A84C] disabled:opacity-50"
                      >
                        {teamLoading ? "Loading" : "Refresh"}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-3">Seats + Roles</p>
                    <div className="space-y-2">
                      {teamMembers.length === 0 ? (
                        <p className="text-sm text-neutral-500">Open this tab to initialize your workspace.</p>
                      ) : (
                        teamMembers.map((member) => (
                          <div key={member.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-black/15 px-3 py-2.5">
                            <div>
                              <p className="text-sm font-semibold text-neutral-200">{member.email}</p>
                              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-neutral-600">{member.status}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                value={member.role}
                                disabled={!canManageTeam || member.role === "owner" || teamLoading}
                                onChange={(event) => updateTeam("role", { memberId: member.id, role: event.target.value })}
                                className="rounded-full border border-white/10 bg-[#08080C] px-3 py-1.5 text-xs font-semibold text-neutral-300 outline-none disabled:opacity-50"
                              >
                                <option value="owner">Owner</option>
                                <option value="admin">Admin</option>
                                <option value="member">Member</option>
                                <option value="viewer">Viewer</option>
                              </select>
                              {member.role !== "owner" ? (
                                <button
                                  type="button"
                                  onClick={() => updateTeam("remove", { memberId: member.id })}
                                  disabled={!canManageTeam || teamLoading}
                                  className="rounded-full border border-rose-500/25 px-3 py-1.5 text-xs font-semibold text-rose-400 disabled:opacity-50"
                                >
                                  Remove
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                      <input
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                        placeholder="teammate@example.com"
                        disabled={!canManageTeam}
                        className="rounded-lg border border-white/[0.08] bg-[#08080C] px-3 py-2 text-sm text-white outline-none focus:border-[#C9A84C]/45"
                      />
                      <select
                        value={inviteRole}
                        onChange={(event) => setInviteRole(event.target.value as "admin" | "member" | "viewer")}
                        disabled={!canManageTeam}
                        className="rounded-lg border border-white/[0.08] bg-[#08080C] px-3 py-2 text-sm text-white outline-none focus:border-[#C9A84C]/45"
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        type="button"
                        onClick={inviteTeamMember}
                        disabled={!canManageTeam || teamLoading || !inviteEmail.trim()}
                        className="rounded-lg bg-[#C9A84C] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
                      >
                        Add seat
                      </button>
                    </div>
                    {!canManageTeam ? (
                      <p className="mt-3 text-xs leading-5 text-neutral-500">Only owners and admins can add seats, change roles, or remove teammates.</p>
                    ) : null}
                  </div>
                </div>
              ) : selectedSettingsTab === "security" ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2">Change / Reset Password</p>
                    <p className="text-xs text-neutral-500 mb-3">We will send a secure password reset link to your email address.</p>
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      disabled={isPasswordResetLoading || passwordResetSent}
                      className="w-full rounded-lg border border-white/10 bg-transparent px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:border-[#C9A84C]/40 hover:bg-white/[0.04] hover:text-[#C9A84C] disabled:opacity-50"
                    >
                      {isPasswordResetLoading ? "Sending..." : passwordResetSent ? "Email sent" : "Send password reset email"}
                    </button>
                  </div>
                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">Active Sessions</p>
                      <button
                        type="button"
                        onClick={() => fetchActiveSessions()}
                        disabled={sessionsLoading}
                        className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-semibold text-neutral-400 transition hover:border-[#C9A84C]/35 hover:text-[#C9A84C] disabled:opacity-50"
                      >
                        {sessionsLoading ? "Refreshing..." : "Refresh"}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {activeSessions.length === 0 ? (
                        <p className="text-sm text-neutral-500">
                          {sessionsLoading ? "Loading active sessions..." : "No active sessions found yet."}
                        </p>
                      ) : (
                        activeSessions.map((session) => (
                          <div key={session.id} className="rounded-lg border border-white/[0.06] bg-black/15 px-3 py-2.5">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-neutral-200">
                                  {session.device_name || "Unknown device"}
                                  {session.isCurrent ? <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400">Current</span> : null}
                                </p>
                                <p className="mt-1 text-xs text-neutral-500">
                                  {[session.browser_name, session.os_name].filter(Boolean).join(" · ") || "Browser details unavailable"}
                                </p>
                              </div>
                              <p className="shrink-0 text-right text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
                                {session.last_seen ? `Seen ${new Date(session.last_seen).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "Active"}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOutAll}
                    disabled={isSigningOutAll}
                    className="w-full rounded-lg border border-white/10 bg-transparent px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50"
                  >
                    {isSigningOutAll ? "Signing out..." : "Sign out all devices"}
                  </button>
                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2">Security Notice</p>
                    <p className="text-sm text-neutral-400 leading-relaxed">
                      Your documents are encrypted in transit. Lexalyze is designed with privacy and confidentiality in mind.
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
                      disabled={isDeletingHistory}
                      className="w-full rounded-lg border border-white/10 bg-transparent px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                    >
                      {isDeletingHistory ? "Deleting..." : "Delete all saved analyses"}
                    </button>
                  </div>
                </div>
              ) : null}
              </div>

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
                            if (showDeleteConfirmation === "history") {
                              handleDeleteHistory();
                            } else {
                              handleDeleteAccount();
                            }
                          }}
                          disabled={isDeletingHistory || isDeletingAccount}
                          className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                        >
                          {isDeletingHistory || isDeletingAccount ? "Deleting..." : "Confirm"}
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
