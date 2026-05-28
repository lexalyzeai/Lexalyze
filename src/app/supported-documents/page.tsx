import { Playfair_Display } from "next/font/google";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });

const DOCUMENT_TYPES = [
  {
    category: "Property & Real Estate",
    icon: "🏠",
    docs: [
      { name: "Residential Rental / Lease Agreement", notes: "Identifies excessive penalties, unfair lock-in clauses, unclear deposit terms" },
      { name: "Commercial Lease Agreement", notes: "Surfaces hidden rent escalation clauses, maintenance obligations" },
      { name: "Sale Deed (Agreement to Sell)", notes: "Checks title clarity, payment schedule, possession terms — references RERA where applicable" },
      { name: "Leave & Licence Agreement", notes: "Highlights key differences from tenancy, licence period terms" },
    ],
  },
  {
    category: "Employment & Work",
    icon: "💼",
    docs: [
      { name: "Employment Offer Letter", notes: "Checks non-compete scope, probation terms, ESOP vesting, termination clauses" },
      { name: "Employment Agreement / Contract", notes: "Full-spectrum review of salary, benefits, IP ownership, exit clauses" },
      { name: "Freelance / Contractor Agreement", notes: "Intellectual property assignment, payment terms, scope creep risks" },
      { name: "Non-Disclosure Agreement (NDA)", notes: "Scope of confidentiality, duration, overly broad restrictions" },
    ],
  },
  {
    category: "Finance & Loans",
    icon: "💰",
    docs: [
      { name: "Personal Loan Agreement", notes: "Interest rate, prepayment penalties, default clauses — references NI Act" },
      { name: "Home Loan Sanction Letter", notes: "Floating vs fixed rate risks, foreclosure charges" },
      { name: "Loan Against Property (LAP)", notes: "Security interest terms, repossession conditions" },
      { name: "Promissory Note", notes: "Enforceability under Negotiable Instruments Act, 1881" },
    ],
  },
  {
    category: "Business & Vendor",
    icon: "🤝",
    docs: [
      { name: "Service Agreement / SLA", notes: "SLA penalties, liability caps, termination for convenience" },
      { name: "Vendor / Supply Contract", notes: "Payment terms, exclusivity, IP in deliverables" },
      { name: "Partnership Deed", notes: "Profit sharing, exit provisions, authority of partners" },
      { name: "Shareholder Agreement", notes: "Drag-along / tag-along, pre-emption rights, board representation" },
    ],
  },
  {
    category: "Legal Notices & Disputes",
    icon: "⚖️",
    docs: [
      { name: "Legal Notice", notes: "Identifies the demand, deadline to respond, applicable law cited" },
      { name: "Settlement Agreement", notes: "Scope of release, confidentiality, enforceability" },
      { name: "Arbitration Agreement / Clause", notes: "Seat of arbitration, governing law, scope of disputes" },
    ],
  },
  {
    category: "Consumer & Insurance",
    icon: "🛡️",
    docs: [
      { name: "Insurance Policy Document", notes: "Exclusions, claim procedure, sub-limits — references Consumer Protection Act" },
      { name: "Subscription / Terms of Service", notes: "Auto-renewal traps, data usage, liability waivers" },
      { name: "E-commerce Purchase Order / Policy", notes: "Returns, warranties, dispute resolution" },
    ],
  },
];

export default function SupportedDocumentsPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-[#C9A84C]/30">
      <Navbar />
      <div className="mx-auto w-full max-w-4xl px-6 py-20 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A84C]">Resources</p>
        <h1 className={`${playfair.className} mt-4 text-4xl font-bold text-white sm:text-5xl`}>
          Supported documents
        </h1>
        <p className="mt-6 text-base leading-8 text-neutral-400">
          Lexalyze is trained to analyse a wide range of Indian legal documents. Below is a guide to what works best and what to expect for each category.
        </p>

        <div className="mt-4 rounded-2xl border border-[#C9A84C]/20 bg-[#C9A84C]/[0.04] p-5">
          <p className="text-sm leading-7 text-neutral-400">
            <strong className="text-[#C9A84C]">File formats accepted:</strong> PDF (.pdf) and Microsoft Word (.docx). Scanned PDFs (image-only) may produce poor results as text cannot be reliably extracted from images.
          </p>
        </div>

        <div className="mt-12 space-y-10">
          {DOCUMENT_TYPES.map((cat) => (
            <section key={cat.category}>
              <h2 className={`${playfair.className} flex items-center gap-3 text-xl font-semibold text-[#C9A84C]`}>
                <span>{cat.icon}</span>
                {cat.category}
              </h2>
              <div className="mt-5 space-y-3">
                {cat.docs.map((doc) => (
                  <div key={doc.name} className="rounded-2xl border border-white/[0.05] bg-white/[0.02] px-5 py-4">
                    <p className="text-sm font-semibold text-neutral-200">{doc.name}</p>
                    <p className="mt-1 text-xs leading-6 text-neutral-500">{doc.notes}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <h2 className={`${playfair.className} text-lg font-semibold text-white`}>Document quality tips</h2>
          <ul className="mt-4 space-y-2 text-sm leading-7 text-neutral-400">
            <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A84C]" />Use text-based PDFs (not scanned images) for best results</li>
            <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A84C]" />Documents up to 12,000 characters of text are processed in full; longer documents may be trimmed</li>
            <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A84C]" />English-language documents receive the most accurate analysis; Hindi support is in development</li>
            <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A84C]" />Remove blank pages and cover sheets for cleaner extraction</li>
          </ul>
        </div>

        <div className="mt-10">
          <Link href="/" className="text-sm font-medium text-[#C9A84C] hover:underline">← Back to home</Link>
        </div>
      </div>
    </main>
  );
}
