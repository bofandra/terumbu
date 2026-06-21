type AnalyticsEventInput = {
  distinctId?: string | null;
  event: string;
  properties?: Record<string, unknown>;
};

export async function trackEvent(input: AnalyticsEventInput) {
  const apiKey = process.env.POSTHOG_API_KEY;
  const host = process.env.POSTHOG_HOST ?? "https://app.posthog.com";

  if (!apiKey) {
    return;
  }

  await fetch(`${host.replace(/\/$/, "")}/capture/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      api_key: apiKey,
      distinct_id: input.distinctId ?? "anonymous",
      event: input.event,
      properties: input.properties ?? {}
    })
  }).catch(() => undefined);
}
