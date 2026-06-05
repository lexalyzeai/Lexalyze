import { Playfair_Display } from "next/font/google";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });

const TOPICS = [
  {
    title: "How to analyse your first document",
    steps: [
      "Create a free account or sign in at lexalyze.in/auth/signup.",
      "From your dashboard, click 'New Analysis' or drag and drop your document file.",
      "Supported formats: PDF (.pdf) and Word documents (.docx). Scanned/image PDFs may not work.",
      "Select your preferred language (English or Hindi).",
      "Click 'Analyse document'. Analysis typically takes 15–60 seconds.",
      "Your results will appear and are automatically saved to your account.",
    ],
  },
  {
    title: "Understanding your analysis results",
    steps: [
      "Risk Score (1–10): 1 is very safe, 10 is very risky. This is an AI estimate, not a legal determination.",
      "Overall Confidence (HIGH/MEDIUM/LOW): How certain the AI is about its findings. LOW confidence means you should verify carefully.",
      "Red Flags: Clauses or missing protections the AI identified as potentially problematic. Each flag includes the exact quote from your document.",
      "Positive Points: Clauses that protect your interests.",
      "Missing Clauses: Standard protections that are absent from this type of document.",
      "Action Items: Specific things you should do before signing, ranked by priority.",
      "Negotiation Tips: Suggested changes you could request from the other party.",
    ],
  },
  {
    title: "How to ask follow-up questions",
    steps: [
      "Open any saved analysis from your dashboard.",
      "Scroll to the bottom of the analysis to find the 'Ask a follow-up question' section.",
      "Type your question in plain language — you do not need to use legal terminology.",
      "The AI will answer based on your specific document and the analysis it already performed.",
      "Follow-up questions and answers are saved automatically.",
    ],
  },
  {
    title: "Managing your analysis history",
    steps: [
      "All analyses are saved in the left sidebar of your dashboard.",
      "Click any entry to view the full analysis.",
      "Use the ⋮ menu on any item to pin it to the top of your list or delete it.",
      "To delete all history or your account, go to Settings (gear icon in the sidebar).",
    ],
  },
  {
    title: "PDF download / export",
    steps: [
      "Open any saved analysis.",
      "Look for the 'Download PDF' or export button in the top-right area of the analysis.",
      "This generates a formatted PDF report of the analysis that you can save or share with a lawyer.",
    ],
  },
];

const FAQS = [
  { q: "Is Lexalyze free?", a: "Yes. Starter is free with 5 documents per month, 3 follow-up questions per month, and 14-day history." },
  { q: "How many documents can I analyse?", a: "Starter includes 5 documents per month. Solo includes 30 documents per month, and Team includes unlimited documents." },
  { q: "Can I upload confidential documents?", a: "Your document text is sent to Groq's AI API for processing. We do not store the raw document file. If your document contains highly sensitive personal information, please review our Privacy Policy and consider whether you are comfortable with third-party AI processing." },
  { q: "Why does my PDF not work?", a: "Scanned or image-based PDFs cannot be read by our text extractor. Only text-based PDFs work. Try converting to a Word .docx if you have the original." },
  { q: "Is the analysis accurate?", a: "Lexalyze uses a powerful AI model, but AI can make mistakes. Always treat the analysis as a helpful first read, not a definitive legal opinion. Consult a lawyer for important decisions." },
  { q: "Can Lexalyze handle documents in Hindi?", a: "Basic Hindi support is available. Select Hindi when uploading. Results may be less accurate than English analysis — this is an area we are actively improving." },
];

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-[#C9A84C]/30">
      <Navbar />
      <div className="mx-auto w-full max-w-4xl px-6 py-20 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A84C]">Resources</p>
        <h1 className={`${playfair.className} mt-4 text-4xl font-bold text-white sm:text-5xl`}>
          Help Center
        </h1>
        <p className="mt-6 text-base leading-8 text-neutral-400">
          Everything you need to get the most out of Lexalyze.
        </p>

        <div className="mt-12 space-y-10">
          {TOPICS.map((topic) => (
            <section key={topic.title}>
              <h2 className={`${playfair.className} text-xl font-semibold text-[#C9A84C]`}>{topic.title}</h2>
              <ol className="mt-5 space-y-3">
                {topic.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-4 text-sm leading-7 text-neutral-400">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#C9A84C]/30 bg-[#C9A84C]/5 text-xs font-bold text-[#C9A84C]">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>

        <div className="mt-16 border-t border-white/[0.06] pt-12">
          <h2 className={`${playfair.className} text-2xl font-semibold text-white`}>Frequently asked questions</h2>
          <div className="mt-8 space-y-5">
            {FAQS.map((faq) => (
              <div key={faq.q} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <p className="text-sm font-semibold text-neutral-200">{faq.q}</p>
                <p className="mt-2 text-sm leading-7 text-neutral-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 rounded-2xl border border-[#C9A84C]/20 bg-[#C9A84C]/[0.04] p-6">
          <p className="text-sm leading-7 text-neutral-400">
            Still need help? Email us at{" "}
            <a href="mailto:lexalyze.ai@gmail.com" className="text-[#C9A84C] hover:underline">lexalyze.ai@gmail.com</a>{" "}
            and we will get back to you within 2–3 business days.
          </p>
        </div>

        <div className="mt-10">
          <Link href="/" className="text-sm font-medium text-[#C9A84C] hover:underline">← Back to home</Link>
        </div>
      </div>
    </main>
  );
}
