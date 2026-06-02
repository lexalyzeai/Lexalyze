import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AnalysisResult from '@/app/components/AnalysisResult'
import { Playfair_Display } from 'next/font/google'
import Link from 'next/link'
import { normalizePlan } from '@/lib/plans'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { getAnalysisAccess } from '@/lib/team-workspace'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['600', '700'] })

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

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

  const admin = createSupabaseAdmin()
  const access = await getAnalysisAccess(admin, user, id)
  if (!access) redirect('/dashboard')

  const { data: analysis } = await admin
    .from('analyses')
    .select('*')
    .eq('id', id)
    .single()

  if (!analysis) redirect('/dashboard')

  const { data: followUps } = await admin
    .from('followups')
    .select('question, answer')
    .eq('analysis_id', id)
    .order('created_at', { ascending: true })

  const { data: profile } = await admin
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .maybeSingle()

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
            {analysis.result?.oneLineSummary || analysis.filename}
          </h1>
          <p className="mb-8 text-xs text-neutral-500">
            {new Date(analysis.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          <AnalysisResult
            result={analysis.result}
            analysisId={id}
            plan={analysis.workspace_id ? 'team' : normalizePlan(profile?.plan)}
            language={analysis.language || 'en'}
            savedChecklist={analysis.checklist_state || analysis.result?.checkbox || []}
            savedFollowUps={followUps || []}
          />
        </div>
      </main>
    </div>
  )
}
