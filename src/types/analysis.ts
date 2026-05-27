export interface RedFlag {
    title: string
    severity: 'HIGH' | 'MEDIUM' | 'LOW'
    explanation: string
    exactQuote: string
    confidence: 'HIGH' | 'MEDIUM' | 'LOW'
    confidenceReason: string
  }
  
  export interface PositivePoint {
    title: string
    explanation: string
    exactQuote: string
    confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  }
  
  export interface AnalysisResult {
    documentTitle: string
    overallConfidence: 'HIGH' | 'MEDIUM' | 'LOW'
    overallConfidenceReason: string
    oneLineSummary: string
    fullSummary: string
    keyNumbers: string[]
    keyDeadlines: string[]
    redFlags: RedFlag[]
    positivePoints: PositivePoint[]
    actionItems: string[]
    cannotDetermineList: string[]
    lawyerGuidance: string
  }