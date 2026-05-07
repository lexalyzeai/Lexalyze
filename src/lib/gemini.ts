import { SYSTEM_PROMPT } from '@/lib/prompt'
import { AnalysisResult } from '@/types/analysis'

export async function analyzeDocument(
  text: string,
  language: string = 'en'
): Promise<AnalysisResult> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${SYSTEM_PROMPT(language)}\n\nDOCUMENT:\n${text}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 3000,
        }
      })
    }
  )

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!raw) {
    throw new Error('No response from Gemini')
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
    throw new Error('Failed to parse Gemini response as JSON')
  }
}