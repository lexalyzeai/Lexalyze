import { SYSTEM_PROMPT } from '@/lib/prompt'
import { AnalysisResult } from '@/types/analysis'

export async function analyzeDocument(
  text: string,
  language: string = 'en'
): Promise<AnalysisResult> {
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
            content: SYSTEM_PROMPT(language)
          },
          {
            role: 'user',
            content: `Analyse this legal document and return the JSON:\n\n${text}`
          }
        ],
        temperature: 0.1,
        max_tokens: 3000,
        response_format: { type: 'json_object' }
      })
    }
  )

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(`Groq API error: ${response.status} — ${JSON.stringify(errorBody)}`)
  }

  const data = await response.json()
  const raw = data.choices?.[0]?.message?.content

  if (!raw) {
    throw new Error('No response from Groq')
  }

  // Strip markdown fences if present
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()

  try {
    const result = JSON.parse(cleaned) as AnalysisResult
    return result
  } catch {
    throw new Error('Failed to parse Groq response as JSON')
  }
}