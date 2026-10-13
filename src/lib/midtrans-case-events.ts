export const MIDTRANS_COMPENSATION_CASE_EVENTS = [
  "contact_attempted",
  "customer_reports_missing_credit",
  "customer_reports_received",
  "provider_trace_requested"
] as const;

export const MIDTRANS_COMPENSATION_EVIDENCE_CHANNELS = [
  "support_ticket",
  "verified_email",
  "verified_phone",
  "provider_portal"
] as const;

export type CompensationCaseEventType = typeof MIDTRANS_COMPENSATION_CASE_EVENTS[number];
export type CompensationEvidenceChannel = typeof MIDTRANS_COMPENSATION_EVIDENCE_CHANNELS[number];

export const CASE_EVENT_LABELS: Record<CompensationCaseEventType, string> = {
  contact_attempted: "Contact attempt recorded",
  customer_reports_missing_credit: "Customer reports credit not received",
  customer_reports_received: "Customer reports funds received (unverified)",
  provider_trace_requested: "Provider trace requested"
};

export function parseCompensationCaseEvent(input: {
  eventId: unknown;
  operationId: unknown;
  eventType: unknown;
  channel: unknown;
  ticketReference: unknown;
}): {
  eventId: string;
  operationId: string;
  eventType: CompensationCaseEventType;
  channel: CompensationEvidenceChannel;
  ticketReference: string;
} | null {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (typeof input.eventId !== "string" || !uuid.test(input.eventId) ||
      typeof input.operationId !== "string" || !uuid.test(input.operationId) ||
      typeof input.eventType !== "string" ||
      !MIDTRANS_COMPENSATION_CASE_EVENTS.includes(input.eventType as CompensationCaseEventType) ||
      typeof input.channel !== "string" ||
      !MIDTRANS_COMPENSATION_EVIDENCE_CHANNELS.includes(input.channel as CompensationEvidenceChannel) ||
      typeof input.ticketReference !== "string" ||
      !/^[A-Za-z0-9_-]{3,64}$/.test(input.ticketReference)) return null;

  // A customer report of receipt must originate from authenticated customer
  // communication; a provider portal lookup alone is not a customer report.
  if (input.eventType === "customer_reports_received" &&
    !["support_ticket", "verified_email", "verified_phone"].includes(input.channel)) return null;
  if (input.eventType === "provider_trace_requested" && input.channel !== "provider_portal" &&
    input.channel !== "support_ticket") return null;

  return {
    eventId: input.eventId,
    operationId: input.operationId,
    eventType: input.eventType as CompensationCaseEventType,
    channel: input.channel as CompensationEvidenceChannel,
    ticketReference: input.ticketReference
  };
}
