"use client";

import { Playfair_Display } from "next/font/google";
import Link from "next/link";
import { useMemo, useState } from "react";
import Navbar from "./components/Navbar";
import AnalysisLoadingOverlay from "./components/AnalysisLoadingOverlay";
import AnalysisResult from "@/app/components/AnalysisResult";
import ErrorMessage, { type ErrorTone } from "./components/ErrorMessage";
import { SYSTEM_PROMPT } from "@/lib/prompt";
import type { AnalysisResult as AiAnalysisResult } from "@/types/analysis";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

const SAMPLE_RENTAL_DOCUMENT = `RESIDENTIAL RENTAL AGREEMENT

This Rental Agreement is made on 1 July 2026 between:
Landlord: Rakesh Sharma
Tenant: Priya Mehta
Property Address: Flat 402, Sunrise Residency, Bengaluru

1) Term
The tenancy shall commence on 1 July 2026 and continue for 11 months ending on 31 May 2027.

2) Rent and Security Deposit
Monthly rent shall be INR 25,000 and must be paid by the 5th day of each month.
Security deposit of INR 50,000 is paid by the Tenant and is refundable subject to deductions.

3) Utilities and Maintenance
Tenant shall pay electricity, internet, and water charges based on actual usage.
Minor repairs under INR 2,000 shall be borne by Tenant. Structural repairs shall be borne by Landlord.

4) Delay and Penalty
If rent is delayed beyond 5 days, a late fee of INR 1,000 per day may be charged.

5) Lock-in and Exit
If Tenant exits before completion of lock-in period, pending rent for remaining lock-in duration may be recovered.
Tenant must provide a written notice of 60 days before vacating.

6) Deposit Return
Landlord shall return the security deposit within 30 days of handover after adjusting lawful dues.

7) Dispute
Any disputes arising from this agreement shall be subject to Bengaluru jurisdiction.
`;

const ANALYSIS_STEPS = [
  "📖 Reading document...",
  "🔍 Identifying clauses...",
  "⚠️ Checking risks...",
  "📋 Building summary...",
  "✅ Verifying citations...",
] as const;

const FAQ_ITEMS = [
  {
    question: "Is Lexalyze easy to use?",
    answer:
      "Yes. Upload your document and receive a clear, plain-language breakdown in seconds.",
  },
  {
    question: "Can Lexalyze help identify risky clauses?",
    answer:
      "Yes. Lexalyze highlights important risks, hidden obligations, deadlines, and unusual clauses with direct citations from the document.",
  },
  {
    question: "Does Lexalyze support different types of legal documents?",
    answer:
      "Yes. Lexalyze works with rental agreements, employment contracts, insurance policies, loan agreements, legal notices, vendor contracts, and more.",
  },
  {
    question: "Is my document handled securely?",
    answer:
      "Yes. Documents are transmitted securely and processed with privacy and transparency in mind.",
  },
  {
    question: "Why do users trust Lexalyze?",
    answer:
      "Because every finding is backed by exact document citations, confidence indicators, and clear explanations instead of vague summaries.",
  },
] as const;

type AnalysisErrorType = "api-failure" | "rate-limit" | "parse-error";

type AnalysisErrorContent = {
  title: string;
  message: string;
  hint?: string;
  tone: ErrorTone;
};

const ANALYSIS_ERROR_COPY: Record<AnalysisErrorType, AnalysisErrorContent> = {
  "api-failure": {
    title: "Something went wrong",
    message: "We couldn't process your document right now. Please try again.",
    tone: "red",
  },
  "rate-limit": {
    title: "Daily limit reached",
    message: "You've reached today's free analysis limit. Please try again tomorrow.",
    tone: "blue",
  },
  "parse-error": {
    title: "Document could not be analysed",
    message: "This file may be corrupted or formatted in a way we can't read yet.",
    tone: "red",
  },
};

