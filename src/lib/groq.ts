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
    const parsed = JSON.parse(cleaned) as Partial<AnalysisResult>

const result: AnalysisResult = {
  documentTitle: parsed.documentTitle || "Untitled Document",

  overallConfidence:
    parsed.overallConfidence ||
    (
      (parsed.redFlags?.length || 0) >= 3
        ? "LOW"
        : (parsed.redFlags?.length || 0) >= 1
        ? "MEDIUM"
        : "HIGH"
    ),

  overallConfidenceReason:
    parsed.overallConfidenceReason ||
    "Confidence estimated from detected clauses.",

  oneLineSummary:
    parsed.oneLineSummary || "Document analysis completed.",

  fullSummary:
    parsed.fullSummary || "No summary generated.",

  keyNumbers:
    parsed.keyNumbers && parsed.keyNumbers.length > 0
      ? parsed.keyNumbers
      : ["No important financial numbers detected."],

  keyDeadlines:
    parsed.keyDeadlines && parsed.keyDeadlines.length > 0
      ? parsed.keyDeadlines
      : ["No important deadlines detected."],

  redFlags:
    parsed.redFlags && parsed.redFlags.length > 0
      ? parsed.redFlags
      : [
          {
            title: "Limited legal detail",
            severity: "MEDIUM",
            explanation:
              "The document contains limited legal clarification.",
            exactQuote: "No exact quote found in document.",
            confidence: "MEDIUM",
            confidenceReason:
              "Important clauses appear missing or unclear.",
          },
        ],

  positivePoints:
    parsed.positivePoints && parsed.positivePoints.length > 0
      ? parsed.positivePoints
      : [
          {
            title: "Basic agreement structure present",
            explanation:
              "The document contains identifiable agreement terms.",
            exactQuote: "No exact quote found in document.",
            confidence: "MEDIUM",
          },
        ],

  actionItems:
    parsed.actionItems && parsed.actionItems.length > 0
      ? parsed.actionItems
      : ["Review the document carefully before signing."],

  cannotDetermineList:
    parsed.cannotDetermineList &&
    parsed.cannotDetermineList.length > 0
      ? parsed.cannotDetermineList
      : [
          "Dispute resolution process",
          "Termination consequences",
          "Maintenance responsibilities",
        ],

  lawyerGuidance:
    parsed.lawyerGuidance ||
    "Consult a legal professional before making decisions.",
}

return result
  } catch {
    throw new Error('Failed to parse Groq response as JSON')
  }
}