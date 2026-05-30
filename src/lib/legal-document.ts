const LEGAL_TERMS = [
  "agreement",
  "contract",
  "deed",
  "lease",
  "tenant",
  "landlord",
  "notice",
  "affidavit",
  "petition",
  "court",
  "arbitration",
  "jurisdiction",
  "clause",
  "party",
  "parties",
  "indemnity",
  "liability",
  "termination",
  "confidentiality",
  "non-disclosure",
  "nda",
  "employment",
  "offer letter",
  "loan",
  "borrower",
  "lender",
  "property",
  "registration",
  "stamp duty",
  "signature",
  "witness",
  "consumer protection",
  "terms and conditions",
  "privacy policy",
  "service agreement",
  "memorandum",
  "power of attorney",
  "settlement",
  "compliance",
  "warranty",
  "governing law",
  "dispute resolution",
  "termination",
  "breach",
  "remedy",
  "damages",
  "schedule",
  "annexure",
  "addendum",
  "अनुबंध",
  "समझौता",
  "किराया",
  "पट्टा",
  "पक्ष",
  "नोटिस",
  "कानूनी",
  "धारा",
  "शर्त",
  "हस्ताक्षर",
  "गवाह",
  "अदालत",
  "विवाद",
  "क्षतिपूर्ति",
  "दायित्व",
  "समाप्ति",
];

const LEGAL_STRUCTURE_PATTERNS = [
  /\bthis\s+(agreement|contract|deed|notice|lease)\b/i,
  /\bbetween\s+.+\band\s+.+\b/i,
  /\bparty\s+of\s+the\s+(first|second)\s+part\b/i,
  /\bin\s+witness\s+whereof\b/i,
  /\bgoverned\s+by\s+the\s+laws?\b/i,
  /\bterms\s+and\s+conditions\b/i,
  /\bsigned\s+by\b/i,
  /\bdate\s+of\s+(execution|agreement|commencement)\b/i,
];

export const LEGAL_DOCUMENT_ERROR =
  "Only legal documents can be analysed. Upload a contract, agreement, notice, deed, policy, court filing, or similar legal document.";

export function isProbablyLegalDocument(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
  if (normalized.length < 80) return false;

  const termHits = LEGAL_TERMS.reduce((count, term) => (
    normalized.includes(term.toLowerCase()) ? count + 1 : count
  ), 0);
  const structureHits = LEGAL_STRUCTURE_PATTERNS.reduce((count, pattern) => (
    pattern.test(text) ? count + 1 : count
  ), 0);

  return termHits >= 2 || (termHits >= 1 && structureHits >= 1);
}
