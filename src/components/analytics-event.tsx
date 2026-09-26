"use client";

import { useEffect } from "react";

import type { AnalyticsEventName, AnalyticsProperties } from "@/lib/analytics";

const STORAGE_KEY = "terumbu_analytics_id";

function anonymousId() {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);

    if (existing) return existing;

    const generated =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

    window.localStorage.setItem(STORAGE_KEY, generated);
    return generated;
  } catch {
    return `session-${Date.now().toString(36)}`;
  }
}

export function AnalyticsEvent({
  event,
  properties = {}
}: {
  event: AnalyticsEventName;
  properties?: AnalyticsProperties;
}) {
  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/analytics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        event,
        anonymousId: anonymousId(),
        properties
      }),
      keepalive: true,
      signal: controller.signal
    }).catch(() => undefined);

    return () => controller.abort();
  }, [event, properties]);

  return null;
}
