import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "ok",
    version: process.env.TERUMBU_DEPLOY_VERSION ?? "local"
  });
}
