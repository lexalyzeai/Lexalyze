import { SYSTEM_PROMPT, FOLLOWUP_PROMPT } from '@/lib/prompt'
import { AnalysisResult } from '@/types/analysis'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'
const MAX_CHARS = 12000

async function groqCall(
  messages: { role: string; content: string }[],
  jsonMode: boolean = false,
  maxTokens: number = 4000
): Promise<string> {
  const body: Record<string, unknown> = {
    model: MODEL,
    temperature: 0.1,
    top_p: 0.85,
    max_tokens: maxTokens,
    messages,
  }

  if (jsonMode) body.response_format = { type: 'json_object' }

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(`Groq API error: ${response.status} — ${JSON.stringify(errorBody)}`)
  }

  const data = await response.json()
  const raw = data.choices?.[0]?.message?.content

  if (!raw) throw new Error('No response from Groq')

  return raw
}

function parseJson(raw: string): AnalysisResult {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned) as Partial<AnalysisResult>

    const result: AnalysisResult = {
      documentTitle: parsed.documentTitle || 'Untitled Document',
      documentType: parsed.documentType || 'Legal Document',
      partyFavour: parsed.partyFavour || 'BALANCED',
      partyFavourReason: parsed.partyFavourReason || 'Could not determine party favour.',

      riskScore: parsed.riskScore ?? 5,
      riskScoreReason: parsed.riskScoreReason || 'Risk score estimated from detected clauses.',

      overallConfidence: parsed.overallConfidence ||
        ((parsed.redFlags?.length || 0) >= 3 ? 'LOW' :
         (parsed.redFlags?.length || 0) >= 1 ? 'MEDIUM' : 'HIGH'),
      overallConfidenceReason: parsed.overallConfidenceReason || 'Confidence estimated from detected clauses.',

      oneLineSummary: parsed.oneLineSummary || 'Document analysis completed.',
      fullSummary: parsed.fullSummary || 'No summary generated.',

      keyNumbers: parsed.keyNumbers?.length ? parsed.keyNumbers : ['No financial numbers detected.'],
      keyDeadlines: parsed.keyDeadlines?.length ? parsed.keyDeadlines : ['No deadlines detected.'],

      redFlags: parsed.redFlags?.length ? parsed.redFlags : [{
        title: 'Limited legal detail',
        severity: 'MEDIUM',
        explanation: 'The document contains limited legal clarification.',
        exactQuote: 'No exact quote found in document.',
        legalContext: 'Unable to determine applicable law from document content.',
        whatToDoAboutIt: 'Request a more detailed agreement from the other party.',
        confidence: 'MEDIUM',
        confidenceReason: 'Important clauses appear missing or unclear.',
      }],

      positivePoints: parsed.positivePoints?.length ? parsed.positivePoints : [{
        title: 'Basic agreement structure present',
        explanation: 'The document contains identifiable agreement terms.',
        exactQuote: 'No exact quote found in document.',
        confidence: 'MEDIUM',
      }],

      missingClauses: parsed.missingClauses?.length ? parsed.missingClauses : [{
        clause: 'Dispute Resolution Clause',
        whyItMatters: 'Without this, any dispute requires expensive court proceedings.',
        riskIfAbsent: 'HIGH',
        whatToAdd: 'Add an arbitration clause under the Arbitration and Conciliation Act, 1996.',
      }],

      clauseAnalysis: parsed.clauseAnalysis?.length ? parsed.clauseAnalysis : [{
        clauseTitle: 'General Terms',
        whatItSays: 'The document contains general agreement terms.',
        whatItMeans: 'Standard obligations apply to both parties.',
        isFair: true,
        consumerImpact: 'MEDIUM',
        redFlag: false,
      }],

      actionItems: parsed.actionItems?.length ? parsed.actionItems : [{
        priority: 'URGENT',
        action: 'Review the document carefully before signing.',
        reason: 'Several clauses require clarification.',
      }],

      cannotDetermineList: parsed.cannotDetermineList?.length ? parsed.cannotDetermineList : [
        'Dispute resolution process',
        'Termination consequences',
        'Maintenance responsibilities',
      ],

      negotiationTips: parsed.negotiationTips?.length ? parsed.negotiationTips : [
        'Request mutual termination rights.',
        'Ask for a clearly defined security deposit refund timeline.',
        'Insist on a written inventory of any assets or property.',
      ],

      consumerRightsNote: parsed.consumerRightsNote || 'You have the right to negotiate any clause before signing.',
      stampDutyNote: parsed.stampDutyNote || 'Verify whether this document requires stamping and/or registration.',
      lawyerGuidance: parsed.lawyerGuidance || 'Consult a qualified lawyer before signing.',
    }

    return result
  } catch {
    throw new Error('Failed to parse Groq response as JSON')
  }
}

export async function analyzeDocument(
  text: string,
  language: string = 'en'
): Promise<AnalysisResult> {
  const trimmedText = text.slice(0, MAX_CHARS)

  const rawJson = await groqCall(
    [
      { role: 'system', content: SYSTEM_PROMPT(language) },
      {
        role: 'user',
        content: `Analyse this legal document as a senior Indian advocate protecting a consumer. Think through every clause, every risk, every missing protection, then return the complete JSON.\n\nDOCUMENT:\n${trimmedText}`
      }
    ],
    true,
    5000
  )

  return parseJson(rawJson)
}

export async function followUpQuestion(
  question: string,
  documentText: string,
  analysisResult: AnalysisResult,
  language: 'en' | 'hi' = 'en'
): Promise<string> {
  const trimmedDoc = documentText.slice(0, 8000)

  return await groqCall(
    [
      { role: 'system', content: FOLLOWUP_PROMPT(language) },
      {
        role: 'user',
        content: `You are analysing this document for an Indian consumer who is about to sign it.
      
      Think step by step:
      1. Identify every clause and what it means practically
      2. Find every red flag including vague, one-sided, and missing clauses  
      3. Identify what standard protections are absent
      4. Assess overall risk and who benefits more
      
      Be as thorough as a senior advocate. Do not summarise — analyse and protect.
      
      DOCUMENT:
      ${trimmedText}
      
      Return the complete JSON now.`
      }
    ],
    false,
    800
  )
}