import { NextResponse } from "next/server";

import {
  isAnalyticsEventName,
  safeBrowserAnonymousId,
  sanitizePublicAnalyticsProperties,
  trackEvent
} from "@/lib/analytics";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;

  if (!isAnalyticsEventName(payload.event)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const user = await getSessionUser();
  const anonymousId = safeBrowserAnonymousId(payload.anonymousId);
  const distinctId = user?.id ? `user:${user.id}` : `anon:${anonymousId}`;

  await trackEvent({
    distinctId,
    event: payload.event,
    properties: {
      ...sanitizePublicAnalyticsProperties(payload.properties),
      authenticated: Boolean(user)
    }
  });

  return NextResponse.json({ ok: true });
}
