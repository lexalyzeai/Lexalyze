import { redirect } from 'next/navigation'
import { getAnalysisById } from '@/lib/analyses'
import AnalysisResult, { AnalysisResultData } from '@/app/components/AnalysisResult'
import { Playfair_Display } from 'next/font/google'
import Link from 'next/link'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['600', '700'] })

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const analysis = await getAnalysisById(id)

  if (!analysis) redirect('/dashboard')

  const r = analysis.result

  const mapped: AnalysisResultData = {
    credibilityPercent:
      r.overallConfidence === 'HIGH' ? 90
      : r.overallConfidence === 'MEDIUM' ? 65
      : 40,
    overallConfidence: r.overallConfidence ?? 'LOW',
    documentTitle: r.documentTitle ?? 'Document',
    oneLineSummary: r.oneLineSummary ?? '',
    fullSummary: r.fullSummary ?? '',
    keyNumbersAndDates: [
      ...(r.keyNumbers ?? []),
      ...(r.keyDeadlines ?? []),
    ],
    riskFlags: (r.redFlags ?? []).map((f: any) => ({
      title: f.title,
      description: f.explanation,
      confidence: f.confidence,
      quote: f.exactQuote,
    })),
    favourableClauses: (r.positivePoints ?? []).map((p: any) => ({
      title: p.title,
      description: p.explanation,
      confidence: p.confidence,
      quote: p.exactQuote,
    })),
    actionChecklist: r.actionItems ?? [],
    cannotDetermineList: r.cannotDetermineList ?? [],
    lawyerGuidance: r.lawyerGuidance,
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0A0A0A]">
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-10">
          <Link
            href="/dashboard"
            className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-400 transition hover:text-[#C9A84C]"
          >
            ← Back to Dashboard
          </Link>
          <h1 className={`${playfair.className} mb-2 text-2xl text-white`}>
            {analysis.filename}
          </h1>
          <p className="mb-8 text-xs text-neutral-500">
            {new Date(analysis.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          <AnalysisResult data={mapped} analysisId={id} />
        </div>
      </main>
    </div>
  )
}