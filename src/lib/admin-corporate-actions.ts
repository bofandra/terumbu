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

const permissionValues = ["program.manage", "esg_manager", "finance_reviewer", "employee_engagement", "executive_viewer", "auditor"];

export async function createCorporateWorkspaceAction(formData: FormData) {
  const admin = await requireRole(["admin"], "/admin/corporate");
  const accountName = textValue(formData.get("accountName"), 180);
  const accountSlug = toSlug(textValue(formData.get("accountSlug"), 180) || accountName);
  const logoUrl = await corporateLogoFromForm(formData);
  const programName = textValue(formData.get("programName"), 220);
  const programSlug = toSlug(textValue(formData.get("programSlug"), 220) || programName);
  const startsAt = parseDate(formData.get("startsAt"));
  const endsAt = parseDate(formData.get("endsAt"));
  const budgetAmount = parseAmount(formData.get("budgetAmount"));
  const currency = textValue(formData.get("currency"), 8).toUpperCase() || "IDR";

  if (!accountName || !accountSlug || !programName || !programSlug || !startsAt || !endsAt || !budgetAmount || endsAt <= startsAt) {
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
  const requestedPermission = textValue(formData.get("permission"), 120);
  const permission = permissionValues.includes(requestedPermission) ? requestedPermission : "executive_viewer";

  if (!accountId || !email) {
    redirect("/admin/corporate?error=permission-invalid");
  }

  const [account] = await db
    .select({ id: corporateAccounts.id, name: corporateAccounts.name })
    .from(corporateAccounts)
    .where(eq(corporateAccounts.id, accountId))
    .limit(1);
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

  if (!account || !user) {
    redirect("/admin/corporate?error=permission-missing");
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

  redirect("/admin/corporate?saved=permission");
}
