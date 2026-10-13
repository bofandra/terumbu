"use server";

import { randomBytes } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { accounts, impactPassports, profiles, sessions, users } from "@/db/schema";
import {
  createPasswordHash,
  createSession,
  destroyCurrentSession,
  getDefaultAuthenticatedPath,
  requireUser,
  revokeOtherUserSessions,
  safeRedirectPath,
  verifyPassword
} from "@/lib/auth";
import {
  consumeAuthToken,
  deleteAuthTokensForUser,
  passwordRecoveryEmailPurposeForUser,
  sendAccountSetupEmail,
  sendEmailVerificationEmail,
  sendPasswordResetEmail
} from "@/lib/auth-tokens";
import {
  authRateLimitKey,
  hashAuthRateLimitIdentifier,
  type AuthRateLimitPolicy
} from "@/lib/auth-rate-limit";
import {
  clearDistributedAuthRateLimit,
  consumeDistributedAuthRateLimits
} from "@/lib/distributed-auth-rate-limit";
import { verifiedProxyClientIdentifier } from "@/lib/trusted-proxy-client";
import {
  normalizePassportEvidenceConsent,
  normalizePassportVisibility,
  passportShareCategories,
  passportShareExpiresAtFromDateInput,
  type PassportCategoryVisibility
} from "@/lib/passport-sharing";

function loginErrorPath(nextPath: string) {
  return `/login?error=invalid&next=${encodeURIComponent(nextPath)}`;
}

function loginUnverifiedPath(nextPath: string) {
  return `/login?error=unverified&next=${encodeURIComponent(nextPath)}`;
}

function loginRateLimitedPath(nextPath: string) {
  return `/login?error=rate_limit&next=${encodeURIComponent(nextPath)}`;
}

function loginVerificationSentPath(nextPath: string) {
  const params = new URLSearchParams({ verification: "sent" });

  if (nextPath) {
    params.set("next", nextPath);
  }

  return `/login?${params.toString()}`;
}

function registrationClosedLoginPath(nextPath: string) {
  const params = new URLSearchParams({ registration: "closed" });

  if (nextPath) {
    params.set("next", nextPath);
  }

  return `/login?${params.toString()}`;
}

