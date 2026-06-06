"use client";

import { isLaunchAnalyticsEvent, sanitizeAnalyticsProperties } from "@/lib/analytics-events";

type AnalyticsProperties = Record<string, unknown>;

declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: AnalyticsProperties) => void;
      identify?: (id: string, properties?: AnalyticsProperties) => void;
    };
  }
}

const ANON_KEY = "lexalyze-anonymous-id";
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

function anonymousId() {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(ANON_KEY);
  if (existing) return existing;

  const next = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(ANON_KEY, next);
  return next;
}

export function trackEvent(event: string, properties: AnalyticsProperties = {}) {
  if (typeof window === "undefined") return;
  if (!isLaunchAnalyticsEvent(event)) return;

  const distinctId = anonymousId();
  const eventProperties = sanitizeAnalyticsProperties(event, properties);

  const payload = {
    event,
    properties: eventProperties,
    anonymousId: distinctId,
  };

  try {
    window.posthog?.capture(event, eventProperties);
  } catch (error) {
    console.error("PostHog capture failed:", error);
  }

  if (!window.posthog && POSTHOG_KEY) {
    fetch(`${POSTHOG_HOST.replace(/\/$/, "")}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event,
        properties: {
          distinct_id: distinctId,
          ...eventProperties,
        },
      }),
      keepalive: true,
    }).catch((error) => {
      console.error("PostHog direct capture failed:", error);
    });
  }

  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch((error) => {
    console.error("Analytics capture failed:", error);
  });
}
