export const analyticsEventNames = [
  "destination_view",
  "campaign_view",
  "expedition_view",
  "academy_course_view",
  "expedition_checkout_started",
  "expedition_interest_submitted",
  "expedition_saved",
  "campaign_saved",
  "campaign_followed",
  "academy_course_enrolled",
  "expedition_booking_submitted",
  "donation_payment_proof_submitted"
] as const;

export type AnalyticsEventName = (typeof analyticsEventNames)[number];

type AnalyticsScalar = string | number | boolean | null | undefined;

export type AnalyticsProperties = Record<string, AnalyticsScalar>;

type AnalyticsEventInput = {
  distinctId?: string | null;
  event: AnalyticsEventName;
  properties?: AnalyticsProperties;
};

const publicPropertyKeys = new Set([
  "destinationId",
  "destinationSlug",
  "expeditionId",
  "expeditionSlug",
  "campaignId",
  "campaignSlug",
  "courseId",
  "courseSlug",
  "departureId",
  "requestType",
  "participantsCount",
  "expeditionCount",
  "impactSiteCount",
  "availableDepartureCount",
  "authenticated",
  "hasReferral",
  "saved",
  "frequency",
  "source",
  "status"
]);

export function posthogConfig() {
  return {
    apiKey: process.env.POSTHOG_KEY ?? process.env.POSTHOG_API_KEY ?? "",
    host: process.env.POSTHOG_HOST ?? "https://app.posthog.com"
  };
}

export function analyticsIsConfigured() {
  return Boolean(posthogConfig().apiKey);
}

export function isAnalyticsEventName(value: unknown): value is AnalyticsEventName {
  return typeof value === "string" && analyticsEventNames.includes(value as AnalyticsEventName);
}

export function sanitizePublicAnalyticsProperties(value: unknown): AnalyticsProperties {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const result: AnalyticsProperties = {};

  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!publicPropertyKeys.has(key)) continue;

    if (typeof raw === "string") {
      result[key] = raw.trim().slice(0, 180);
    } else if (typeof raw === "number" && Number.isFinite(raw)) {
      result[key] = raw;
    } else if (typeof raw === "boolean" || raw === null) {
      result[key] = raw;
    }
  }

  return result;
}

export function safeAnalyticsDistinctId(value: string | null | undefined, fallback: string) {
  const cleaned = String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9:_-]/g, "")
    .slice(0, 160);

  return cleaned || fallback;
}

export function safeBrowserAnonymousId(value: unknown) {
  const candidate = typeof value === "string" ? value.trim() : "";

  return /^[a-zA-Z0-9_-]{8,80}$/.test(candidate) ? candidate : "browser";
}

export async function trackEvent(input: AnalyticsEventInput) {
  const { apiKey, host } = posthogConfig();

  if (!apiKey) {
    return;
  }

  const distinctId = safeAnalyticsDistinctId(input.distinctId, "anonymous-server");

  await fetch(`${host.replace(/\/$/, "")}/capture/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      api_key: apiKey,
      distinct_id: distinctId,
      event: input.event,
      properties: {
        ...input.properties,
        app: "terumbu",
        deployVersion: process.env.TERUMBU_DEPLOY_VERSION ?? "local"
      }
    }),
    signal: AbortSignal.timeout(1500)
  }).catch(() => undefined);
}
