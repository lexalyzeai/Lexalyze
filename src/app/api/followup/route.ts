import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { FOLLOWUP_PROMPT } from '@/lib/prompt'

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

  // Load original analysis
  const { data: analysis } = await supabase
    .from('analyses')
    .select('result')
    .eq('id', analysisId)
    .eq('user_id', user.id)
    .single()

  if (!analysis) {
    return NextResponse.json({ error: 'Analysis not found.' }, { status: 404 })
  }

  const documentContext = JSON.stringify(analysis.result)

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: FOLLOWUP_PROMPT(language || 'en') }]
        },
        contents: [
          {
            parts: [{ text: `Document context: ${documentContext}\n\nQuestion: ${question}` }]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500,
        }
      })
    }
  )

  const data = await response.json()
  const answer = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!answer) {
    return NextResponse.json({ error: 'No answer from Gemini.' }, { status: 500 })
  }

  // Save to followups table
  await supabase
    .from('followups')
    .insert({
      analysis_id: analysisId,
      question,
      answer,
    })

  return NextResponse.json({ answer })
}