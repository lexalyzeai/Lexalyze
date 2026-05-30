"use client";

import { Playfair_Display } from "next/font/google";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/app/components/Navbar";
import { supabase } from "@/lib/supabase";
import { normalizePlan, PLAN_CATALOG, type PlanId } from "@/lib/plans";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });

type SubscriptionState = {
  email: string;
  plan: PlanId;
  loading: boolean;
  loadingMessage: string;
};

export default function SubscriptionPage() {
  const router = useRouter();
  const [state, setState] = useState<SubscriptionState>({
    email: "",
    plan: "free",
    loading: true,
    loadingMessage: "Checking your subscription...",
  });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadSubscription() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (alive) {
          setState((current) => ({ ...current, loadingMessage: "Redirecting you to sign in..." }));
        }
        router.replace("/auth/login?returnTo=/subscription");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", session.user.id)
        .maybeSingle();

      const plan = normalizePlan(data?.plan);
      if (plan === "free") {
        if (alive) {
          setState((current) => ({ ...current, loadingMessage: "Redirecting you to pricing..." }));
        }
        router.replace("/pricing");
        return;
      }

      if (alive) {
        setState({ email: session.user.email || "", plan, loading: false, loadingMessage: "" });
      }
    }

    void loadSubscription();
    return () => {
      alive = false;
    };
  }, [router]);

  const planDetails = PLAN_CATALOG[state.plan];

  function paymentGatewayNotice(action: string) {
    setNotice(`${action} will connect to the payment gateway billing portal. Paid plans renew monthly until cancelled, and completed payments are non-refundable.`);
    window.setTimeout(() => setNotice(""), 6000);
  }

  if (state.loading) {
    return (
      <main className="min-h-screen bg-[#050505] text-white">
        <Navbar />
        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <div className="rounded-3xl border border-white/[0.08] bg-[#0E0E12]/85 px-8 py-7 text-center shadow-2xl shadow-black/60 backdrop-blur-xl">
            <span className="mx-auto block size-9 animate-spin rounded-full border-2 border-neutral-700 border-t-[#C9A84C]" />
            <p className="mt-4 text-sm font-semibold text-neutral-300">{state.loadingMessage}</p>
            <p className="mt-2 text-xs text-neutral-500">This only takes a moment.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-[#C9A84C]/30">
      <Navbar />
      <div className="mx-auto w-full max-w-5xl px-4 py-20 sm:px-6">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#C9A84C]">Subscription</p>
          <h1 className={`${playfair.className} mt-4 text-4xl font-bold sm:text-5xl`}>Manage your plan</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
            This page is ready for a billing portal. Once payments are connected, these actions can open checkout, invoices, plan changes, and cancellation flows.
            Paid plans renew monthly until cancelled.
          </p>
        </div>

        {notice ? (
          <div className="mb-6 rounded-2xl border border-[#C9A84C]/25 bg-[#C9A84C]/10 px-5 py-4 text-sm font-medium text-[#f5e2ac]">
            {notice}
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/[0.08] bg-[#0E0E12] p-6 shadow-2xl shadow-black/40">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.06] pb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-600">Current plan</p>
                <h2 className={`${playfair.className} mt-2 text-3xl font-bold text-white`}>{planDetails.name}</h2>
                <p className="mt-1 text-sm text-neutral-500">{state.email}</p>
              </div>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
                Active
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">Documents</p>
                <p className="mt-2 text-sm font-semibold text-white">{planDetails.monthlyDocuments === null ? "Unlimited" : `${planDetails.monthlyDocuments}/month`}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">Follow-ups</p>
                <p className="mt-2 text-sm font-semibold text-white">{planDetails.monthlyFollowUps === null ? "Unlimited" : `${planDetails.monthlyFollowUps}/month`}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">Storage</p>
                <p className="mt-2 text-sm font-semibold text-white">{planDetails.storageMb} MB</p>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">History</p>
                <p className="mt-2 text-sm font-semibold text-white">{planDetails.historyDays === null ? "Unlimited" : `${planDetails.historyDays} days`}</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100">
              Paid plans renew automatically every month until cancelled. Payments and renewals are non-refundable once completed. Plan changes will follow the billing gateway policy when connected.
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-white/[0.08] bg-[#0E0E12] p-6 shadow-2xl shadow-black/40">
            <button
              type="button"
              onClick={() => paymentGatewayNotice("Billing portal")}
              className="w-full rounded-2xl bg-gradient-to-r from-[#C9A84C] to-[#aa8426] px-4 py-3 text-sm font-bold text-black transition hover:from-[#d4b55d] hover:to-[#b89542]"
            >
              Open billing portal
            </button>
            <button
              type="button"
              onClick={() => paymentGatewayNotice("Plan change")}
              className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-neutral-200 transition hover:border-[#C9A84C]/35 hover:text-[#C9A84C]"
            >
              Change plan
            </button>
            <button
              type="button"
              onClick={() => paymentGatewayNotice("Cancellation")}
              className="w-full rounded-2xl border border-rose-500/25 px-4 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10"
            >
              Cancel renewal
            </button>
            <Link
              href="/pricing"
              className="block w-full rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-semibold text-neutral-400 transition hover:border-white/20 hover:text-white"
            >
              Compare plans
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
