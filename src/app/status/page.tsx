import { Playfair_Display } from "next/font/google";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });

const SYSTEMS = [
  { name: "Web Application", status: "operational", note: "Dashboard, document upload, analysis display" },
  { name: "AI Analysis API", status: "operational", note: "Document analysis via Groq LLaMA 3.3 70B" },
  { name: "Follow-up Questions", status: "operational", note: "Contextual AI follow-up on saved analyses" },
  { name: "Authentication", status: "operational", note: "Sign up, sign in, session management" },
  { name: "Data Storage", status: "operational", note: "Saved analyses, checklist persistence via Supabase" },
  { name: "PDF Export", status: "operational", note: "Download analysis as PDF report" },
];

export default function StatusPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-[#C9A84C]/30">
      <Navbar />
      <div className="mx-auto w-full max-w-3xl px-6 py-20 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A84C]">Resources</p>
        <h1 className={`${playfair.className} mt-4 text-4xl font-bold text-white sm:text-5xl`}>
          System Status
        </h1>
        <p className="mt-6 text-base leading-8 text-neutral-400">
          Current status of all Lexalyze services.
        </p>

        <div className="mt-10 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-6 py-4">
          <span className="h-3 w-3 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <p className="text-sm font-semibold text-emerald-400">All systems operational</p>
        </div>

        <div className="mt-8 space-y-3">
          {SYSTEMS.map((sys) => (
            <div key={sys.name} className="flex items-center justify-between rounded-2xl border border-white/[0.05] bg-white/[0.02] px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-neutral-200">{sys.name}</p>
                <p className="mt-0.5 text-xs text-neutral-500">{sys.note}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium capitalize text-emerald-400">{sys.status}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-white/[0.06] pt-8">
          <h2 className={`${playfair.className} text-lg font-semibold text-neutral-200`}>Incident history</h2>
          <p className="mt-4 text-sm text-neutral-500">No incidents reported in the last 30 days.</p>
        </div>

        <div className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="text-xs leading-6 text-neutral-500">
            Note: Lexalyze relies on third-party services (Groq API, Supabase) for AI processing and data storage. Disruptions to those upstream services may temporarily affect Lexalyze functionality. If you experience an issue, please contact{" "}
            <a href="mailto:lexalyze.ai@gmail.com" className="text-[#C9A84C] hover:underline">lexalyze.ai@gmail.com</a>.
          </p>
        </div>

        <div className="mt-10">
          <Link href="/" className="text-sm font-medium text-[#C9A84C] hover:underline">← Back to home</Link>
        </div>
      </div>
    </main>
  );
}
