import { Playfair_Display } from "next/font/google";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });

export default function TrustSafetyPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-[#C9A84C]/30">
      <Navbar />
      <div className="mx-auto w-full max-w-3xl px-6 py-20 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A84C]">Resources</p>
        <h1 className={`${playfair.className} mt-4 text-4xl font-bold text-white sm:text-5xl`}>
          Trust &amp; Safety
        </h1>
        <p className="mt-6 text-base leading-8 text-neutral-400">
          We want you to use Lexalyze with confidence. This page explains how we handle your data, the limits of our AI, and how to use the tool responsibly.
        </p>

        <div className="mt-12 space-y-10 border-t border-white/[0.06] pt-10">

          <section>
            <h2 className={`${playfair.className} text-xl font-semibold text-[#C9A84C]`}>How we protect your documents</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-neutral-400">
              <li className="flex items-start gap-3"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A84C]" /><strong className="text-neutral-200">Encrypted in transit:</strong> All data sent between your browser and our servers is encrypted using HTTPS (TLS).</li>
              <li className="flex items-start gap-3"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A84C]" /><strong className="text-neutral-200">Not stored permanently:</strong> Raw document files are not stored on our servers. Only the AI-generated analysis text is saved to your account.</li>
              <li className="flex items-start gap-3"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A84C]" /><strong className="text-neutral-200">Your data is yours:</strong> You can delete any or all of your analysis history at any time from Settings. Account deletion removes all associated data.</li>
              <li className="flex items-start gap-3"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A84C]" /><strong className="text-neutral-200">No data selling:</strong> We do not sell, share, or use your data for advertising purposes.</li>
            </ul>
          </section>

          <section>
            <h2 className={`${playfair.className} text-xl font-semibold text-[#C9A84C]`}>Understanding confidence scores</h2>
            <p className="mt-4 text-sm leading-7 text-neutral-400">
              Every analysis comes with an overall confidence level (<strong className="text-neutral-200">HIGH / MEDIUM / LOW</strong>) and a risk score (1–10). Here is what they mean:
            </p>
            <div className="mt-5 space-y-3">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="text-sm font-semibold text-emerald-400">HIGH confidence</p>
                <p className="mt-1 text-xs leading-6 text-neutral-400">The document text was clear, standard, and the AI could identify all key clauses with high certainty. Results are likely reliable.</p>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-sm font-semibold text-amber-400">MEDIUM confidence</p>
                <p className="mt-1 text-xs leading-6 text-neutral-400">Some parts of the document were ambiguous or used unusual language. Review the flagged items with extra care.</p>
              </div>
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
                <p className="text-sm font-semibold text-rose-400">LOW confidence</p>
                <p className="mt-1 text-xs leading-6 text-neutral-400">The document was difficult to interpret — possibly due to heavy legalese, poor formatting, or unusual structure. We strongly recommend consulting a lawyer.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className={`${playfair.className} text-xl font-semibold text-[#C9A84C]`}>Known AI limitations</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-neutral-400">
              <li className="flex items-start gap-3"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500/60" />AI can hallucinate — it may generate plausible-sounding but incorrect information. Always cross-verify critical findings.</li>
              <li className="flex items-start gap-3"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500/60" />State-specific variations in Indian law may not always be accurately captured.</li>
              <li className="flex items-start gap-3"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500/60" />Scanned documents (image PDFs) may fail to extract text reliably.</li>
              <li className="flex items-start gap-3"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500/60" />The AI knowledge cutoff may not reflect very recent legal amendments or case law.</li>
            </ul>
          </section>

          <section>
            <h2 className={`${playfair.className} text-xl font-semibold text-[#C9A84C]`}>Using Lexalyze responsibly</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-neutral-400">
              <li className="flex items-start gap-3"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A84C]" />Use Lexalyze as a <strong className="text-neutral-200">first read</strong> — to understand what you are signing and flag potential issues before a lawyer review.</li>
              <li className="flex items-start gap-3"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A84C]" />For high-value or high-stakes contracts (property purchases, employment, loans), always get a qualified lawyer&apos;s opinion.</li>
              <li className="flex items-start gap-3"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A84C]" />Do not upload documents that contain sensitive information belonging to others without their consent.</li>
            </ul>
          </section>
        </div>

        <div className="mt-10">
          <Link href="/" className="text-sm font-medium text-[#C9A84C] hover:underline">← Back to home</Link>
        </div>
      </div>
    </main>
  );
}