function newPassportShareToken() {
  return randomBytes(32).toString("hex");
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

/**
 * Only edge-authenticated IP addresses may split the per-client rate limits.
 * Without trusted proxy metadata, the account-specific fallback is more
 * restrictive and cannot be reset by changing spoofed HTTP request headers.
 */
const authRateLimitPolicies = {
  login: {
    pair: { limit: 8, windowMs: FIFTEEN_MINUTES_MS },
    client: { limit: 120, windowMs: FIFTEEN_MINUTES_MS },
    account: { limit: 30, windowMs: FIFTEEN_MINUTES_MS },
    untrustedAccount: { limit: 8, windowMs: FIFTEEN_MINUTES_MS }
  },
  recovery: {
    pair: { limit: 3, windowMs: FIFTEEN_MINUTES_MS },
    client: { limit: 15, windowMs: FIFTEEN_MINUTES_MS },
    account: { limit: 5, windowMs: FIFTEEN_MINUTES_MS },
    untrustedAccount: { limit: 3, windowMs: FIFTEEN_MINUTES_MS }
  },
  verification: {
    pair: { limit: 3, windowMs: FIFTEEN_MINUTES_MS },
    client: { limit: 15, windowMs: FIFTEEN_MINUTES_MS },
    account: { limit: 5, windowMs: FIFTEEN_MINUTES_MS },
    untrustedAccount: { limit: 3, windowMs: FIFTEEN_MINUTES_MS }
  }
} satisfies Record<string, {
  pair: AuthRateLimitPolicy;
  client: AuthRateLimitPolicy;
  account: AuthRateLimitPolicy;
  untrustedAccount: AuthRateLimitPolicy;
}>;

type AuthRateLimitFlow = keyof typeof authRateLimitPolicies;

async function authClientIdentifier() {
  return verifiedProxyClientIdentifier(await headers());
}

function authFlowRateLimitKeys(flow: AuthRateLimitFlow, email: string, clientIdentifier: string | null) {
  const accountIdentifier = hashAuthRateLimitIdentifier(email || "invalid-email");

  return {
    account: authRateLimitKey(`${flow}:account`, accountIdentifier),
    untrustedAccount: authRateLimitKey(`${flow}:untrusted-account`, accountIdentifier),
    pair: clientIdentifier
      ? authRateLimitKey(`${flow}:pair`, accountIdentifier, clientIdentifier)
      : null,
    client: clientIdentifier
      ? authRateLimitKey(`${flow}:client`, clientIdentifier)
      : null
  };
}

async function consumeAuthFlow(flow: AuthRateLimitFlow, keys: ReturnType<typeof authFlowRateLimitKeys>) {
  const policy = authRateLimitPolicies[flow];

  if (!keys.pair || !keys.client) {
    // Treat all unverified clients of an account as one capped pool. In
    // particular, malicious changes to XFF/CF-IP/User-Agent do not alter it.
    return consumeDistributedAuthRateLimits([
      { key: keys.account, policy: policy.account },
      { key: keys.untrustedAccount, policy: policy.untrustedAccount }
    ]);
  }

  return consumeDistributedAuthRateLimits([
    { key: keys.pair, policy: policy.pair },
    { key: keys.client, policy: policy.client },
    { key: keys.account, policy: policy.account }
  ]);
}

function resetPasswordPath(error: string, token?: string) {
  const params = new URLSearchParams({ error });

  if (token) {
    params.set("token", token);
  }

  return `/reset-password?${params.toString()}`;
}

function passportCategoryVisibilityFromForm(formData: FormData): PassportCategoryVisibility {
  return passportShareCategories.reduce((visibility, category) => {
    visibility[category.key] = formData.get(`categoryVisibility:${category.key}`) === "on";

    return visibility;
  }, {} as PassportCategoryVisibility);
}

function shareAccessHashFromForm(formData: FormData, existingHash: string | null) {
  if (formData.get("clearShareAccessCode") === "on") {
    return null;
  }

  const accessCode = String(formData.get("shareAccessCode") ?? "").trim();

  if (!accessCode) {
    return existingHash;
  }

  if (accessCode.length < 4 || accessCode.length > 80) {
    redirect("/dashboard/passport?error=access_code");
  }

  return createPasswordHash(accessCode);
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextPath = safeRedirectPath(formData.get("next"), "");

  if (!email || !password) {
    redirect(loginErrorPath(nextPath));
  }

  const clientIdentifier = await authClientIdentifier();
  const loginKeys = authFlowRateLimitKeys("login", email, clientIdentifier);

  if (!await consumeAuthFlow("login", loginKeys)) {
    redirect(loginRateLimitedPath(nextPath));
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      passwordHash: users.passwordHash,
      emailVerifiedAt: users.emailVerifiedAt
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const passwordIsValid = verifyPassword(password, user?.passwordHash ?? null);

  if (!user || !passwordIsValid) {
    redirect(loginErrorPath(nextPath));
  }

  // Successful credentials clear this account/client pair, but retain the
  // account-wide and client-wide counters against distributed spraying.
  if (loginKeys.pair) await clearDistributedAuthRateLimit(loginKeys.pair);

  if (!user.emailVerifiedAt) {
    if (await consumeAuthFlow("verification", authFlowRateLimitKeys("verification", user.email, clientIdentifier))) {
      await sendEmailVerificationEmail({
        userId: user.id,
        email: user.email,
        name: user.name
      });
    }

    redirect(loginUnverifiedPath(nextPath));
  }

  await createSession(user.id);
  redirect(nextPath || (await getDefaultAuthenticatedPath(user.id)));
}

export async function signupAction(formData: FormData) {
  const nextPath = safeRedirectPath(formData.get("next"), "");

  redirect(registrationClosedLoginPath(nextPath));
}

export async function logoutAction() {
  await destroyCurrentSession();
  redirect("/login?loggedOut=1");
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const clientIdentifier = await authClientIdentifier();

  if (!await consumeAuthFlow("recovery", authFlowRateLimitKeys("recovery", email, clientIdentifier))) {
    redirect("/forgot-password?sent=1");
  }

  if (validEmail(email)) {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        passwordHash: users.passwordHash,
        emailVerifiedAt: users.emailVerifiedAt
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user) {
      const recoveryPurpose = passwordRecoveryEmailPurposeForUser(user);

      if (recoveryPurpose === "password_reset") {
        await sendPasswordResetEmail({
          userId: user.id,
          email: user.email,
          name: user.name
        });
      } else {
        await sendAccountSetupEmail({
          userId: user.id,
          email: user.email,
          name: user.name
        });
      }
    }
  }

  redirect("/forgot-password?sent=1");
}

export async function requestVerificationEmailAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const nextPath = safeRedirectPath(formData.get("next"), "");
  const clientIdentifier = await authClientIdentifier();

  if (!await consumeAuthFlow("verification", authFlowRateLimitKeys("verification", email, clientIdentifier))) {
    redirect(loginVerificationSentPath(nextPath));
  }

  if (validEmail(email)) {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        passwordHash: users.passwordHash,
        emailVerifiedAt: users.emailVerifiedAt
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user && !user.emailVerifiedAt) {
      if (user.passwordHash) {
        await sendEmailVerificationEmail({
          userId: user.id,
          email: user.email,
          name: user.name
        });
      } else {
        await sendAccountSetupEmail({
          userId: user.id,
          email: user.email,
          name: user.name
        });
      }
    }
  }

  redirect(loginVerificationSentPath(nextPath));
}

