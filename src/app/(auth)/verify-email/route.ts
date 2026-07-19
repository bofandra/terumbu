import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "@/db/client";
import { users } from "@/db/schema";
import { consumeAuthToken, deleteAuthTokensForUser } from "@/lib/auth-tokens";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const record = await consumeAuthToken(token, ["email_verification"]);

  if (!record) {
    return NextResponse.redirect(new URL("/login?error=verification", request.url));
  }

  await db
    .update(users)
    .set({
      emailVerifiedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(users.id, record.userId));

  await deleteAuthTokensForUser(record.userId, ["email_verification"]);

  return NextResponse.redirect(new URL("/login?verified=1", request.url));
}