function normalizeGroqJson(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

export default function HomePage() {
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [analysisErrorType, setAnalysisErrorType] = useState<AnalysisErrorType | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AiAnalysisResult | null>(null);
  const [stepMessage, setStepMessage] = useState<(typeof ANALYSIS_STEPS)[number]>(
    ANALYSIS_STEPS[0],
  );
  const [openFaqIndex, setOpenFaqIndex] = useState<number>(0);

  const sampleText = useMemo(() => SAMPLE_RENTAL_DOCUMENT, []);

  async function runSampleAnalysis() {
    if (isAnalysing) return;
  
    setIsAnalysing(true);
    setAnalysisErrorType(null);
    setAnalysisResult(null);
    setStepMessage(ANALYSIS_STEPS[0]);
  
    let stepIndex = 0;
    const stepTimer = setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, ANALYSIS_STEPS.length - 1);
      setStepMessage(ANALYSIS_STEPS[stepIndex]);
    }, 1700);
  
    try {
      const response = await fetch("/api/demo-analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: sampleText,
          language: "en",
          filename: "sample-rental-agreement.txt",
        }),
      });
  
      if (!response.ok) {
        if (response.status === 429) {
          setAnalysisErrorType("rate-limit");
          return;
        }
  
        setAnalysisErrorType("api-failure");
        return;
      }
  
      const data = await response.json();
  
      if (!data?.result) {
        setAnalysisErrorType("parse-error");
        return;
      }
  
      setAnalysisResult(data.result as AiAnalysisResult);
    } catch {
      setAnalysisErrorType("api-failure");
    } finally {
      clearInterval(stepTimer);
      setIsAnalysing(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] text-[#F3F4F6] selection:bg-[#C9A84C]/30 selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-[-10%] left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(201,168,76,0.18)_0%,rgba(201,168,76,0.04)_50%,rgba(5,5,5,0)_100%)] blur-3xl" />
          <div className="absolute bottom-[10%] right-[-10%] h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0)_70%)] blur-3xl" />
          <div className="absolute top-[20%] left-[-10%] h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(201,168,76,0.05)_0%,rgba(201,168,76,0)_70%)] blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-4xl text-center">
          <p className="hero-fade-up text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A84C] sm:text-sm">
            AI-Powered Document Intelligence
          </p>

          <h1
            className={`${playfair.className} hero-fade-up-delay mt-6 text-balance text-4xl font-bold leading-[1.15] text-white sm:text-5xl lg:text-[64px]`}
          >
            Your legal documents, <br className="hidden sm:inline" />
            <span className="text-gold-gradient">finally explained.</span>
          </h1>

          <p className="hero-fade-up-delay-2 mx-auto mt-8 max-w-2xl text-pretty text-base leading-relaxed text-neutral-400 sm:text-lg">
            Upload any legal document. Every clause explained, every risk flagged,
            every deadline surfaced. In plain language. In 60 seconds.
          </p>

          <div className="hero-fade-up-delay-3 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
            <Link
              href="/auth/login"
              className="w-full rounded-full bg-gradient-to-r from-[#C9A84C] to-[#aa8426] px-8 py-4 text-sm font-bold tracking-wider text-[#0A0A0A] shadow-[0_4px_25px_rgba(201,168,76,0.2)] transition-all duration-300 hover:scale-[1.03] hover:from-[#d4b55d] hover:to-[#b89542] hover:shadow-[0_8px_30px_rgba(201,168,76,0.35)] active:scale-[0.98] sm:w-auto"
            >
              Start analyzing free
            </Link>

            <a
              href="#live-demo"
              className="w-full rounded-full border border-white/10 bg-white/[0.03] px-8 py-4 text-sm font-semibold tracking-wider text-white shadow-xl backdrop-blur-sm transition-all duration-300 hover:border-[#C9A84C]/50 hover:bg-[#C9A84C]/10 hover:text-[#d4b55d] hover:shadow-[0_0_20px_rgba(201,168,76,0.05)] active:scale-[0.98] sm:w-auto"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("live-demo")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
            >
              Watch demo
            </a>
          </div>

          <p className="hero-fade-up-delay-3 mt-10 flex items-center justify-center gap-2 text-xs font-medium tracking-wider text-neutral-500">
            <span>Every finding cited to source</span>
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
            <span>Not legal advice</span>
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
            <span>Deleted after analysis</span>
          </p>
        </div>
      </section>

      {/* Demo Section */}
      <section id="live-demo" className="relative overflow-hidden px-4 pb-28 pt-10 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-20 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(201,168,76,0.12)_0%,rgba(10,10,10,0)_70%)] blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-5xl rounded-3xl border border-white/[0.08] bg-[#0E0E11]/80 p-5 shadow-[0_25px_60px_rgba(0,0,0,0.8)] backdrop-blur-md sm:p-10">
          <div className="mx-auto max-w-2xl text-center">
            <span className="rounded-full border border-[#C9A84C]/35 bg-[#C9A84C]/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#C9A84C]">
              Interactive Sandbox
            </span>
            <h2 className={`${playfair.className} mt-6 text-3xl font-bold text-white sm:text-4xl`}>
              See a real analysis.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-neutral-400 sm:text-base">
              Instantly try Lexalyze with a realistic sample rental agreement.
              See structured clause insights, risks, and deadlines exactly as users
              experience in production.
            </p>
          </div>

          <div className="relative mt-12">
            <div className="rounded-2xl border border-white/[0.06] bg-[#121216] p-4 shadow-inner">
              <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3 px-1">
                <p className="text-xs font-semibold tracking-widest text-neutral-400 uppercase">
                  SAMPLE DOCUMENT PREVIEW
                </p>
                <span className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-[10px] font-semibold text-neutral-500">
                  Read-only
                </span>
              </div>
              <textarea
                readOnly
                value={sampleText}
                className="h-[24rem] w-full resize-none rounded-xl border border-white/[0.04] bg-[#0A0A0C] p-5 font-mono text-xs leading-relaxed text-neutral-300 outline-none transition focus:border-[#C9A84C]/30 sm:h-[28rem] sm:text-sm"
              />
            </div>

            <div className="mt-8 flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={runSampleAnalysis}
                disabled={isAnalysing}
                className="w-full rounded-full bg-gradient-to-r from-[#C9A84C] to-[#aa8426] px-8 py-4 text-sm font-bold tracking-wider text-[#0A0A0A] shadow-[0_4px_20px_rgba(201,168,76,0.15)] transition-all duration-300 hover:scale-[1.02] hover:from-[#d4b55d] hover:to-[#b89542] hover:shadow-[0_6px_25px_rgba(201,168,76,0.25)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {isAnalysing ? stepMessage : "Analyse sample document"}
              </button>
              {analysisErrorType ? (
                <ErrorMessage
                  title={ANALYSIS_ERROR_COPY[analysisErrorType].title}
                  message={ANALYSIS_ERROR_COPY[analysisErrorType].message}
                  hint={ANALYSIS_ERROR_COPY[analysisErrorType].hint}
                  tone={ANALYSIS_ERROR_COPY[analysisErrorType].tone}
                  className="w-full max-w-xl animate-premium-fade"
                  onDismiss={() => setAnalysisErrorType(null)}
                />
              ) : null}
            </div>

            <AnalysisLoadingOverlay isVisible={isAnalysing} steps={ANALYSIS_STEPS} />
          </div>

          {analysisResult ? (
            <div className="mt-12 animate-[fadeIn_600ms_cubic-bezier(0.16,1,0.3,1)_both] border-t border-white/[0.08] pt-12">
              <AnalysisResult
                result={{
                  ...analysisResult,
                }}
              />
            </div>
          ) : null}

          {/* Golden Portal */}
          <div className="mt-12 rounded-3xl border border-[#C9A84C]/30 bg-[linear-gradient(135deg,rgba(25,18,10,0.8)_0%,rgba(16,13,8,0.9)_100%)] p-6 shadow-[0_15px_40px_rgba(201,168,76,0.05)] sm:p-10">
            <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 text-center sm:gap-6">
              <h3
                className={`${playfair.className} text-2xl font-bold leading-snug text-[#f5e2ac] break-words sm:text-3xl`}
              >
                Sign up free to analyse your own documents.
              </h3>
              <p className="max-w-2xl text-sm leading-relaxed text-[#d8c58b]">
                Get personal document history, faster follow-ups, and secure saved analyses.
              </p>
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#C9A84C] to-[#aa8426] px-8 py-4 text-sm font-bold tracking-wider text-[#0A0A0A] shadow-lg transition-all duration-300 hover:scale-[1.02] hover:from-[#d4b55d] hover:shadow-[0_4px_20px_rgba(201,168,76,0.2)] active:scale-[0.98]"
              >
                Get started free
              </Link>
              <p className="max-w-2xl text-xs leading-relaxed text-[#c7b272]/70">
                No legal advice. Every finding includes citation context.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="relative px-4 pb-28 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A84C]">
              Direct Workflow
            </span>
            <h2 className={`${playfair.className} mt-4 text-3xl font-bold text-white sm:text-4xl`}>
              How it works
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <article className="group rounded-2xl border border-white/[0.05] bg-[#0E0E12] p-8 shadow-lg transition-all duration-500 hover:border-[#C9A84C]/30 hover:bg-[#121217] hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)]">
              <p className={`${playfair.className} text-4xl font-bold leading-none text-[#C9A84C] opacity-80 transition group-hover:scale-110 duration-500`}>
                01
              </p>
              <h3 className="mt-6 text-xl font-bold text-white">Upload securely</h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                Upload legal documents privately through a secure workflow so your
                analysis starts fast without compromising confidentiality.
              </p>
            </article>

            <article className="group rounded-2xl border border-white/[0.05] bg-[#0E0E12] p-8 shadow-lg transition-all duration-500 hover:border-[#C9A84C]/30 hover:bg-[#121217] hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)]">
              <p className={`${playfair.className} text-4xl font-bold leading-none text-[#C9A84C] opacity-80 transition group-hover:scale-110 duration-500`}>
                02
              </p>
              <h3 className="mt-6 text-xl font-bold text-white">
                AI reads every clause
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                Lexalyze scans the full document, identifies clauses, deadlines,
                risks, and obligations, then structures everything in a clear format.
              </p>
            </article>

            <article className="group rounded-2xl border border-white/[0.05] bg-[#0E0E12] p-8 shadow-lg transition-all duration-500 hover:border-[#C9A84C]/30 hover:bg-[#121217] hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)]">
              <p className={`${playfair.className} text-4xl font-bold leading-none text-[#C9A84C] opacity-80 transition group-hover:scale-110 duration-500`}>
                03
              </p>
              <h3 className="mt-6 text-xl font-bold text-white">
                Understand and act
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                Receive plain-language explanations, key risk flags, and practical
                action guidance so you can decide with confidence.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section id="what-lexalyze-reads" className="relative px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className={`${playfair.className} text-3xl text-white sm:text-4xl`}>
              What Lexalyze reads
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-neutral-400 sm:text-base">
              Lexalyze analyses common legal documents and surfaces hidden risks,
              obligations, and deadlines before they become expensive surprises.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Rental agreements", desc: "Detects hidden fees, lock-in clauses, deposit risks, notice periods, and maintenance obligations." },
              { title: "Employment contracts", desc: "Flags restrictive clauses, probation terms, termination conditions, and non-compete risks." },
              { title: "Loan agreements", desc: "Highlights repayment obligations, penalties, interest terms, and default clauses." },
              { title: "Insurance policies", desc: "Surfaces exclusions, claim limitations, waiting periods, and hidden conditions." },
              { title: "Legal notices", desc: "Identifies deadlines, response obligations, escalation risks, and legal exposure." },
              { title: "Vendor agreements", desc: "Flags liability clauses, payment obligations, auto-renewals, and termination risks." }
            ].map((card, i) => (
              <article key={i} className="group rounded-2xl border border-white/[0.04] bg-[#0E0E11] p-6 shadow-md transition-all duration-500 hover:border-[#C9A84C]/25 hover:bg-[#121216] hover:shadow-[0_12px_28px_rgba(0,0,0,0.35)] hover:-translate-y-1">
                <h3 className="text-lg font-bold text-white transition duration-300 group-hover:text-[#C9A84C]">{card.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                  {card.desc}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="trust-security" className="relative px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className={`${playfair.className} text-3xl text-white sm:text-4xl`}>
              Trust &amp; Security
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-neutral-400 sm:text-base">
              Lexalyze is built to prioritize transparency, privacy, and responsible
              AI analysis at every step of your document workflow.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "🔒", title: "Encrypted in transit", desc: "Uploaded documents are securely transmitted using encrypted connections to protect your data." },
              { icon: "🗑️", title: "Deleted after analysis", desc: "Documents are removed after processing and are not permanently stored to minimize retention risks." },
              { icon: "📌", title: "Every finding cited", desc: "Every risk, clause, and conclusion includes an exact citation so you can verify what the AI references." },
              { icon: "⚖️", title: "Honest about limits", desc: "Lexalyze clearly states when information cannot be confidently determined, setting realistic expectations." }
            ].map((trust, i) => (
              <article key={i} className="rounded-2xl border border-white/[0.04] bg-[#0D0D10] p-6 shadow-md transition-all duration-500 hover:border-[#C9A84C]/25 hover:bg-[#111114] hover:shadow-[0_12px_26px_rgba(0,0,0,0.3)] hover:-translate-y-1">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#C9A84C]/35 bg-[#C9A84C]/10 text-xl shadow-inner">
                  {trust.icon}
                </span>
                <h3 className="mt-5 text-base font-bold text-white">{trust.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                  {trust.desc}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="relative px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className={`${playfair.className} text-3xl text-white sm:text-4xl`}>
              Frequently asked questions
            </h2>
          </div>

          <div className="mt-12 space-y-4">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <article
                  key={item.question}
                  className="group rounded-2xl border border-white/[0.05] bg-[#0E0E12] shadow-sm transition-all duration-300 hover:border-[#C9A84C]/25"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex((current) => (current === index ? -1 : index))}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="text-base font-bold text-white transition duration-300 group-hover:text-neutral-200">
                      {item.question}
                    </span>
                    <span
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-neutral-400 transition-all duration-300 ${
                        isOpen ? "rotate-180 border-[#C9A84C]/30 text-[#C9A84C] bg-[#C9A84C]/5" : "rotate-0"
                      }`}
                      aria-hidden
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className="h-3.5 w-3.5"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </span>
                  </button>

                  <div
                    className={`overflow-hidden px-6 transition-all duration-500 ease-out ${
                      isOpen ? "max-h-40 pb-5 opacity-100" : "max-h-0 pb-0 opacity-0"
                    }`}
                  >
                    <p className="text-sm leading-relaxed text-neutral-400">
                      {item.answer}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] bg-[#08080A] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9A84C]">
                Product
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-neutral-400">
                <li><a href="#" className="hover:text-[#C9A84C] transition duration-300">Features</a></li>
                <li><a href="#" className="hover:text-[#C9A84C] transition duration-300">Live demo</a></li>
                <li><a href="#" className="hover:text-[#C9A84C] transition duration-300">Security</a></li>
                <li><a href="#" className="hover:text-[#C9A84C] transition duration-300">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9A84C]">
                Company
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-neutral-400">
                <li><a href="#" className="hover:text-[#C9A84C] transition duration-300">About</a></li>
                <li><a href="#" className="hover:text-[#C9A84C] transition duration-300">Contact</a></li>
                <li><a href="#" className="hover:text-[#C9A84C] transition duration-300">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-[#C9A84C] transition duration-300">Terms of Service</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9A84C]">
                Resources
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-neutral-400">
                <li><a href="#" className="hover:text-[#C9A84C] transition duration-300">Supported documents</a></li>
                <li><a href="#" className="hover:text-[#C9A84C] transition duration-300">Trust &amp; Safety</a></li>
                <li><a href="#" className="hover:text-[#C9A84C] transition duration-300">Help Center</a></li>
                <li><a href="#" className="hover:text-[#C9A84C] transition duration-300">Status</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-white/[0.05] pt-8">
            <div className="flex flex-col gap-4 text-xs sm:flex-row sm:items-center sm:justify-between text-neutral-500">
              <p>© 2026 Lexalyze. All rights reserved.</p>
              <p className="max-w-md leading-relaxed sm:text-right">
                Not legal advice. Lexalyze provides AI-generated insights and is not a
                substitute for legal advice.
              </p>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .hero-fade-up {
          animation: fadeUp 700ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .hero-fade-up-delay {
          animation: fadeUp 800ms cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 100ms;
        }
        .hero-fade-up-delay-2 {
          animation: fadeUp 900ms cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 200ms;
        }
        .hero-fade-up-delay-3 {
          animation: fadeUp 1000ms cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 300ms;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translate3d(0, 15px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translate3d(0, 20px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
      `}</style>
    </main>
  );
}