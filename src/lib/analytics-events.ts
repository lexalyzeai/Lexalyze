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
