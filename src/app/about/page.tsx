import { Playfair_Display } from "next/font/google";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-[#C9A84C]/30">
      <Navbar />
      <div className="mx-auto w-full max-w-3xl px-6 py-20 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A84C]">About</p>
        <h1 className={`${playfair.className} mt-4 text-4xl font-bold text-white sm:text-5xl`}>
          What is Lexalyze?
        </h1>
        <p className="mt-6 text-base leading-8 text-neutral-400">
          Lexalyze is an AI-powered legal document analysis tool built to help everyday people in India understand the contracts and legal documents they sign. It was created as an independent project — not a registered company — by developers who believe that understanding your legal rights should not require paying thousands of rupees to a lawyer for every document review.
        </p>

        <div className="mt-14 space-y-10 border-t border-white/[0.06] pt-12">
          <section>
            <h2 className={`${playfair.className} text-2xl font-semibold text-[#C9A84C]`}>How it works</h2>
            <p className="mt-4 text-sm leading-8 text-neutral-400">
              You upload a legal document (PDF or Word). Lexalyze extracts the text and sends it to a large language model (LLaMA 3 via Groq) with a detailed legal analysis prompt covering Indian law — including the Indian Contract Act, Consumer Protection Act, RERA, and more. The AI returns a structured analysis: risk flags, plain-language summaries, missing clauses, negotiation tips, and action items. Results are saved to your account so you can review them any time.
            </p>
          </section>

          <section>
            <h2 className={`${playfair.className} text-2xl font-semibold text-[#C9A84C]`}>What it is not</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-neutral-400">
              <li className="flex items-start gap-3"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A84C]" />Lexalyze is <strong className="text-neutral-200">not a law firm</strong> and does not provide legal advice.</li>
              <li className="flex items-start gap-3"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A84C]" />Lexalyze is <strong className="text-neutral-200">not a registered company</strong>. It is an independent open project.</li>
              <li className="flex items-start gap-3"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A84C]" />The AI can make mistakes. Always consult a qualified lawyer before signing important documents.</li>
              <li className="flex items-start gap-3"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A84C]" />Lexalyze is currently focused on Indian legal context. Documents governed by other jurisdictions may receive less accurate analysis.</li>
            </ul>
          </section>

          <section>
            <h2 className={`${playfair.className} text-2xl font-semibold text-[#C9A84C]`}>Built with</h2>
            <p className="mt-4 text-sm leading-8 text-neutral-400">
              Lexalyze is built on Next.js, Supabase for authentication and storage, and Groq's LLaMA 3.3 70B model for AI analysis. Document text is extracted from PDFs using standard parsing libraries and from Word documents using Mammoth.js.
            </p>
          </section>
        </div>

        <div className="mt-14 rounded-2xl border border-[#C9A84C]/20 bg-[#C9A84C]/[0.04] p-6">
          <p className="text-sm leading-7 text-neutral-400">
            <strong className="text-[#C9A84C]">Important disclaimer:</strong> Lexalyze provides AI-generated insights for informational purposes only. It is not a substitute for professional legal advice. For any important legal matter, please consult a qualified advocate or legal professional.
          </p>
        </div>

        <div className="mt-10 flex gap-4">
          <Link href="/" className="text-sm font-medium text-[#C9A84C] hover:underline">← Back to home</Link>
          <Link href="/contact" className="text-sm font-medium text-neutral-400 hover:text-white">Contact us →</Link>
        </div>
      </div>
    </main>
  );
}
