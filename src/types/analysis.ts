export type Severity = 'HIGH' | 'MEDIUM' | 'LOW'
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW'
export type PartyFavour = 'CONSUMER_FRIENDLY' | 'OTHER_PARTY_FRIENDLY' | 'BALANCED'
export type ConsumerImpact = 'HIGH' | 'MEDIUM' | 'LOW'
export type Priority = 'URGENT' | 'IMPORTANT' | 'RECOMMENDED'

export interface RedFlag {
  title: string
  severity: Severity
  explanation: string
  exactQuote: string
  legalContext?: string
  whatToDoAboutIt?: string
  confidence: Confidence
  confidenceReason: string
}

export interface PositivePoint {
  title: string
  explanation: string
  exactQuote: string
  confidence: Confidence
}

export interface MissingClause {
  clause: string
  whyItMatters: string
  riskIfAbsent: Severity
  whatToAdd?: string
}

export interface ClauseAnalysis {
  clauseTitle: string
  whatItSays: string
  whatItMeans: string
  isFair: boolean
  consumerImpact: ConsumerImpact
  redFlag: boolean
}

export interface ActionItem {
  priority: Priority
  action: string
  reason: string
}

export interface AnalysisResult {
  documentTitle: string
  documentType: string
  partyFavour: PartyFavour
  partyFavourReason: string
  riskScore: number
  riskScoreReason: string
  overallConfidence: Confidence
  overallConfidenceReason: string
  oneLineSummary: string
  fullSummary: string
  keyNumbers: string[]
  keyDeadlines: string[]
  redFlags: RedFlag[]
  positivePoints: PositivePoint[]
  missingClauses: MissingClause[]
  clauseAnalysis: ClauseAnalysis[]
  actionItems: ActionItem[]
  cannotDetermineList: string[]
  negotiationTips: string[]
  consumerRightsNote: string
  stampDutyNote: string
  lawyerGuidance: string
}