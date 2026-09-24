import { NextRequest, NextResponse } from "next/server";

import { processDueExpeditionReminders } from "@/lib/expedition-reminders";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const bearer = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");

  return bearer === `Bearer ${secret}` || headerSecret === secret;
}

export async function POST(request: NextRequest) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  }

  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processDueExpeditionReminders();
  return NextResponse.json({ ok: true, ...result });
}
