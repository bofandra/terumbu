"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  adminAuditLogs,
  corporateAccounts,
  corporatePermissions,
  corporatePrograms,
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

function parseAmount(value: FormDataEntryValue | null) {
  const amount = Number(String(value ?? "").replace(/[^\d.]/g, ""));

  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function parseDate(value: FormDataEntryValue | null) {
  const parsed = new Date(String(value ?? ""));

  return Number.isNaN(parsed.getTime()) ? null : parsed;
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
  const programName = textValue(formData.get("programName"), 220);
  const programSlug = toSlug(textValue(formData.get("programSlug"), 220) || programName);
  const now = new Date();
  const startsAt = parseDate(formData.get("startsAt")) ?? new Date(now.getFullYear(), 0, 1);
  const endsAt = parseDate(formData.get("endsAt")) ?? new Date(now.getFullYear(), 11, 31);
  const budgetAmount = parseAmount(formData.get("budgetAmount"));
  const currency = textValue(formData.get("currency"), 8).toUpperCase() || "IDR";

  if (!accountName || !accountSlug || !programName || !programSlug || !budgetAmount || endsAt <= startsAt) {
    redirect("/admin/corporate?error=workspace-invalid");
  }

  const [existingAccount] = await db
    .select({ id: corporateAccounts.id, logoUrl: corporateAccounts.logoUrl })
    .from(corporateAccounts)
    .where(eq(corporateAccounts.slug, accountSlug))
    .limit(1);
  let account: { id: string };

  if (existingAccount) {
    [account] = await db
      .update(corporateAccounts)
      .set({
        name: accountName,
        logoUrl: logoUrl ?? existingAccount.logoUrl
      })
      .where(eq(corporateAccounts.id, existingAccount.id))
      .returning({ id: corporateAccounts.id });
  } else {
    [account] = await db
      .insert(corporateAccounts)
      .values({
        name: accountName,
        slug: accountSlug,
        logoUrl
      })
      .returning({ id: corporateAccounts.id });
  }

  const [program] = await db
    .insert(corporatePrograms)
    .values({
      corporateAccountId: account.id,
      name: programName,
      slug: programSlug,
      startsAt,
      endsAt,
      budgetAmount: budgetAmount.toFixed(2),
      currency,
      status: "active"
    })
    .onConflictDoUpdate({
      target: corporatePrograms.slug,
      set: {
        corporateAccountId: account.id,
        name: programName,
        startsAt,
        endsAt,
        budgetAmount: budgetAmount.toFixed(2),
        currency,
        status: "active"
      }
    })
    .returning({ id: corporatePrograms.id });

  await writeAdminAuditLog({
    actorUserId: admin.id,
    action: "corporate.workspace.upserted",
    entityType: "corporate_programs",
    entityId: program.id,
    metadata: {
      accountId: account.id,
      accountName,
      programName,
      budgetAmount,
      currency
    }
  });

  redirect("/admin/corporate?saved=workspace");
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
  const admin = await requireRole(["admin"], "/admin/corporate");
  const programId = textValue(formData.get("programId"), 80);
  const name = textValue(formData.get("programName"), 220);
  const slug = toSlug(textValue(formData.get("programSlug"), 220) || name);
  const startsAt = parseDate(formData.get("startsAt"));
  const endsAt = parseDate(formData.get("endsAt"));
  const budgetAmount = parseAmount(formData.get("budgetAmount"));
  const currency = textValue(formData.get("currency"), 8).toUpperCase() || "IDR";
  const status = textValue(formData.get("status"), 80) || "active";

  if (!programId || !name || !slug || !startsAt || !endsAt || !budgetAmount || endsAt <= startsAt) {
    corporateRedirect(formData, "error", "program-invalid");
  }

  const [current] = await db
    .select({ id: corporatePrograms.id, corporateAccountId: corporatePrograms.corporateAccountId })
    .from(corporatePrograms)
    .where(eq(corporatePrograms.id, programId))
    .limit(1);

  if (!current) {
    corporateRedirect(formData, "error", "program-missing");
  }

  const [slugOwner] = await db
    .select({ id: corporatePrograms.id })
    .from(corporatePrograms)
    .where(eq(corporatePrograms.slug, slug))
    .limit(1);

  if (slugOwner && slugOwner.id !== programId) {
    corporateRedirect(formData, "error", "program-slug");
  }

  await db
    .update(corporatePrograms)
    .set({
      name,
      slug,
      startsAt,
      endsAt,
      budgetAmount: budgetAmount.toFixed(2),
      currency,
      status
    })
    .where(eq(corporatePrograms.id, programId));

  await writeAdminAuditLog({
    actorUserId: admin.id,
    action: "corporate.program.updated",
    entityType: "corporate_programs",
    entityId: programId,
    metadata: { accountId: current.corporateAccountId, name, slug, status, budgetAmount, currency }
  });

  corporateRedirect(formData, "saved", "program");
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
