export type AppErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation"
  | "file_too_large"
  | "unsupported_file_type"
  | "non_legal_document"
  | "no_text_extracted"
  | "parse_error"
  | "rate_limit_hit"
  | "storage_limit_hit"
  | "ai_capacity"
  | "network_error"
  | "save_failed"
  | "delete_failed"
  | "load_failed"
  | "checklist_save_failed"
  | "download_failed"
  | "share_failed"
  | "api_failure";

export type FriendlyError = {
  code: AppErrorCode;
  title: string;
  message: string;
};

export const FRIENDLY_ERRORS: Record<AppErrorCode, FriendlyError> = {
  unauthorized: {
    code: "unauthorized",
    title: "Please sign in",
    message: "Your session has expired. Sign in again to continue.",
  },
  forbidden: {
    code: "forbidden",
    title: "Action not allowed",
    message: "You do not have permission to perform this action.",
  },
  not_found: {
    code: "not_found",
    title: "Not found",
    message: "We could not find that item. It may already have been deleted.",
  },
  validation: {
    code: "validation",
    title: "Check the details",
    message: "Some required information is missing or invalid.",
  },
  file_too_large: {
    code: "file_too_large",
    title: "File too large",
    message: "Please upload a document smaller than 10MB.",
  },
  unsupported_file_type: {
    code: "unsupported_file_type",
    title: "Unsupported file type",
    message: "Please upload a PDF, DOCX, TXT, PNG, or JPG document.",
  },
  non_legal_document: {
    code: "non_legal_document",
    title: "Legal document required",
    message: "Only legal documents can be analysed. Upload a contract, agreement, notice, deed, policy, court filing, or similar legal document.",
  },
  no_text_extracted: {
    code: "no_text_extracted",
    title: "Couldn't read this document",
    message: "We couldn't detect readable text. Try a clearer or text-based file.",
  },
  parse_error: {
    code: "parse_error",
    title: "Document could not be analysed",
    message: "This file may be corrupted or formatted in a way we can't read yet.",
  },
  rate_limit_hit: {
    code: "rate_limit_hit",
    title: "Limit reached",
    message: "You've reached your Starter limit: 5 document analyses and 3 follow-up questions per month. Upgrade or wait for the next monthly reset.",
  },
  storage_limit_hit: {
    code: "storage_limit_hit",
    title: "Storage limit reached",
    message: "Your plan storage is full. Delete older history or upgrade to continue.",
  },
  ai_capacity: {
    code: "ai_capacity",
    title: "AI temporarily busy",
    message: "The analysis service is busy right now. Please try again in a few minutes.",
  },
  network_error: {
    code: "network_error",
    title: "Connection issue",
    message: "Check your internet connection and try again.",
  },
  save_failed: {
    code: "save_failed",
    title: "Could not save",
    message: "Your change could not be saved. Please try again.",
  },
  delete_failed: {
    code: "delete_failed",
    title: "Could not delete",
    message: "We could not delete this right now. Please try again.",
  },
  load_failed: {
    code: "load_failed",
    title: "Could not load",
    message: "Some data could not be loaded. Refresh the page or try again.",
  },
  checklist_save_failed: {
    code: "checklist_save_failed",
    title: "Checklist not saved",
    message: "Your checklist change was kept on this device but could not sync yet.",
  },
  download_failed: {
    code: "download_failed",
    title: "Download failed",
    message: "We could not generate the PDF. Please try again.",
  },
  share_failed: {
    code: "share_failed",
    title: "Share failed",
    message: "We could not copy or share the link. Please try again.",
  },
  api_failure: {
    code: "api_failure",
    title: "Something went wrong",
    message: "Something went wrong. Please try again.",
  },
};

export function toErrorCode(error: string | Error | unknown, fallback: AppErrorCode = "api_failure"): AppErrorCode {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const lower = message.toLowerCase();

  if (!lower) return fallback;
  if (message in FRIENDLY_ERRORS) return message as AppErrorCode;
  if (lower.includes("unauthorized") || lower.includes("session") || lower.includes("jwt")) return "unauthorized";
  if (lower.includes("not found") || lower.includes("no rows") || lower.includes("does not exist")) return "not_found";
  if (lower.includes("too large") || lower.includes("file size") || lower.includes("10mb")) return "file_too_large";
  if (lower.includes("unsupported") || lower.includes("file type") || lower.includes("mime") || lower.includes("format")) return "unsupported_file_type";
  if (lower.includes("legal document") || lower.includes("legal documents") || lower.includes("contract, agreement")) return "non_legal_document";
  if (lower.includes("no text") || lower.includes("extract") || lower.includes("readable") || lower.includes("ocr")) return "no_text_extracted";
  if (lower.includes("parse") || lower.includes("corrupt") || lower.includes("invalid json") || lower.includes("malformed")) return "parse_error";
  if (lower.includes("storage limit") || lower.includes("storage is full")) return "storage_limit_hit";
  if (lower.includes("rate limit") || lower.includes("quota") || lower.includes("limit reached") || lower.includes("429")) return "rate_limit_hit";
  if (lower.includes("capacity") || lower.includes("503") || lower.includes("502") || lower.includes("504")) return "ai_capacity";
  if (lower.includes("network") || lower.includes("fetch") || lower.includes("failed to fetch")) return "network_error";
  if (lower.includes("save") || lower.includes("insert") || lower.includes("update")) return "save_failed";
  if (lower.includes("delete") || lower.includes("remove")) return "delete_failed";
  if (lower.includes("load") || lower.includes("select")) return "load_failed";

  return fallback;
}

export function toUserMessage(error: string | Error | unknown, fallback: AppErrorCode = "api_failure") {
  return FRIENDLY_ERRORS[toErrorCode(error, fallback)].message;
}

export async function readApiError(response: Response, fallback: AppErrorCode = "api_failure") {
  const data = await response.json().catch(() => ({}));
  const code = typeof data.code === "string" && data.code in FRIENDLY_ERRORS
    ? data.code as AppErrorCode
    : toErrorCode(typeof data.error === "string" ? data.error : response.statusText, fallback);

  return {
    code,
    message: typeof data.error === "string" ? data.error : FRIENDLY_ERRORS[code].message,
  };
}
