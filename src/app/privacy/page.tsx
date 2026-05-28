import { Playfair_Display } from "next/font/google";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });

const LAST_UPDATED = "27 May 2026";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-[#C9A84C]/30">
      <Navbar />
      <div className="mx-auto w-full max-w-3xl px-6 py-20 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A84C]">Legal</p>
        <h1 className={`${playfair.className} mt-4 text-4xl font-bold text-white sm:text-5xl`}>
          Privacy Policy
        </h1>
        <p className="mt-4 text-xs text-neutral-500">Last updated: {LAST_UPDATED}</p>
        <p className="mt-6 text-base leading-8 text-neutral-400">
          Lexalyze is an independent, non-commercial project. We take your privacy seriously and are transparent about how your data is handled.
        </p>

        <div className="mt-12 space-y-10 border-t border-white/[0.06] pt-10">

          <section>
            <h2 className={`${playfair.className} text-xl font-semibold text-[#C9A84C]`}>1. What data we collect</h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-neutral-400">
              <p><strong className="text-neutral-200">Account data:</strong> When you sign up, we collect your email address. This is stored securely in Supabase (a Postgres-based cloud database). We do not collect your name, phone number, or any other personal identifier unless you voluntarily provide it.</p>
              <p><strong className="text-neutral-200">Document text:</strong> When you upload a document for analysis, we extract the text content and send it to Groq's API for AI processing. We store the analysis result (the AI-generated summary and findings) in your account. We do not permanently store the raw document file on our servers.</p>
              <p><strong className="text-neutral-200">Follow-up questions:</strong> Any follow-up questions you ask about a document, along with the AI's answers, are stored in your account so you can review them later.</p>
              <p><strong className="text-neutral-200">Usage data:</strong> Basic server logs may be generated as part of normal web application operation. We do not use third-party analytics trackers or advertising cookies.</p>
            </div>
          </section>

          <section>
            <h2 className={`${playfair.className} text-xl font-semibold text-[#C9A84C]`}>2. How your documents are processed</h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-neutral-400">
              <p>When you upload a document, its text content is sent to <strong className="text-neutral-200">Groq's API</strong> (api.groq.com) for AI analysis. This means the document text leaves our application and is processed by Groq's infrastructure. Groq's own privacy policy governs how they handle API request data.</p>
              <p>We strongly recommend that you do not upload documents containing highly sensitive personal information (such as Aadhaar numbers, bank account details, or medical records) unless you are comfortable with how third-party AI APIs handle data.</p>
              <p>We do not use your document content to train AI models, advertise to you, or share it with any third party other than Groq for the purpose of generating your analysis.</p>
            </div>
          </section>

          <section>
            <h2 className={`${playfair.className} text-xl font-semibold text-[#C9A84C]`}>3. Data storage</h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-neutral-400">
              <p>Your account data and saved analyses are stored in <strong className="text-neutral-200">Supabase</strong>, a cloud database service. Supabase stores data in data centres with industry-standard security practices.</p>
              <p>You can delete your analysis history or your entire account at any time from the Settings panel inside the dashboard. When you delete your account, all associated data is permanently removed.</p>
            </div>
          </section>

          <section>
            <h2 className={`${playfair.className} text-xl font-semibold text-[#C9A84C]`}>4. We do not sell your data</h2>
            <p className="mt-4 text-sm leading-7 text-neutral-400">
              We do not sell, rent, or trade your personal data or document content to any third party, ever. Lexalyze has no advertising model and is not monetised through data.
            </p>
          </section>

          <section>
            <h2 className={`${playfair.className} text-xl font-semibold text-[#C9A84C]`}>5. Cookies &amp; authentication</h2>
            <p className="mt-4 text-sm leading-7 text-neutral-400">
              Lexalyze uses browser cookies solely for authentication sessions (provided by Supabase Auth). These are necessary for you to stay logged in and are not used for tracking or advertising purposes.
            </p>
          </section>

          <section>
            <h2 className={`${playfair.className} text-xl font-semibold text-[#C9A84C]`}>6. Contact</h2>
            <p className="mt-4 text-sm leading-7 text-neutral-400">
              If you have any questions or concerns about this Privacy Policy, please contact us at{" "}
              <a href="mailto:privacy@lexalyze.in" className="text-[#C9A84C] hover:underline">privacy@lexalyze.in</a>.
            </p>
          </section>
        </div>

        <div className="mt-12 flex flex-wrap gap-4">
          <Link href="/" className="text-sm font-medium text-[#C9A84C] hover:underline">← Back to home</Link>
          <Link href="/terms" className="text-sm font-medium text-neutral-400 hover:text-white">Terms of Service →</Link>
        </div>
      </div>
    </main>
  );
}
