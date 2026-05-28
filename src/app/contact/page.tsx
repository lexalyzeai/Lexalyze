import { Playfair_Display } from "next/font/google";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-[#C9A84C]/30">
      <Navbar />
      <div className="mx-auto w-full max-w-3xl px-6 py-20 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A84C]">Contact</p>
        <h1 className={`${playfair.className} mt-4 text-4xl font-bold text-white sm:text-5xl`}>
          Get in touch
        </h1>
        <p className="mt-6 text-base leading-8 text-neutral-400">
          Have a question, feedback, or found a bug? We would love to hear from you. Lexalyze is an independent project and we read every message.
        </p>

        <div className="mt-12 space-y-6">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
            <h2 className={`${playfair.className} text-xl font-semibold text-[#C9A84C]`}>General enquiries</h2>
            <p className="mt-3 text-sm leading-7 text-neutral-400">
              For general questions about the product, how it works, or anything else:
            </p>
            <a
              href="mailto:lexalyze.ai@gmail.com"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#C9A84C]/40 px-5 py-2.5 text-sm font-medium text-[#C9A84C] transition hover:bg-[#C9A84C]/10"
            >
              lexalyze.ai@gmail.com
            </a>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
            <h2 className={`${playfair.className} text-xl font-semibold text-[#C9A84C]`}>Bug reports &amp; issues</h2>
            <p className="mt-3 text-sm leading-7 text-neutral-400">
              If you encountered an error, incorrect analysis, or a technical problem, please include:
            </p>
            <ul className="mt-4 space-y-2 text-sm text-neutral-400">
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A84C]/60" />A brief description of the issue</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A84C]/60" />The type of document you were analysing (no need to share the actual document)</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A84C]/60" />What you expected to happen vs what actually happened</li>
            </ul>
            <a
              href="mailto:lexalyze.ai@gmail.com"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#C9A84C]/40 px-5 py-2.5 text-sm font-medium text-[#C9A84C] transition hover:bg-[#C9A84C]/10"
            >
              lexalyze.ai@gmail.com
            </a>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
            <h2 className={`${playfair.className} text-xl font-semibold text-[#C9A84C]`}>Response time</h2>
            <p className="mt-3 text-sm leading-7 text-neutral-400">
              We aim to respond within 2–3 business days. This is an independent project so response times may vary. We genuinely appreciate your patience and every piece of feedback you send.
            </p>
          </div>
        </div>

        <div className="mt-10">
          <Link href="/" className="text-sm font-medium text-[#C9A84C] hover:underline">← Back to home</Link>
        </div>
      </div>
    </main>
  );
}
