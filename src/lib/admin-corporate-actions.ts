"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  adminAuditLogs,
  corporateAccounts,
  corporatePermissions,
  users
} from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { readUploadedImageAsDataUrl } from "@/lib/storage";

function textValue(value: FormDataEntryValue | null, maxLength: number) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

async function writeAdminAuditLog(input: {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(adminAuditLogs).values({
    actorUserId: input.actorUserId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: {
      source: "admin_corporate_portal",
      ...(input.metadata ?? {})
    }
  });
}

async function corporateLogoFromForm(formData: FormData) {
  const upload = await readUploadedImageAsDataUrl(formData.get("logoFile"));

  if (upload.error) {
    redirect(`/admin/corporate?error=image-${upload.error}`);
  }

  return upload.dataUrl;
}

const corporateAccessPermission = "corporate_user";

function corporateReturnPath(formData: FormData, fallback = "/admin/corporate") {
  const returnTo = textValue(formData.get("returnTo"), 500);

  return returnTo.startsWith("/admin/corporate") && !returnTo.startsWith("//") ? returnTo : fallback;
}

function corporateRedirect(formData: FormData, key: "saved" | "error", code: string, fallback = "/admin/corporate"): never {
  const path = corporateReturnPath(formData, fallback);
  const [pathname, rawQuery = ""] = path.split("?", 2);
  const params = new URLSearchParams(rawQuery);

  params.set(key, code);
  redirect(`${pathname}?${params.toString()}`);
}



export async function createCorporateWorkspaceAction(formData: FormData) {
  const admin = await requireRole(["admin"], "/admin/corporate");
  const accountName = textValue(formData.get("accountName"), 180);
  const accountSlug = toSlug(textValue(formData.get("accountSlug"), 180) || accountName);
  const logoUrl = await corporateLogoFromForm(formData);

  if (!accountName || !accountSlug) {
    redirect("/admin/corporate?error=workspace-invalid");
  }

  const [existingAccount] = await db
    .select({ id: corporateAccounts.id, logoUrl: corporateAccounts.logoUrl })
    .from(corporateAccounts)
    .where(eq(corporateAccounts.slug, accountSlug))
    .limit(1);

  if (existingAccount) {
    redirect("/admin/corporate?error=workspace-exists");
  }

  const [account] = await db
    .insert(corporateAccounts)
    .values({
      name: accountName,
      slug: accountSlug,
      logoUrl
    })
    .returning({ id: corporateAccounts.id });

  await writeAdminAuditLog({
    actorUserId: admin.id,
    action: "corporate.account.created",
    entityType: "corporate_accounts",
    entityId: account.id,
    metadata: {
      accountName,
      accountSlug
    }
  });

  redirect(`/admin/corporate/${account.id}?saved=workspace`);
}

export async function assignCorporatePermissionAction(formData: FormData) {
  const admin = await requireRole(["admin"], "/admin/corporate");
  const accountId = textValue(formData.get("corporateAccountId"), 80);
  const email = textValue(formData.get("email"), 255).toLowerCase();
  const permission = corporateAccessPermission;

  if (!accountId || !email) {
    corporateRedirect(formData, "error", "permission-invalid");
  }

  const [account] = await db
    .select({ id: corporateAccounts.id, name: corporateAccounts.name })
    .from(corporateAccounts)
    .where(eq(corporateAccounts.id, accountId))
    .limit(1);
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

  if (!account || !user) {
    corporateRedirect(formData, "error", "permission-missing");
  }

  const [row] = await db
    .insert(corporatePermissions)
    .values({
      corporateAccountId: account.id,
      userId: user.id,
      permission
    })
    .onConflictDoNothing({
      target: [corporatePermissions.corporateAccountId, corporatePermissions.userId, corporatePermissions.permission]
    })
    .returning({ id: corporatePermissions.id });

  await writeAdminAuditLog({
    actorUserId: admin.id,
    action: "corporate.permission.assigned",
    entityType: "corporate_permissions",
    entityId: row?.id ?? null,
    metadata: {
      accountId: account.id,
      accountName: account.name,
      userEmail: email,
      permission
    }
  });

  corporateRedirect(formData, "saved", "permission");
}


export async function updateCorporateAccountAction(formData: FormData) {
  const admin = await requireRole(["admin"], "/admin/corporate");
  const accountId = textValue(formData.get("corporateAccountId"), 80);
  const name = textValue(formData.get("accountName"), 180);
  const slug = toSlug(textValue(formData.get("accountSlug"), 180) || name);
  const upload = await readUploadedImageAsDataUrl(formData.get("logoFile"));

  if (upload.error) {
    corporateRedirect(formData, "error", `image-${upload.error}`);
  }

  if (!accountId || !name || !slug) {
    corporateRedirect(formData, "error", "account-invalid");
  }

  const [current] = await db
    .select({ id: corporateAccounts.id, logoUrl: corporateAccounts.logoUrl })
    .from(corporateAccounts)
    .where(eq(corporateAccounts.id, accountId))
    .limit(1);

  if (!current) {
    corporateRedirect(formData, "error", "account-missing");
  }

  const [slugOwner] = await db
    .select({ id: corporateAccounts.id })
    .from(corporateAccounts)
    .where(eq(corporateAccounts.slug, slug))
    .limit(1);

  if (slugOwner && slugOwner.id !== accountId) {
    corporateRedirect(formData, "error", "account-slug");
  }

  await db
    .update(corporateAccounts)
    .set({
      name,
      slug,
      logoUrl: upload.dataUrl ?? current.logoUrl
    })
    .where(eq(corporateAccounts.id, accountId));

  await writeAdminAuditLog({
    actorUserId: admin.id,
    action: "corporate.account.updated",
    entityType: "corporate_accounts",
    entityId: accountId,
    metadata: { name, slug }
  });

  corporateRedirect(formData, "saved", "account");
}

export async function updateCorporateProgramAction(formData: FormData) {
  await requireRole(["admin"], "/admin/corporate");
  corporateRedirect(formData, "error", "program-owned");
}

export async function removeCorporatePermissionAction(formData: FormData) {
  const admin = await requireRole(["admin"], "/admin/corporate");
  const permissionId = textValue(formData.get("permissionId"), 80);

  if (!permissionId) {
    corporateRedirect(formData, "error", "permission-invalid");
  }

  const [permission] = await db
    .delete(corporatePermissions)
    .where(eq(corporatePermissions.id, permissionId))
    .returning({
      id: corporatePermissions.id,
      corporateAccountId: corporatePermissions.corporateAccountId,
      userId: corporatePermissions.userId
    });

  if (!permission) {
    corporateRedirect(formData, "error", "permission-missing");
  }

  await writeAdminAuditLog({
    actorUserId: admin.id,
    action: "corporate.permission.removed",
    entityType: "corporate_permissions",
    entityId: permission.id,
    metadata: {
      accountId: permission.corporateAccountId,
      userId: permission.userId
    }
  });

  corporateRedirect(formData, "saved", "permission-removed");
}
