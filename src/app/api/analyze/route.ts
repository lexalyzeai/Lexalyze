import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { analyzeDocument } from '@/lib/groq'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { currentUsageMonth, normalizePlan, PLAN_CATALOG, PLAN_LIMITS } from '@/lib/plans'
import { FRIENDLY_ERRORS } from '@/lib/error-handling'
import { isProbablyLegalDocument, LEGAL_DOCUMENT_ERROR } from '@/lib/legal-document'
import { cleanupExpiredAnalyses, getPlanStorageLimitBytes, getStoredDocumentBytes, textStorageBytes } from '@/lib/plan-maintenance'
import { getWorkspaceMembership, TEAM_WRITE_ROLES } from '@/lib/team-workspace'

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

  const { text, language, filename, workspaceId } = await req.json().catch(() => ({ text: '', language: 'en', filename: 'document', workspaceId: null }))

  if (!text || text.trim().length === 0) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.validation.message, code: 'validation' }, { status: 400 })
  }

  if (!isProbablyLegalDocument(text)) {
    return NextResponse.json({ error: LEGAL_DOCUMENT_ERROR, code: 'non_legal_document' }, { status: 400 })
  }

  try {
    const admin = createSupabaseAdmin()
    const usageMonth = currentUsageMonth()

    const { data: profile } = await admin
      .from('profiles')
      .select('id, full_name, analyses_used, plan, usage_month, monthly_analyses_used')
      .eq('id', user.id)
      .maybeSingle()

    const plan = normalizePlan(profile?.plan)
    const requestedWorkspaceId = typeof workspaceId === 'string' && workspaceId.trim() ? workspaceId.trim() : null
    let effectivePlan = plan
    let analysisWorkspaceId: string | null = null

    if (requestedWorkspaceId) {
      const member = await getWorkspaceMembership(admin, user, requestedWorkspaceId)
      if (!member) {
        return NextResponse.json({ error: 'You do not have access to this team workspace.', code: 'forbidden' }, { status: 403 })
      }
      if (!TEAM_WRITE_ROLES.has(member.role)) {
        return NextResponse.json({ error: 'Viewers can read team analyses but cannot upload new documents.', code: 'forbidden' }, { status: 403 })
      }
      effectivePlan = 'team'
      analysisWorkspaceId = requestedWorkspaceId
    }

    const used = profile?.usage_month === usageMonth ? profile.monthly_analyses_used ?? 0 : 0

    const effectiveLimit = PLAN_LIMITS[effectivePlan].monthlyDocuments
    if (effectiveLimit !== null && used >= effectiveLimit) {
      const nextPlan = effectivePlan === 'free' ? 'Solo' : 'Team'
      return NextResponse.json(
        { error: `Monthly limit reached (${effectiveLimit} documents on ${effectivePlan === 'free' ? 'Starter' : 'Solo'} plan). Upgrade to ${nextPlan} to continue.`, code: 'rate_limit_hit' },
        { status: 429 }
      )
    }

    if (!analysisWorkspaceId) {
      await cleanupExpiredAnalyses(admin, user.id, effectivePlan)
    }

    const storageLimitBytes = getPlanStorageLimitBytes(effectivePlan)
    const storedBytes = await getStoredDocumentBytes(admin, user.id, analysisWorkspaceId)
    const incomingBytes = textStorageBytes(text)

    if (storedBytes + incomingBytes > storageLimitBytes) {
      const planName = PLAN_CATALOG[effectivePlan].name
      const storageMb = PLAN_CATALOG[effectivePlan].storageMb
      const upgradeMessage = effectivePlan === 'free' ? 'Delete older history or upgrade to Solo for 50 MB.' : effectivePlan === 'solo' ? 'Delete older history or upgrade to Team for 200 MB.' : 'Delete older team analyses before uploading more documents.'
      return NextResponse.json(
        { error: `Storage limit reached (${storageMb} MB on ${planName} plan). ${upgradeMessage}`, code: 'storage_limit_hit' },
        { status: 413 }
      )
    }

    const result = await analyzeDocument(text, language || 'en')

    const { data: analysis, error: saveError } = await admin
      .from('analyses')
      .insert({
        user_id: user.id,
        workspace_id: analysisWorkspaceId,
        filename: filename || 'document',
        language: language || 'en',
        result,
        title: result.documentTitle,
        document_text: text,
      })
      .select()
      .single()

    if (saveError) {
      console.error('Save error:', saveError)
      return NextResponse.json({ error: FRIENDLY_ERRORS.save_failed.message, code: 'save_failed' }, { status: 500 })
    }

    if (!analysisWorkspaceId) {
      await admin
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: profile?.full_name ?? user.user_metadata?.full_name ?? null,
          analyses_used: (profile?.analyses_used ?? 0) + 1,
          plan,
          usage_month: usageMonth,
          monthly_analyses_used: used + 1,
        })
    }

    return NextResponse.json({ result, analysisId: analysis?.id })

  } catch (err) {
    console.error('Analysis error:', err)

    const message = err instanceof Error ? err.message : ''
    const isRateLimit = message.includes('429') || message.includes('rate_limit')

    return NextResponse.json(
      {
        error: isRateLimit
          ? FRIENDLY_ERRORS.ai_capacity.message
          : FRIENDLY_ERRORS.api_failure.message,
        code: isRateLimit ? 'ai_capacity' : 'api_failure'
      },
      { status: isRateLimit ? 503 : 500 }
    )
  }
}
