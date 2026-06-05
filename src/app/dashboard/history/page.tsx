import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { AnalysisResultData } from '@/app/components/AnalysisResult'

export default async function HistoryPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: analyses } = await supabase
    .from('analyses')
    .select('id, filename, created_at, result')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-8">
      <h1 className="mb-8 text-2xl font-semibold text-white">Analysis History</h1>

      {!analyses || analyses.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#121212] p-8 text-center">
          <p className="text-neutral-400">No analyses yet.</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block rounded-lg bg-[#C9A84C] px-6 py-2 text-sm font-semibold text-[#0A0A0A]"
          >
            Start your first analysis
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {analyses.map((analysis) => {
            const result = analysis.result as Pick<AnalysisResultData, 'overallConfidence' | 'oneLineSummary'> | null
            const confidence = result?.overallConfidence ?? 'N/A'
            const summary = result?.oneLineSummary ?? 'No summary available'
            const date = new Date(analysis.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })

            const confidenceColor =
              confidence === 'HIGH'
                ? 'bg-green-500/20 text-green-400'
                : confidence === 'MEDIUM'
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-red-500/20 text-red-400'

            return (
              <Link
                key={analysis.id}
                href={`/dashboard/analysis/${analysis.id}`}
                className="block rounded-xl border border-white/10 bg-[#121212] p-5 transition hover:border-[#C9A84C]/40 hover:bg-[#1a1a1a]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">
                      {analysis.filename}
                    </p>
                    <p className="mt-1 text-sm text-neutral-400">{summary}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${confidenceColor}`}>
                      {confidence}
                    </span>
                    <span className="text-xs text-neutral-500">{date}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
