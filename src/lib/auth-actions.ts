"use server";

import { randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { accounts, impactPassports, notificationPreferences, profiles, roles, userRoles, users } from "@/db/schema";
import {
  createPasswordHash,
  createSession,
  destroyCurrentSession,
  getDefaultAuthenticatedPath,
  requireUser,
  safeRedirectPath,
  verifyPassword
} from "@/lib/auth";
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

function signupErrorPath(error: string, nextPath: string) {
  return `/signup?error=${error}&next=${encodeURIComponent(nextPath)}`;
}

function toSlug(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);

  return slug || "ocean-hero";
}

function newPassportShareToken() {
  return randomBytes(32).toString("hex");
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

  const [user] = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    redirect(loginErrorPath(nextPath));
  }

  await createSession(user.id);
  redirect(nextPath || (await getDefaultAuthenticatedPath(user.id)));
}

export async function signupAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextPath = safeRedirectPath(formData.get("next"));

  if (!name || !email || password.length < 8) {
    redirect(signupErrorPath("invalid", nextPath));
  }

  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

  if (existingUser) {
    redirect(signupErrorPath("exists", nextPath));
  }

  const now = new Date();
  const [user] = await db
    .insert(users)
    .values({
      email,
      name,
      passwordHash: createPasswordHash(password),
      updatedAt: now
    })
    .returning({ id: users.id });

  await db.insert(accounts).values({
    userId: user.id,
    provider: "credentials",
    providerAccountId: email
  });

  const [userRole] = await db
    .insert(roles)
    .values({
      key: "user",
      name: "User"
    })
    .onConflictDoUpdate({
      target: roles.key,
      set: {
        name: "User"
      }
    })
    .returning({ id: roles.id });

  await db
    .insert(userRoles)
    .values({
      userId: user.id,
      roleId: userRole.id
    })
    .onConflictDoNothing({
      target: [userRoles.userId, userRoles.roleId]
    });

  await db.insert(profiles).values({
    userId: user.id,
    displayName: name,
    location: "Indonesia",
    bio: "New Terumbu Ocean Hero.",
    heroLevel: 1,
    xp: 0,
    isPublic: false,
    updatedAt: now
  });

  await db.insert(impactPassports).values({
    userId: user.id,
    publicSlug: `${toSlug(name)}-${randomBytes(3).toString("hex")}`,
    visibility: "private",
    story: "A new Impact Passport ready to collect donations, lessons, expeditions, and verified evidence.",
    updatedAt: now
  });

  await db.insert(notificationPreferences).values({
    userId: user.id,
    updatedAt: now
  });

  await createSession(user.id);
  redirect(nextPath);
}

export async function logoutAction() {
  await destroyCurrentSession();
  redirect("/login?loggedOut=1");
}

export async function updateAccountAction(formData: FormData) {
  const user = await requireUser("/dashboard/settings");
  const name = String(formData.get("name") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const passportVisibility = normalizePassportVisibility(formData.get("passportVisibility"));
  const isPublic = passportVisibility !== "private";
  const now = new Date();

  if (!name || !displayName) {
    redirect("/dashboard/settings?error=profile");
  }

  await db.update(users).set({ name, updatedAt: now }).where(eq(users.id, user.id));

  const [passport] = await db
    .select({
      shareToken: impactPassports.shareToken
    })
    .from(impactPassports)
    .where(eq(impactPassports.userId, user.id))
    .limit(1);

  await db
    .insert(profiles)
    .values({
      userId: user.id,
      displayName,
      location,
      bio,
      isPublic,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        displayName,
        location,
        bio,
        isPublic,
        updatedAt: now
      }
    });

  await db
    .update(impactPassports)
    .set({
      visibility: passportVisibility,
      shareToken: passportVisibility === "link" ? passport?.shareToken ?? newPassportShareToken() : passport?.shareToken ?? null,
      ...(passportVisibility === "link" ? { shareUpdatedAt: now } : {}),
      updatedAt: now
    })
    .where(eq(impactPassports.userId, user.id));

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

  if (nextPassword.length < 8) {
    redirect("/dashboard/settings?error=password_length");
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

  redirect("/dashboard/settings?saved=password");
}
