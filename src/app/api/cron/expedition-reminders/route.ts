import { NextRequest, NextResponse } from "next/server";

import { processDueExpeditionReminders } from "@/lib/expedition-reminders";
import { runWithWorkerHeartbeat } from "@/lib/worker-heartbeat";

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

  try {
    const result = await runWithWorkerHeartbeat("expedition_reminders", processDueExpeditionReminders);
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("Expedition reminder worker unable to complete heartbeat or cycle");
    return NextResponse.json({ error: "Expedition reminder scheduler unavailable." },
      { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
