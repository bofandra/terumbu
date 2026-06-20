import { randomBytes } from "node:crypto";

import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { profiles, sessions, users } from "@/db/schema";
export { createPasswordHash, verifyPassword } from "@/lib/password";

const SESSION_COOKIE = "terumbu_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  displayName: string | null;
  heroLevel: number | null;
  xp: number | null;
};

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await db.insert(sessions).values({
    userId,
    sessionToken: token,
    expiresAt
  });

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const [sessionUser] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      displayName: profiles.displayName,
      heroLevel: profiles.heroLevel,
      xp: profiles.xp
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(and(eq(sessions.sessionToken, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return sessionUser ?? null;
}

export async function requireUser(nextPath = "/dashboard") {
  const user = await getSessionUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return user;
}

export async function destroyCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await db.delete(sessions).where(eq(sessions.sessionToken, token));
  }

  cookieStore.delete(SESSION_COOKIE);
}

export function safeRedirectPath(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}
