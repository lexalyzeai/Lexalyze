"use client";

import { isLaunchAnalyticsEvent, sanitizeAnalyticsProperties } from "@/lib/analytics-events";

type AnalyticsProperties = Record<string, unknown>;

declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: AnalyticsProperties) => void;
      identify?: (id: string, properties?: AnalyticsProperties) => void;
      reset?: () => void;
    };
  }
}

const ANON_KEY = "lexalyze-anonymous-id";
const USER_EMAIL_KEY = "lexalyze-analytics-email";
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function anonymousId() {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(ANON_KEY);
  if (existing) return existing;

  const next = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(ANON_KEY, next);
  return next;
}

function analyticsDistinctId() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(USER_EMAIL_KEY) || anonymousId();
}

function sendDirectPostHogIdentify(email: string, anonId: string) {
  if (!POSTHOG_KEY) return;

  fetch(`${POSTHOG_HOST.replace(/\/$/, "")}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: POSTHOG_KEY,
      event: "$identify",
      properties: {
        distinct_id: email,
        $anon_distinct_id: anonId,
        $set: {
          email,
        },
      },
    }),
    keepalive: true,
  }).catch((error) => {
    console.error("PostHog direct identify failed:", error);
  });
}

export function identifyAnalyticsUser(email: string) {
  if (typeof window === "undefined") return;

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return;

  const anonId = anonymousId();
  window.localStorage.setItem(USER_EMAIL_KEY, normalizedEmail);

  try {
    window.posthog?.identify?.(normalizedEmail, { email: normalizedEmail });
  } catch (error) {
    console.error("PostHog identify failed:", error);
  }

  if (!window.posthog) {
    sendDirectPostHogIdentify(normalizedEmail, anonId);
  }
}

export function clearAnalyticsIdentity() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(USER_EMAIL_KEY);
  try {
    window.posthog?.reset?.();
  } catch (error) {
    console.error("PostHog reset failed:", error);
  }
}

export function trackEvent(event: string, properties: AnalyticsProperties = {}) {
  if (typeof window === "undefined") return;
  if (!isLaunchAnalyticsEvent(event)) return;

  const anonId = anonymousId();
  const distinctId = analyticsDistinctId();
  const eventProperties = sanitizeAnalyticsProperties(event, properties);

  const payload = {
    event,
    properties: eventProperties,
    anonymousId: anonId,
  };

  try {
    window.posthog?.capture(event, eventProperties);
  } catch (error) {
    console.error("PostHog capture failed:", error);
  }

  try {
    window.gtag?.("event", event, eventProperties);
  } catch (error) {
    console.error("Google Analytics capture failed:", error);
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