export async function completePasswordResetAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) {
    redirect(resetPasswordPath("password_length", token));
  }

  if (password !== confirmPassword) {
    redirect(resetPasswordPath("password_match", token));
  }

  const record = await consumeAuthToken(token, ["account_setup", "password_reset"]);

  if (!record) {
    redirect(resetPasswordPath("invalid"));
  }

  const now = new Date();

  await db
    .update(users)
    .set({
      passwordHash: createPasswordHash(password),
      emailVerifiedAt: now,
      updatedAt: now
    })
    .where(eq(users.id, record.userId));

  await db
    .update(accounts)
    .set({ providerAccountId: record.email })
    .where(and(eq(accounts.userId, record.userId), eq(accounts.provider, "credentials")));

  await db
    .insert(accounts)
    .values({
      userId: record.userId,
      provider: "credentials",
      providerAccountId: record.email
    })
    .onConflictDoNothing({
      target: [accounts.provider, accounts.providerAccountId]
    });

  await db.delete(sessions).where(eq(sessions.userId, record.userId));
  await deleteAuthTokensForUser(record.userId);

  redirect("/login?reset=1");
}

export async function updateAccountAction(formData: FormData) {
  const user = await requireUser("/dashboard/settings");
  const name = String(formData.get("name") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const now = new Date();

  if (!name || !displayName) {
    redirect("/dashboard/settings?error=profile");
  }

  await db.update(users).set({ name, updatedAt: now }).where(eq(users.id, user.id));

  await db
    .insert(profiles)
    .values({
      userId: user.id,
      displayName,
      location,
      bio,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        displayName,
        location,
        bio,
        updatedAt: now
      }
    });

  redirect("/dashboard/settings?saved=profile");
}

export async function updatePassportVisibilityAction(formData: FormData) {
  const user = await requireUser("/dashboard/passport");
  const passportVisibility = normalizePassportVisibility(formData.get("passportVisibility"));
  const isPublic = passportVisibility !== "private";
  const now = new Date();

  const [passport] = await db
    .select({
      shareToken: impactPassports.shareToken,
      shareAccessHash: impactPassports.shareAccessHash
    })
    .from(impactPassports)
    .where(eq(impactPassports.userId, user.id))
    .limit(1);

  const shouldRotateShareToken = formData.get("rotateShareToken") === "on";
  const shareToken =
    passportVisibility === "link"
      ? shouldRotateShareToken || !passport?.shareToken
        ? newPassportShareToken()
        : passport.shareToken
      : passport?.shareToken ?? null;
  const shareAccessHash = shareAccessHashFromForm(formData, passport?.shareAccessHash ?? null);
  const shareExpiresAt = passportVisibility === "link" ? passportShareExpiresAtFromDateInput(formData.get("shareExpiresAt"), now) : null;
  const categoryVisibility = passportCategoryVisibilityFromForm(formData);
  const evidenceConsent = normalizePassportEvidenceConsent(formData.get("evidenceConsent"));

  await db.update(profiles).set({ isPublic, updatedAt: now }).where(eq(profiles.userId, user.id));

  await db
    .update(impactPassports)
    .set({
      visibility: passportVisibility,
      shareToken,
      shareExpiresAt,
      shareAccessHash,
      categoryVisibility,
      evidenceConsent,
      shareUpdatedAt: now,
      updatedAt: now
    })
    .where(eq(impactPassports.userId, user.id));

  redirect("/dashboard/passport?saved=visibility");
}

export async function changePasswordAction(formData: FormData) {
  const sessionUser = await requireUser("/dashboard/settings");
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const nextPassword = String(formData.get("nextPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (nextPassword.length < 8) {
    redirect("/dashboard/settings?error=password_length");
  }

  if (nextPassword !== confirmPassword) {
    redirect("/dashboard/settings?error=password_match");
  }

  const [user] = await db
    .select({
      passwordHash: users.passwordHash
    })
    .from(users)
    .where(eq(users.id, sessionUser.id))
    .limit(1);

  if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
    redirect("/dashboard/settings?error=password_current");
  }

  await db
    .update(users)
    .set({
      passwordHash: createPasswordHash(nextPassword),
      updatedAt: new Date()
    })
    .where(eq(users.id, sessionUser.id));

  // Changing credentials must terminate other devices, but keep this session active.
  await revokeOtherUserSessions(sessionUser.id);

  redirect("/dashboard/settings?saved=password");
}
