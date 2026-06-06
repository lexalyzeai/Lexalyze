export const LAUNCH_ANALYTICS_EVENTS = [
  "signup",
  "login",
  "document_uploaded",
  "analysis_completed",
  "upgrade_clicked",
  "feedback_submitted",
] as const;

export type LaunchAnalyticsEvent = (typeof LAUNCH_ANALYTICS_EVENTS)[number];

const LAUNCH_ANALYTICS_EVENT_SET = new Set<string>(LAUNCH_ANALYTICS_EVENTS);

export function isLaunchAnalyticsEvent(event: string): event is LaunchAnalyticsEvent {
  return LAUNCH_ANALYTICS_EVENT_SET.has(event);
}

type AnalyticsProperties = Record<string, unknown>;

function cleanString(value: unknown, fallback = "unknown") {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 80) : fallback;
}

export function sanitizeAnalyticsProperties(event: string, properties: AnalyticsProperties = {}) {
  if (!isLaunchAnalyticsEvent(event)) return {};

  switch (event) {
    case "signup":
    case "login":
      return { method: cleanString(properties.method) };
    case "document_uploaded":
      return {
        fileType: cleanString(properties.fileType),
        workspace: cleanString(properties.workspace),
        plan: cleanString(properties.plan),
      };
    case "analysis_completed":
      return {
        workspace: cleanString(properties.workspace),
        plan: cleanString(properties.plan),
      };
    case "upgrade_clicked":
      return { plan: cleanString(properties.plan) };
    case "feedback_submitted":
      return {
        kind: cleanString(properties.kind),
        mode: cleanString(properties.mode),
      };
    default:
      return {};
  }
}
