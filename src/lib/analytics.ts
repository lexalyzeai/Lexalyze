"use client";

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

  const payload = {
    event,
    properties: {
      path: window.location.pathname,
      ...properties,
    },
    anonymousId: anonymousId(),
  };

  try {
    window.posthog?.capture(event, payload.properties);
  } catch (error) {
    console.error("PostHog capture failed:", error);
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
