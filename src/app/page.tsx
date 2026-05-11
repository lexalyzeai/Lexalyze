"use client";

import { Playfair_Display } from "next/font/google";
import Link from "next/link";
import { useMemo, useState } from "react";
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
      const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
      if (!apiKey) {
        setAnalysisErrorType("api-failure");
        return;
      }

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: SYSTEM_PROMPT("en") },
            {
              role: "user",
              content: `Analyse this legal document and return the JSON:\n\n${sampleText}`,
            },
          ],
          temperature: 0.1,
          max_tokens: 3000,
          response_format: { type: "json_object" },
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

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        setAnalysisErrorType("parse-error");
        return;
      }

      let parsed: AiAnalysisResult;
      try {
        parsed = JSON.parse(normalizeGroqJson(content)) as AiAnalysisResult;
      } catch {
        setAnalysisErrorType("parse-error");
        return;
      }
      setAnalysisResult(parsed);
    } catch {
      setAnalysisErrorType("api-failure");
    } finally {
      clearInterval(stepTimer);
      setIsAnalysing(false);
    }
  }

  return (
    <main className="bg-[#0A0A0A] text-white">
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="hero-gradient absolute -top-32 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(201,168,76,0.16)_0%,rgba(201,168,76,0.06)_35%,rgba(10,10,10,0)_70%)] blur-3xl" />
          <div className="hero-gradient-slow absolute -bottom-40 right-[-12rem] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_70%)] blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-4xl text-center">
          <h1
            className={`${playfair.className} hero-fade-up text-balance text-4xl font-bold leading-tight text-neutral-50 sm:text-5xl lg:text-[56px]`}
          >
            Your legal documents, finally explained.
          </h1>

          <p className="hero-fade-up-delay mx-auto mt-6 max-w-3xl text-pretty text-base leading-7 text-neutral-400 sm:text-lg sm:leading-8">
            Upload any legal document. Every clause explained, every risk flagged,
            every deadline surfaced. In plain language. In 60 seconds.
          </p>

          <div className="hero-fade-up-delay-2 mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/auth/login"
              className="w-full rounded-lg bg-[#C9A84C] px-6 py-3 text-sm font-semibold text-[#0A0A0A] transition duration-200 hover:-translate-y-0.5 hover:bg-[#d4b55d] active:bg-[#b89542] sm:w-auto"
            >
              Start analyzing
            </Link>
            
              href="#live-demo"
              className="w-full rounded-lg border border-[#C9A84C]/70 bg-transparent px-6 py-3 text-sm font-medium text-[#C9A84C] transition duration-200 hover:-translate-y-0.5 hover:border-[#d4b55d] hover:bg-[#C9A84C]/10 hover:text-[#d4b55d] sm:w-auto"
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

          <p className="hero-fade-up-delay-3 mt-8 text-xs tracking-wide text-neutral-500 sm:text-sm">
            Every finding cited to source · Not legal advice · Deleted after analysis
          </p>
        </div>
      </section>

      <section id="live-demo" className="relative overflow-hidden px-4 pb-24 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="demo-gradient absolute left-1/2 top-20 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(201,168,76,0.14)_0%,rgba(201,168,76,0.03)_45%,rgba(10,10,10,0)_72%)] blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-6xl rounded-3xl border border-white/10 bg-[#101010] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.42)] sm:p-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className={`${playfair.className} text-3xl text-white sm:text-4xl`}>
              See a real analysis. No sign-up required.
            </h2>
            <p className="mt-4 text-sm leading-7 text-neutral-400 sm:text-base">
              Instantly try Lexalyze with a realistic sample rental agreement.
              See structured clause insights, risks, and deadlines exactly as users
              experience in production.
            </p>
          </div>

          <div className="relative mt-8">
            <div className="rounded-2xl border border-white/10 bg-[#141414] p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between px-1">
                <p className="text-xs font-medium tracking-wide text-neutral-400">
                  SAMPLE DOCUMENT PREVIEW
                </p>
                <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-neutral-500">
                  Read-only
                </span>
              </div>
              <textarea
                readOnly
                value={sampleText}
                className="h-[24rem] w-full resize-none rounded-xl border border-white/10 bg-[#0D0D0D] p-4 font-mono text-xs leading-6 text-neutral-300 outline-none sm:h-[28rem] sm:text-sm"
              />
            </div>

            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={runSampleAnalysis}
                disabled={isAnalysing}
                className="w-full rounded-xl bg-[#C9A84C] px-6 py-3 text-sm font-semibold text-[#0A0A0A] transition duration-200 hover:-translate-y-0.5 hover:bg-[#d4b55d] active:bg-[#b89542] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                {isAnalysing ? stepMessage : "Analyse sample document"}
              </button>
              {analysisErrorType ? (
                <ErrorMessage
                  title={ANALYSIS_ERROR_COPY[analysisErrorType].title}
                  message={ANALYSIS_ERROR_COPY[analysisErrorType].message}
                  hint={ANALYSIS_ERROR_COPY[analysisErrorType].hint}
                  tone={ANALYSIS_ERROR_COPY[analysisErrorType].tone}
                  className="w-full max-w-xl"
                  onDismiss={() => setAnalysisErrorType(null)}
                />
              ) : null}
            </div>

            <AnalysisLoadingOverlay isVisible={isAnalysing} steps={ANALYSIS_STEPS} />
          </div>

          {analysisResult ? (
            <div className="mt-10 animate-[fadeIn_450ms_ease-out_both]">
              <AnalysisResult result={analysisResult} />
            </div>
          ) : null}

          <div className="mt-10 rounded-2xl border border-[#C9A84C]/35 bg-[#15120A] p-5 sm:p-6">
            <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 text-center sm:gap-6">
              <h3
                className={`${playfair.className} text-2xl leading-tight text-[#f5e2ac] break-words sm:text-3xl`}
              >
                Sign up free to analyse your own documents.
              </h3>
              <p className="max-w-2xl text-sm leading-7 text-[#d8c58b]">
                Get personal document history, faster follow-ups, and secure saved analyses.
              </p>
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center rounded-lg bg-[#C9A84C] px-6 py-3 text-sm font-semibold text-[#0A0A0A] transition hover:bg-[#d4b55d]"
              >
                Get started
              </Link>
              <p className="max-w-2xl text-xs leading-6 text-[#c7b272]/80">
                No legal advice. Every finding includes citation context.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className={`${playfair.className} text-3xl text-white sm:text-4xl`}>
              How it works
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
            <article className="how-step how-step-1 rounded-2xl border border-white/10 bg-[#121212] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#C9A84C]/35 hover:bg-[#141414]">
              <p className={`${playfair.className} text-4xl leading-none text-[#C9A84C] sm:text-5xl`}>
                01
              </p>
              <h3 className="mt-5 text-xl font-semibold text-white">Upload securely</h3>
              <p className="mt-3 text-sm leading-7 text-neutral-400 sm:text-base">
                Upload legal documents privately through a secure workflow so your
                analysis starts fast without compromising confidentiality.
              </p>
            </article>

            <article className="how-step how-step-2 rounded-2xl border border-white/10 bg-[#121212] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#C9A84C]/35 hover:bg-[#141414]">
              <p className={`${playfair.className} text-4xl leading-none text-[#C9A84C] sm:text-5xl`}>
                02
              </p>
              <h3 className="mt-5 text-xl font-semibold text-white">
                AI reads every clause
              </h3>
              <p className="mt-3 text-sm leading-7 text-neutral-400 sm:text-base">
                Lexalyze scans the full document, identifies clauses, deadlines,
                risks, and obligations, then structures everything in a clear format.
              </p>
            </article>

            <article className="how-step how-step-3 rounded-2xl border border-white/10 bg-[#121212] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#C9A84C]/35 hover:bg-[#141414]">
              <p className={`${playfair.className} text-4xl leading-none text-[#C9A84C] sm:text-5xl`}>
                03
              </p>
              <h3 className="mt-5 text-xl font-semibold text-white">
                Understand and act
              </h3>
              <p className="mt-3 text-sm leading-7 text-neutral-400 sm:text-base">
                Receive plain-language explanations, key risk flags, and practical
                action guidance so you can decide with confidence.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="relative px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className={`${playfair.className} text-3xl text-white sm:text-4xl`}>
              What Lexalyze reads
            </h2>
            <p className="mt-4 text-sm leading-7 text-neutral-400 sm:text-base">
              Lexalyze analyses common legal documents and surfaces hidden risks,
              obligations, and deadlines before they become expensive surprises.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
            <article className="reads-card rounded-2xl border border-white/10 bg-[#121212] p-6">
              <h3 className="text-lg font-semibold text-white">Rental agreements</h3>
              <p className="mt-3 text-sm leading-7 text-neutral-400 sm:text-base">
                Detects hidden fees, lock-in clauses, deposit risks, notice periods, and
                maintenance obligations.
              </p>
            </article>

            <article className="reads-card rounded-2xl border border-white/10 bg-[#121212] p-6">
              <h3 className="text-lg font-semibold text-white">Employment contracts</h3>
              <p className="mt-3 text-sm leading-7 text-neutral-400 sm:text-base">
                Flags restrictive clauses, probation terms, termination conditions, and
                non-compete risks.
              </p>
            </article>

            <article className="reads-card rounded-2xl border border-white/10 bg-[#121212] p-6">
              <h3 className="text-lg font-semibold text-white">Loan agreements</h3>
              <p className="mt-3 text-sm leading-7 text-neutral-400 sm:text-base">
                Highlights repayment obligations, penalties, interest terms, and default
                clauses.
              </p>
            </article>

            <article className="reads-card rounded-2xl border border-white/10 bg-[#121212] p-6">
              <h3 className="text-lg font-semibold text-white">Insurance policies</h3>
              <p className="mt-3 text-sm leading-7 text-neutral-400 sm:text-base">
                Surfaces exclusions, claim limitations, waiting periods, and hidden
                conditions.
              </p>
            </article>

            <article className="reads-card rounded-2xl border border-white/10 bg-[#121212] p-6">
              <h3 className="text-lg font-semibold text-white">Legal notices</h3>
              <p className="mt-3 text-sm leading-7 text-neutral-400 sm:text-base">
                Identifies deadlines, response obligations, escalation risks, and legal
                exposure.
              </p>
            </article>

            <article className="reads-card rounded-2xl border border-white/10 bg-[#121212] p-6">
              <h3 className="text-lg font-semibold text-white">Vendor agreements</h3>
              <p className="mt-3 text-sm leading-7 text-neutral-400 sm:text-base">
                Flags liability clauses, payment obligations, auto-renewals, and
                termination risks.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="relative px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className={`${playfair.className} text-3xl text-white sm:text-4xl`}>
              Trust &amp; Security
            </h2>
            <p className="mt-4 text-sm leading-7 text-neutral-400 sm:text-base">
              Lexalyze is built to prioritize transparency, privacy, and responsible
              AI analysis at every step of your document workflow.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
            <article className="trust-card rounded-2xl border border-white/10 bg-[#121212] p-5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#C9A84C]/35 bg-[#C9A84C]/10 text-lg text-[#C9A84C]">
                🔒
              </span>
              <h3 className="mt-4 text-lg font-semibold text-white">Encrypted in transit</h3>
              <p className="mt-2 text-sm leading-7 text-neutral-400">
                Uploaded documents are securely transmitted using encrypted connections
                to protect your data while it moves through the analysis flow.
              </p>
            </article>

            <article className="trust-card rounded-2xl border border-white/10 bg-[#121212] p-5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#C9A84C]/35 bg-[#C9A84C]/10 text-lg text-[#C9A84C]">
                🗑️
              </span>
              <h3 className="mt-4 text-lg font-semibold text-white">Deleted after analysis</h3>
              <p className="mt-2 text-sm leading-7 text-neutral-400">
                Documents are removed after processing and are not permanently stored,
                helping minimize long-term data retention risk.
              </p>
            </article>

            <article className="trust-card rounded-2xl border border-white/10 bg-[#121212] p-5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#C9A84C]/35 bg-[#C9A84C]/10 text-lg text-[#C9A84C]">
                📌
              </span>
              <h3 className="mt-4 text-lg font-semibold text-white">Every finding cited</h3>
              <p className="mt-2 text-sm leading-7 text-neutral-400">
                Every risk, clause, and conclusion includes an exact citation from
                your document so you can verify what the AI is referencing.
              </p>
            </article>

            <article className="trust-card rounded-2xl border border-white/10 bg-[#121212] p-5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#C9A84C]/35 bg-[#C9A84C]/10 text-lg text-[#C9A84C]">
                ⚖️
              </span>
              <h3 className="mt-4 text-lg font-semibold text-white">Honest about limits</h3>
              <p className="mt-2 text-sm leading-7 text-neutral-400">
                Lexalyze clearly states when information cannot be confidently
                determined, so you can make decisions with realistic expectations.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="relative px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className={`${playfair.className} text-3xl text-white sm:text-4xl`}>
              Frequently asked questions
            </h2>
          </div>

          <div className="mt-10 space-y-3 sm:space-y-4">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <article
                  key={item.question}
                  className="faq-item rounded-2xl border border-white/10 bg-[#121212]"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex((current) => (current === index ? -1 : index))}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
                    aria-expanded={isOpen}
                  >
                    <span className="text-base font-semibold text-white sm:text-lg">
                      {item.question}
                    </span>
                    <span
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#C9A84C]/35 text-[#C9A84C] transition-transform duration-300 ${
                        isOpen ? "rotate-180" : "rotate-0"
                      }`}
                      aria-hidden
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-4 w-4"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </span>
                  </button>

                  <div
                    className={`overflow-hidden px-5 transition-all duration-300 ease-out sm:px-6 ${
                      isOpen ? "max-h-40 pb-5 opacity-100" : "max-h-0 pb-0 opacity-0"
                    }`}
                  >
                    <p className="text-sm leading-7 text-neutral-400 sm:text-base">
                      {item.answer}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#C9A84C]">
                Product
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-neutral-400">
                <li><a href="#" className="footer-link">Features</a></li>
                <li><a href="#" className="footer-link">Live demo</a></li>
                <li><a href="#" className="footer-link">Security</a></li>
                <li><a href="#" className="footer-link">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#C9A84C]">
                Company
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-neutral-400">
                <li><a href="#" className="footer-link">About</a></li>
                <li><a href="#" className="footer-link">Contact</a></li>
                <li><a href="#" className="footer-link">Privacy Policy</a></li>
                <li><a href="#" className="footer-link">Terms of Service</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#C9A84C]">
                Resources
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-neutral-400">
                <li><a href="#" className="footer-link">Supported documents</a></li>
                <li><a href="#" className="footer-link">Trust &amp; Safety</a></li>
                <li><a href="#" className="footer-link">Help Center</a></li>
                <li><a href="#" className="footer-link">Status</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6">
            <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-neutral-500">© 2026 Lexalyze. All rights reserved.</p>
              <p className="max-w-2xl text-xs leading-6 text-neutral-500 sm:text-right">
                Not legal advice. Lexalyze provides AI-generated insights and is not a
                substitute for legal advice.
              </p>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .hero-fade-up {
          animation: fadeUp 650ms ease-out both;
        }
        .hero-fade-up-delay {
          animation: fadeUp 760ms ease-out both;
          animation-delay: 110ms;
        }
        .hero-fade-up-delay-2 {
          animation: fadeUp 820ms ease-out both;
          animation-delay: 180ms;
        }
        .hero-fade-up-delay-3 {
          animation: fadeUp 900ms ease-out both;
          animation-delay: 250ms;
        }
        .hero-gradient {
          animation: drift 14s ease-in-out infinite alternate;
        }
        .hero-gradient-slow {
          animation: driftSlow 18s ease-in-out infinite alternate;
        }
        .demo-gradient {
          animation: driftDemo 16s ease-in-out infinite alternate;
        }
        .how-step {
          animation: fadeUpSoft 620ms ease-out both;
        }
        .how-step-1 { animation-delay: 70ms; }
        .how-step-2 { animation-delay: 150ms; }
        .how-step-3 { animation-delay: 230ms; }
        .reads-card {
          box-shadow: 0 0 0 1px rgba(255,255,255,0.01), 0 10px 28px rgba(0,0,0,0.28);
          transition: transform 260ms ease, border-color 260ms ease, box-shadow 260ms ease, background-color 260ms ease;
        }
        .reads-card:hover {
          transform: translateY(-4px);
          border-color: rgba(201,168,76,0.35);
          background-color: #141414;
          box-shadow: 0 0 0 1px rgba(201,168,76,0.12), 0 14px 36px rgba(201,168,76,0.08), 0 16px 36px rgba(0,0,0,0.34);
        }
        .trust-card {
          box-shadow: 0 0 0 1px rgba(255,255,255,0.01), 0 10px 26px rgba(0,0,0,0.26);
          transition: transform 260ms ease, border-color 260ms ease, box-shadow 260ms ease, background-color 260ms ease;
        }
        .trust-card:hover {
          transform: translateY(-4px);
          border-color: rgba(201,168,76,0.35);
          background-color: #141414;
          box-shadow: 0 0 0 1px rgba(201,168,76,0.1), 0 12px 34px rgba(201,168,76,0.07), 0 16px 34px rgba(0,0,0,0.32);
        }
        .faq-item {
          box-shadow: 0 0 0 1px rgba(255,255,255,0.01), 0 10px 26px rgba(0,0,0,0.24);
          transition: transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
        }
        .faq-item:hover {
          transform: translateY(-2px);
          border-color: rgba(201,168,76,0.32);
          box-shadow: 0 0 0 1px rgba(201,168,76,0.1), 0 10px 30px rgba(201,168,76,0.06), 0 14px 28px rgba(0,0,0,0.3);
        }
        .footer-link {
          color: rgb(163 163 163);
          transition: color 220ms ease, transform 220ms ease;
        }
        .footer-link:hover {
          color: #c9a84c;
          transform: translateX(2px);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translate3d(0, 10px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translate3d(0, 14px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        @keyframes fadeUpSoft {
          from { opacity: 0; transform: translate3d(0, 16px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        @keyframes drift {
          0% { transform: translate3d(-50%, -8px, 0) scale(1); }
          100% { transform: translate3d(-48%, 10px, 0) scale(1.04); }
        }
        @keyframes driftSlow {
          0% { transform: translate3d(0, -6px, 0) scale(1); }
          100% { transform: translate3d(-8px, 8px, 0) scale(1.03); }
        }
        @keyframes driftDemo {
          0% { transform: translate3d(-50%, -8px, 0) scale(1); }
          100% { transform: translate3d(-50%, 6px, 0) scale(1.05); }
        }
      `}</style>
    </main>
  );
}