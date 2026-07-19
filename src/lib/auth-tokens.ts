import { createHash, randomBytes } from "node:crypto";

import { and, eq, gt, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { users, verificationTokens } from "@/db/schema";
import { sendTransactionalEmail } from "@/lib/email";

export const authTokenPurposes = ["account_setup", "email_verification", "password_reset"] as const;

export type AuthTokenPurpose = (typeof authTokenPurposes)[number];

const tokenTtlMs: Record<AuthTokenPurpose, number> = {
  account_setup: 1000 * 60 * 60 * 24,
  email_verification: 1000 * 60 * 60 * 24,
  password_reset: 1000 * 60 * 60
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sha256Pattern = /^[0-9a-f]{64}$/;

type AuthTokenRecord = {
  purpose: AuthTokenPurpose;
  userId: string;
  email: string;
  name: string | null;
  emailVerifiedAt: Date | null;
  passwordHash: string | null;
};

export function normalizeAuthEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashAuthToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashAuthEmail(email: string) {
  return hashAuthToken(normalizeAuthEmail(email));
}

export function authTokenExpiresAt(purpose: AuthTokenPurpose, now = new Date()) {
  return new Date(now.getTime() + tokenTtlMs[purpose]);
}

export function authTokenIdentifier(purpose: AuthTokenPurpose, userId: string, email: string) {
  return `auth:${purpose}:${userId}:${hashAuthEmail(email)}`;
}

export function parseAuthTokenIdentifier(identifier: string) {
  const [prefix, purpose, userId, emailHash, ...extra] = identifier.split(":");

  if (
    prefix !== "auth" ||
    extra.length > 0 ||
    !authTokenPurposes.includes(purpose as AuthTokenPurpose) ||
    !uuidPattern.test(userId) ||
    !sha256Pattern.test(emailHash)
  ) {
    return null;
  }

  return {
    purpose: purpose as AuthTokenPurpose,
    userId,
    emailHash
  };
}

export function authAppBaseUrl(rawAppUrl = process.env.NEXT_PUBLIC_APP_URL) {
  try {
    const url = new URL(rawAppUrl || "https://terumbu.eco");

    if (!["http:", "https:"].includes(url.protocol)) {
      return "https://terumbu.eco";
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return "https://terumbu.eco";
  }
}

export function authActionUrl(path: string, token: string, appUrl = authAppBaseUrl()) {
  const url = new URL(path, appUrl);

  url.searchParams.set("token", token);

  return url.toString();
}

export async function createAuthToken(input: {
  purpose: AuthTokenPurpose;
  userId: string;
  email: string;
  now?: Date;
}) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashAuthToken(token);
  const identifier = authTokenIdentifier(input.purpose, input.userId, input.email);
  const expiresAt = authTokenExpiresAt(input.purpose, input.now ?? new Date());

  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, identifier));
  await db.insert(verificationTokens).values({
    identifier,
    token: tokenHash,
    expiresAt
  });

  return {
    token,
    tokenHash,
    identifier,
    expiresAt
  };
}

async function findAuthTokenRecord(token: string, allowedPurposes: AuthTokenPurpose[]) {
  const tokenHash = hashAuthToken(token.trim());

  if (!sha256Pattern.test(tokenHash)) {
    return null;
  }

  const [row] = await db
    .select({
      identifier: verificationTokens.identifier,
      expiresAt: verificationTokens.expiresAt
    })
    .from(verificationTokens)
    .where(and(eq(verificationTokens.token, tokenHash), gt(verificationTokens.expiresAt, new Date())))
    .limit(1);

  if (!row) {
    return null;
  }

  const parsed = parseAuthTokenIdentifier(row.identifier);

  if (!parsed || !allowedPurposes.includes(parsed.purpose)) {
    return null;
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      emailVerifiedAt: users.emailVerifiedAt,
      passwordHash: users.passwordHash
    })
    .from(users)
    .where(eq(users.id, parsed.userId))
    .limit(1);

  if (!user || hashAuthEmail(user.email) !== parsed.emailHash) {
    return null;
  }

  return {
    purpose: parsed.purpose,
    userId: user.id,
    email: user.email,
    name: user.name,
    emailVerifiedAt: user.emailVerifiedAt,
    passwordHash: user.passwordHash
  } satisfies AuthTokenRecord;
}

export async function readAuthToken(token: string, allowedPurposes: AuthTokenPurpose[]) {
  const trimmedToken = token.trim();

  if (!trimmedToken) {
    return null;
  }

  return findAuthTokenRecord(trimmedToken, allowedPurposes);
}

export async function consumeAuthToken(token: string, allowedPurposes: AuthTokenPurpose[]) {
  const trimmedToken = token.trim();

  if (!trimmedToken) {
    return null;
  }

  const record = await findAuthTokenRecord(trimmedToken, allowedPurposes);

  if (!record) {
    return null;
  }

  await db.delete(verificationTokens).where(eq(verificationTokens.token, hashAuthToken(trimmedToken)));

  return record;
}

export async function deleteAuthTokensForUser(userId: string, purposes: readonly AuthTokenPurpose[] = authTokenPurposes) {
  await Promise.all(
    purposes.map((purpose) =>
      db
        .delete(verificationTokens)
        .where(sql`${verificationTokens.identifier} like ${`auth:${purpose}:${userId}:%`}`)
    )
  );
}

export async function sendAccountSetupEmail(input: { userId: string; email: string; name?: string | null }) {
  const authToken = await createAuthToken({
    purpose: "account_setup",
    userId: input.userId,
    email: input.email
  });

  return sendTransactionalEmail({
    userId: input.userId,
    recipientEmail: input.email,
    subject: "Set up your Terumbu account",
    template: "account_setup",
    payload: {
      name: input.name ?? "",
      setupUrl: authActionUrl("/reset-password", authToken.token),
      expiresAt: authToken.expiresAt.toISOString()
    }
  });
}

export async function sendEmailVerificationEmail(input: { userId: string; email: string; name?: string | null }) {
  const authToken = await createAuthToken({
    purpose: "email_verification",
    userId: input.userId,
    email: input.email
  });

  return sendTransactionalEmail({
    userId: input.userId,
    recipientEmail: input.email,
    subject: "Verify your Terumbu email",
    template: "email_verification",
    payload: {
      name: input.name ?? "",
      verificationUrl: authActionUrl("/verify-email", authToken.token),
      expiresAt: authToken.expiresAt.toISOString()
    }
  });
}

export async function sendPasswordResetEmail(input: { userId: string; email: string; name?: string | null }) {
  const authToken = await createAuthToken({
    purpose: "password_reset",
    userId: input.userId,
    email: input.email
  });

  return sendTransactionalEmail({
    userId: input.userId,
    recipientEmail: input.email,
    subject: "Reset your Terumbu password",
    template: "password_reset",
    payload: {
      name: input.name ?? "",
      resetUrl: authActionUrl("/reset-password", authToken.token),
      expiresAt: authToken.expiresAt.toISOString()
    }
  });
}
