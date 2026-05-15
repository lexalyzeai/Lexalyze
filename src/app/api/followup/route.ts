import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { FOLLOWUP_PROMPT } from '@/lib/prompt'
import { AnalysisResult } from '@/types/analysis'

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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { question, analysisId, language } = await req.json()

  if (!question || !analysisId) {
    return NextResponse.json({ error: 'Question and analysisId are required.' }, { status: 400 })
  }

  const { data: analysis } = await supabase
    .from('analyses')
    .select('result, document_text')
    .eq('id', analysisId)
    .eq('user_id', user.id)
    .single()

  if (!analysis) {
    return NextResponse.json({ error: 'Analysis not found.' }, { status: 404 })
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
            {
              role: 'system',
              content: FOLLOWUP_PROMPT(language || 'en')
            },
            {
              role: 'user',
              content: userContent
            }
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
      return NextResponse.json(
        { error: 'Failed to get answer. Please try again.' },
        { status: 500 }
      )
    }

    const data = await response.json()
    const answer = data.choices?.[0]?.message?.content

    if (!answer) {
      return NextResponse.json({ error: 'No answer from Groq.' }, { status: 500 })
    }

    await supabase
      .from('followups')
      .insert({
        analysis_id: analysisId,
        question,
        answer,
      })

    return NextResponse.json({ answer })

  } catch (err) {
    console.error('Followup error:', err)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}