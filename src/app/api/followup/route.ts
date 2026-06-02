import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { FOLLOWUP_PROMPT } from '@/lib/prompt'
import { AnalysisResult } from '@/types/analysis'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { currentUsageMonth, normalizePlan, PLAN_LIMITS, usageMonthRange } from '@/lib/plans'
import { FRIENDLY_ERRORS } from '@/lib/error-handling'
import { getAnalysisAccess } from '@/lib/team-workspace'

export async function POST(req: NextRequest) {
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
  if (!user) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.unauthorized.message, code: 'unauthorized' }, { status: 401 })
  }

  const { question, analysisId, language } = await req.json().catch(() => ({ question: '', analysisId: '', language: 'en' }))

  if (!question || !analysisId) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.validation.message, code: 'validation' }, { status: 400 })
  }

  const admin = createSupabaseAdmin()
  const access = await getAnalysisAccess(admin, user, analysisId)

  if (!access) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.not_found.message, code: 'not_found' }, { status: 404 })
  }

  if (!access.canWrite) {
    return NextResponse.json({ error: 'Viewers can read team analyses but cannot ask follow-up questions.', code: 'forbidden' }, { status: 403 })
  }

  const { data: analysis } = await admin
    .from('analyses')
    .select('result, document_text')
    .eq('id', analysisId)
    .single()

  if (!analysis) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.not_found.message, code: 'not_found' }, { status: 404 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .maybeSingle()

  const isTeamAnalysis = Boolean(access.analysis.workspace_id)
  const plan = isTeamAnalysis ? 'team' : normalizePlan(profile?.plan)
  const followUpLimit = PLAN_LIMITS[plan].monthlyFollowUps

  if (followUpLimit !== null) {
    const { data: userAnalyses, error: analysesError } = await admin
      .from('analyses')
      .select('id')
      .eq('user_id', user.id)
      .is('workspace_id', null)

    if (analysesError) {
      console.error('Follow-up monthly usage lookup failed:', analysesError)
      return NextResponse.json({ error: FRIENDLY_ERRORS.load_failed.message, code: 'load_failed' }, { status: 500 })
    }

    const analysisIds = (userAnalyses ?? []).map((item) => item.id)
    let followupCount = 0

    if (analysisIds.length > 0) {
      const { startIso, endIso } = usageMonthRange(currentUsageMonth())
      const { count, error: countError } = await admin
        .from('followups')
        .select('*', { count: 'exact', head: true })
        .in('analysis_id', analysisIds)
        .gte('created_at', startIso)
        .lt('created_at', endIso)

      if (countError) {
        console.error('Follow-up monthly count failed:', countError)
        return NextResponse.json({ error: FRIENDLY_ERRORS.load_failed.message, code: 'load_failed' }, { status: 500 })
      }

      followupCount = count ?? 0
    }

    if (followupCount >= followUpLimit) {
      return NextResponse.json(
        { error: `Monthly follow-up limit reached (${followUpLimit} follow-up questions per month on Starter plan). Upgrade to Solo for unlimited follow-ups.`, code: 'rate_limit_hit' },
        { status: 429 }
      )
    }
  }

  const result = analysis.result as AnalysisResult
  const documentText = analysis.document_text || ''

  const userContent = `ORIGINAL DOCUMENT:
${documentText}

EXISTING ANALYSIS SUMMARY:
- Document Type: ${result.documentType || 'Unknown'}
- Risk Score: ${result.riskScore ?? 'N/A'}/10
- Party Favour: ${result.partyFavour || 'Unknown'}
- Red Flags: ${result.redFlags?.map((r) => r.title).join(', ') || 'None detected'}
- Missing Clauses: ${result.missingClauses?.map((m) => m.clause).join(', ') || 'None detected'}
- Full Summary: ${result.fullSummary || 'No summary available'}

USER QUESTION: ${question}`

  try {
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: FOLLOWUP_PROMPT(language || 'en') },
            { role: 'user', content: userContent }
          ],
          temperature: 0.1,
          top_p: 0.85,
          max_tokens: 1000,
        })
      }
    )

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      console.error('Groq followup error:', errorBody)
      return NextResponse.json({ error: FRIENDLY_ERRORS.ai_capacity.message, code: 'ai_capacity' }, { status: 503 })
    }

    const data = await response.json()
    const answer = data.choices?.[0]?.message?.content

    if (!answer) {
      return NextResponse.json({ error: FRIENDLY_ERRORS.api_failure.message, code: 'api_failure' }, { status: 500 })
    }

    await admin
      .from('followups')
      .insert({ analysis_id: analysisId, question, answer })

    return NextResponse.json({ answer })

  } catch (err) {
    console.error('Followup error:', err)
    return NextResponse.json({ error: FRIENDLY_ERRORS.api_failure.message, code: 'api_failure' }, { status: 500 })
  }
}
