"use server";

import { randomBytes } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  accounts,
  adminAuditLogs,
  corporateAccounts,
  corporatePermissions,
  impactPassports,
  notificationPreferences,
  organizationUsers,
  organizations,
  profiles,
  roles,
  sessions,
  userRoles,
  users
} from "@/db/schema";
import { createPasswordHash, requireRole } from "@/lib/auth";
import {
  defaultNameForGlobalRole,
  isSystemGlobalRole,
  normalizeCorporatePermission,
  normalizeGlobalRoleKey,
  normalizePartnerMembershipStatus,
  safeAdminUsersReturnPath
} from "@/lib/admin-user-management";
import { normalizePartnerOrganizationRole } from "@/lib/partner-permissions";

function textValue(value: FormDataEntryValue | null, maxLength: number) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function emailValue(value: FormDataEntryValue | null) {
  return textValue(value, 255).toLowerCase();
}

function checked(value: FormDataEntryValue | null) {
  return value === "1" || value === "on" || value === "true";
}

function toSlug(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);

  return slug || "ocean-hero";
}

function adminUsersPath(formData: FormData) {
  return safeAdminUsersReturnPath(textValue(formData.get("returnTo"), 240));
}

function statusPath(path: string, key: "error" | "saved", value: string) {
  const url = new URL(path, "https://terumbu.local");
  url.searchParams.delete("error");
  url.searchParams.delete("saved");
  url.searchParams.set(key, value);

  return `${url.pathname}${url.search}`;
}

function redirectAdminUsers(formData: FormData, key: "error" | "saved", value: string): never {
  redirect(statusPath(adminUsersPath(formData), key, value));
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
      source: "admin_user_management",
      ...(input.metadata ?? {})
    }
  });
}

async function ensureGlobalRole(key: string, name = defaultNameForGlobalRole(key)) {
  const [existingRole] = await db.select({ id: roles.id }).from(roles).where(eq(roles.key, key)).limit(1);

  if (existingRole) {
    return existingRole.id;
  }

  const [role] = await db.insert(roles).values({ key, name }).returning({ id: roles.id });

  return role.id;
}

async function ensurePartnerRoleForUser(userId: string) {
  const roleId = await ensureGlobalRole("partner", "Partner");

  await db
    .insert(userRoles)
    .values({ userId, roleId })
    .onConflictDoNothing({
      target: [userRoles.userId, userRoles.roleId]
    });
}

async function syncPartnerRoleForUser(userId: string) {
  const [activeMembership] = await db
    .select({ id: organizationUsers.id })
    .from(organizationUsers)
    .where(and(eq(organizationUsers.userId, userId), eq(organizationUsers.status, "active")))
    .limit(1);

  if (activeMembership) {
    await ensurePartnerRoleForUser(userId);
    return;
  }

  const [partnerRole] = await db.select({ id: roles.id }).from(roles).where(eq(roles.key, "partner")).limit(1);

  if (partnerRole) {
    await db.delete(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, partnerRole.id)));
  }
}

async function adminRoleAssignmentCount() {
  const [adminRole] = await db.select({ id: roles.id }).from(roles).where(eq(roles.key, "admin")).limit(1);

  if (!adminRole) {
    return 0;
  }

  const [summary] = await db
    .select({ total: sql<number>`count(${userRoles.id})` })
    .from(userRoles)
    .where(eq(userRoles.roleId, adminRole.id));

  return Number(summary?.total ?? 0);
}

async function userHasGlobalRole(userId: string, key: string) {
  const [row] = await db
    .select({ id: userRoles.id })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.userId, userId), eq(roles.key, key)))
    .limit(1);

  return Boolean(row);
}

async function assertCanRemoveAdminAccess(actorUserId: string, targetUserId: string, formData: FormData) {
  if (actorUserId === targetUserId) {
    redirectAdminUsers(formData, "error", "admin-self");
  }

  if ((await adminRoleAssignmentCount()) <= 1) {
    redirectAdminUsers(formData, "error", "admin-last");
  }
}

async function userExists(userId: string) {
  const [user] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, userId)).limit(1);

  return user ?? null;
}

export async function createAdminUserAction(formData: FormData) {
  const actor = await requireRole(["admin"], "/admin/users");
  const name = textValue(formData.get("name"), 160);
  const email = emailValue(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const roleKey = normalizeGlobalRoleKey(textValue(formData.get("initialRole"), 80) || "user");
  const now = new Date();

  if (!name || !validEmail(email) || password.length < 8 || !roleKey) {
    redirectAdminUsers(formData, "error", "user-invalid");
  }

  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

  if (existingUser) {
    redirectAdminUsers(formData, "error", "user-exists");
  }

  const [createdUser] = await db
    .insert(users)
    .values({
      email,
      name,
      passwordHash: createPasswordHash(password),
      emailVerifiedAt: checked(formData.get("emailVerified")) ? now : null,
      updatedAt: now
    })
    .returning({ id: users.id });

  await db.insert(accounts).values({
    userId: createdUser.id,
    provider: "credentials",
    providerAccountId: email
  });

  await db.insert(profiles).values({
    userId: createdUser.id,
    displayName: textValue(formData.get("displayName"), 160) || name,
    location: textValue(formData.get("location"), 160) || "Indonesia",
    bio: textValue(formData.get("bio"), 1000) || "Terumbu account managed by platform admins.",
    heroLevel: 1,
    xp: 0,
    isPublic: checked(formData.get("isPublic")),
    updatedAt: now
  });

  await db.insert(impactPassports).values({
    userId: createdUser.id,
    publicSlug: `${toSlug(name)}-${randomBytes(3).toString("hex")}`,
    visibility: checked(formData.get("isPublic")) ? "public" : "private",
    story: "An Impact Passport prepared by the Terumbu admin team.",
    updatedAt: now
  });

  await db.insert(notificationPreferences).values({
    userId: createdUser.id,
    updatedAt: now
  });

  const roleId = await ensureGlobalRole(roleKey);
  await db
    .insert(userRoles)
    .values({ userId: createdUser.id, roleId })
    .onConflictDoNothing({
      target: [userRoles.userId, userRoles.roleId]
    });

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "admin.user.created",
    entityType: "users",
    entityId: createdUser.id,
    metadata: { email, roleKey }
  });

  redirectAdminUsers(formData, "saved", "user-created");
}

export async function updateAdminUserProfileAction(formData: FormData) {
  const actor = await requireRole(["admin"], "/admin/users");
  const userId = textValue(formData.get("userId"), 80);
  const name = textValue(formData.get("name"), 160);
  const email = emailValue(formData.get("email"));
  const displayName = textValue(formData.get("displayName"), 160) || name || email;
  const location = textValue(formData.get("location"), 160);
  const bio = textValue(formData.get("bio"), 1000);
  const now = new Date();

  if (!userId || !name || !validEmail(email)) {
    redirectAdminUsers(formData, "error", "user-invalid");
  }

  const targetUser = await userExists(userId);

  if (!targetUser) {
    redirectAdminUsers(formData, "error", "user-missing");
  }

  const [emailOwner] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

  if (emailOwner && emailOwner.id !== userId) {
    redirectAdminUsers(formData, "error", "user-exists");
  }

  await db
    .update(users)
    .set({
      name,
      email,
      emailVerifiedAt: checked(formData.get("emailVerified")) ? now : null,
      updatedAt: now
    })
    .where(eq(users.id, userId));

  await db
    .update(accounts)
    .set({ providerAccountId: email })
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, "credentials")));

  await db
    .insert(profiles)
    .values({
      userId,
      displayName,
      location,
      bio,
      isPublic: checked(formData.get("isPublic")),
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        displayName,
        location,
        bio,
        isPublic: checked(formData.get("isPublic")),
        updatedAt: now
      }
    });

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "admin.user.updated",
    entityType: "users",
    entityId: userId,
    metadata: { previousEmail: targetUser.email, email }
  });

  redirectAdminUsers(formData, "saved", "user-updated");
}

export async function resetAdminUserPasswordAction(formData: FormData) {
  const actor = await requireRole(["admin"], "/admin/users");
  const userId = textValue(formData.get("userId"), 80);
  const password = String(formData.get("password") ?? "");
  const targetUser = userId ? await userExists(userId) : null;

  if (!targetUser || password.length < 8) {
    redirectAdminUsers(formData, "error", "user-invalid");
  }

  await db
    .update(users)
    .set({
      passwordHash: createPasswordHash(password),
      updatedAt: new Date()
    })
    .where(eq(users.id, userId));

  await db
    .insert(accounts)
    .values({
      userId,
      provider: "credentials",
      providerAccountId: targetUser.email
    })
    .onConflictDoNothing({
      target: [accounts.provider, accounts.providerAccountId]
    });

  if (actor.id !== userId) {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "admin.user.password_reset",
    entityType: "users",
    entityId: userId,
    metadata: { email: targetUser.email, sessionsCleared: actor.id !== userId }
  });

  redirectAdminUsers(formData, "saved", "password-reset");
}

export async function clearAdminUserSessionsAction(formData: FormData) {
  const actor = await requireRole(["admin"], "/admin/users");
  const userId = textValue(formData.get("userId"), 80);
  const targetUser = userId ? await userExists(userId) : null;

  if (!targetUser) {
    redirectAdminUsers(formData, "error", "user-missing");
  }

  if (actor.id === userId) {
    redirectAdminUsers(formData, "error", "session-self");
  }

  await db.delete(sessions).where(eq(sessions.userId, userId));

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "admin.user.sessions_cleared",
    entityType: "users",
    entityId: userId,
    metadata: { email: targetUser.email }
  });

  redirectAdminUsers(formData, "saved", "sessions-cleared");
}

export async function disableAdminUserPasswordAction(formData: FormData) {
  const actor = await requireRole(["admin"], "/admin/users");
  const userId = textValue(formData.get("userId"), 80);
  const targetUser = userId ? await userExists(userId) : null;

  if (!targetUser) {
    redirectAdminUsers(formData, "error", "user-missing");
  }

  if (actor.id === userId) {
    redirectAdminUsers(formData, "error", "admin-self");
  }

  if (await userHasGlobalRole(userId, "admin")) {
    await assertCanRemoveAdminAccess(actor.id, userId, formData);
  }

  await db.update(users).set({ passwordHash: null, updatedAt: new Date() }).where(eq(users.id, userId));
  await db.delete(sessions).where(eq(sessions.userId, userId));

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "admin.user.password_disabled",
    entityType: "users",
    entityId: userId,
    metadata: { email: targetUser.email }
  });

  redirectAdminUsers(formData, "saved", "password-disabled");
}

export async function deleteAdminUserAction(formData: FormData) {
  const actor = await requireRole(["admin"], "/admin/users");
  const userId = textValue(formData.get("userId"), 80);
  const targetUser = userId ? await userExists(userId) : null;

  if (!targetUser || textValue(formData.get("confirmDelete"), 20) !== "delete") {
    redirectAdminUsers(formData, "error", "delete-confirm");
  }

  if (actor.id === userId) {
    redirectAdminUsers(formData, "error", "admin-self");
  }

  if (await userHasGlobalRole(userId, "admin")) {
    await assertCanRemoveAdminAccess(actor.id, userId, formData);
  }

  await db.delete(users).where(eq(users.id, userId));

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "admin.user.deleted",
    entityType: "users",
    entityId: userId,
    metadata: { email: targetUser.email }
  });

  redirectAdminUsers(formData, "saved", "user-deleted");
}

export async function createGlobalRoleAction(formData: FormData) {
  const actor = await requireRole(["admin"], "/admin/users");
  const key = normalizeGlobalRoleKey(textValue(formData.get("roleKey"), 80));
  const name = textValue(formData.get("roleName"), 120) || defaultNameForGlobalRole(key);

  if (!key || !name) {
    redirectAdminUsers(formData, "error", "role-invalid");
  }

  const [role] = await db
    .insert(roles)
    .values({ key, name })
    .onConflictDoUpdate({
      target: roles.key,
      set: { name }
    })
    .returning({ id: roles.id });

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "admin.role.upserted",
    entityType: "roles",
    entityId: role.id,
    metadata: { key, name }
  });

  redirectAdminUsers(formData, "saved", "role-saved");
}

export async function updateGlobalRoleAction(formData: FormData) {
  const actor = await requireRole(["admin"], "/admin/users");
  const roleId = textValue(formData.get("roleId"), 80);
  const name = textValue(formData.get("roleName"), 120);

  if (!roleId || !name) {
    redirectAdminUsers(formData, "error", "role-invalid");
  }

  const [role] = await db.update(roles).set({ name }).where(eq(roles.id, roleId)).returning({ id: roles.id, key: roles.key });

  if (!role) {
    redirectAdminUsers(formData, "error", "role-missing");
  }

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "admin.role.updated",
    entityType: "roles",
    entityId: role.id,
    metadata: { key: role.key, name }
  });

  redirectAdminUsers(formData, "saved", "role-saved");
}

export async function deleteGlobalRoleAction(formData: FormData) {
  const actor = await requireRole(["admin"], "/admin/users");
  const roleId = textValue(formData.get("roleId"), 80);

  if (!roleId || textValue(formData.get("confirmDelete"), 20) !== "delete") {
    redirectAdminUsers(formData, "error", "delete-confirm");
  }

  const [role] = await db.select({ id: roles.id, key: roles.key, name: roles.name }).from(roles).where(eq(roles.id, roleId)).limit(1);

  if (!role) {
    redirectAdminUsers(formData, "error", "role-missing");
  }

  if (isSystemGlobalRole(role.key)) {
    redirectAdminUsers(formData, "error", "role-system");
  }

  const [assignmentSummary] = await db
    .select({ total: sql<number>`count(${userRoles.id})` })
    .from(userRoles)
    .where(eq(userRoles.roleId, role.id));

  if (Number(assignmentSummary?.total ?? 0) > 0) {
    redirectAdminUsers(formData, "error", "role-assigned");
  }

  await db.delete(roles).where(eq(roles.id, role.id));

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "admin.role.deleted",
    entityType: "roles",
    entityId: role.id,
    metadata: { key: role.key, name: role.name }
  });

  redirectAdminUsers(formData, "saved", "role-deleted");
}

export async function assignGlobalRoleAction(formData: FormData) {
  const actor = await requireRole(["admin"], "/admin/users");
  const userId = textValue(formData.get("userId"), 80);
  const roleKey = normalizeGlobalRoleKey(textValue(formData.get("roleKey"), 80));
  const targetUser = userId ? await userExists(userId) : null;

  if (!targetUser || !roleKey) {
    redirectAdminUsers(formData, "error", "role-invalid");
  }

  const roleId = await ensureGlobalRole(roleKey);

  await db
    .insert(userRoles)
    .values({ userId, roleId })
    .onConflictDoNothing({
      target: [userRoles.userId, userRoles.roleId]
    });

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "admin.user_role.assigned",
    entityType: "users",
    entityId: userId,
    metadata: { email: targetUser.email, roleKey }
  });

  redirectAdminUsers(formData, "saved", "global-role-assigned");
}

export async function revokeGlobalRoleAction(formData: FormData) {
  const actor = await requireRole(["admin"], "/admin/users");
  const userRoleId = textValue(formData.get("userRoleId"), 80);

  if (!userRoleId) {
    redirectAdminUsers(formData, "error", "role-invalid");
  }

  const [assignment] = await db
    .select({
      id: userRoles.id,
      userId: userRoles.userId,
      roleKey: roles.key,
      roleName: roles.name,
      email: users.email
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(users, eq(userRoles.userId, users.id))
    .where(eq(userRoles.id, userRoleId))
    .limit(1);

  if (!assignment) {
    redirectAdminUsers(formData, "error", "role-missing");
  }

  if (assignment.roleKey === "admin") {
    await assertCanRemoveAdminAccess(actor.id, assignment.userId, formData);
  }

  await db.delete(userRoles).where(eq(userRoles.id, userRoleId));

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "admin.user_role.revoked",
    entityType: "users",
    entityId: assignment.userId,
    metadata: { email: assignment.email, roleKey: assignment.roleKey, roleName: assignment.roleName }
  });

  redirectAdminUsers(formData, "saved", "global-role-revoked");
}

export async function setPartnerMembershipAction(formData: FormData) {
  const actor = await requireRole(["admin"], "/admin/users");
  const userId = textValue(formData.get("userId"), 80);
  const organizationId = textValue(formData.get("organizationId"), 80);
  const role = normalizePartnerOrganizationRole(textValue(formData.get("role"), 80), "manager");
  const status = normalizePartnerMembershipStatus(textValue(formData.get("status"), 80));
  const targetUser = userId ? await userExists(userId) : null;

  if (!targetUser || !organizationId) {
    redirectAdminUsers(formData, "error", "partner-invalid");
  }

  const [organization] = await db.select({ id: organizations.id, name: organizations.name }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);

  if (!organization) {
    redirectAdminUsers(formData, "error", "partner-invalid");
  }

  await db
    .insert(organizationUsers)
    .values({
      organizationId,
      userId,
      role,
      status,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: [organizationUsers.organizationId, organizationUsers.userId],
      set: { role, status, updatedAt: new Date() }
    });

  await syncPartnerRoleForUser(userId);

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "admin.partner_membership.set",
    entityType: "organization_users",
    metadata: { userId, email: targetUser.email, organizationId, organizationName: organization.name, role, status }
  });

  redirectAdminUsers(formData, "saved", "partner-saved");
}

export async function updatePartnerMembershipAction(formData: FormData) {
  const actor = await requireRole(["admin"], "/admin/users");
  const membershipId = textValue(formData.get("membershipId"), 80);
  const role = normalizePartnerOrganizationRole(textValue(formData.get("role"), 80), "manager");
  const status = normalizePartnerMembershipStatus(textValue(formData.get("status"), 80));

  if (!membershipId) {
    redirectAdminUsers(formData, "error", "partner-invalid");
  }

  const [membership] = await db
    .update(organizationUsers)
    .set({ role, status, updatedAt: new Date() })
    .where(eq(organizationUsers.id, membershipId))
    .returning({
      id: organizationUsers.id,
      userId: organizationUsers.userId,
      organizationId: organizationUsers.organizationId
    });

  if (!membership) {
    redirectAdminUsers(formData, "error", "partner-invalid");
  }

  await syncPartnerRoleForUser(membership.userId);

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "admin.partner_membership.updated",
    entityType: "organization_users",
    entityId: membership.id,
    metadata: { userId: membership.userId, organizationId: membership.organizationId, role, status }
  });

  redirectAdminUsers(formData, "saved", "partner-saved");
}

export async function removePartnerMembershipAction(formData: FormData) {
  const actor = await requireRole(["admin"], "/admin/users");
  const membershipId = textValue(formData.get("membershipId"), 80);

  if (!membershipId) {
    redirectAdminUsers(formData, "error", "partner-invalid");
  }

  const [membership] = await db
    .delete(organizationUsers)
    .where(eq(organizationUsers.id, membershipId))
    .returning({
      id: organizationUsers.id,
      userId: organizationUsers.userId,
      organizationId: organizationUsers.organizationId
    });

  if (!membership) {
    redirectAdminUsers(formData, "error", "partner-invalid");
  }

  await syncPartnerRoleForUser(membership.userId);

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "admin.partner_membership.removed",
    entityType: "organization_users",
    entityId: membership.id,
    metadata: { userId: membership.userId, organizationId: membership.organizationId }
  });

  redirectAdminUsers(formData, "saved", "partner-removed");
}

export async function setCorporatePermissionAction(formData: FormData) {
  const actor = await requireRole(["admin"], "/admin/users");
  const userId = textValue(formData.get("userId"), 80);
  const corporateAccountId = textValue(formData.get("corporateAccountId"), 80);
  const permission = normalizeCorporatePermission(textValue(formData.get("permission"), 120));
  const targetUser = userId ? await userExists(userId) : null;

  if (!targetUser || !corporateAccountId) {
    redirectAdminUsers(formData, "error", "corporate-invalid");
  }

  const [account] = await db.select({ id: corporateAccounts.id, name: corporateAccounts.name }).from(corporateAccounts).where(eq(corporateAccounts.id, corporateAccountId)).limit(1);

  if (!account) {
    redirectAdminUsers(formData, "error", "corporate-invalid");
  }

  await db.delete(corporatePermissions).where(and(eq(corporatePermissions.userId, userId), eq(corporatePermissions.corporateAccountId, corporateAccountId)));

  const [row] = await db
    .insert(corporatePermissions)
    .values({
      corporateAccountId,
      userId,
      permission
    })
    .returning({ id: corporatePermissions.id });

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "admin.corporate_permission.set",
    entityType: "corporate_permissions",
    entityId: row.id,
    metadata: { userId, email: targetUser.email, corporateAccountId, accountName: account.name, permission }
  });

  redirectAdminUsers(formData, "saved", "corporate-saved");
}

export async function removeCorporatePermissionAction(formData: FormData) {
  const actor = await requireRole(["admin"], "/admin/users");
  const permissionId = textValue(formData.get("permissionId"), 80);

  if (!permissionId) {
    redirectAdminUsers(formData, "error", "corporate-invalid");
  }

  const [row] = await db
    .delete(corporatePermissions)
    .where(eq(corporatePermissions.id, permissionId))
    .returning({
      id: corporatePermissions.id,
      userId: corporatePermissions.userId,
      corporateAccountId: corporatePermissions.corporateAccountId,
      permission: corporatePermissions.permission
    });

  if (!row) {
    redirectAdminUsers(formData, "error", "corporate-invalid");
  }

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "admin.corporate_permission.removed",
    entityType: "corporate_permissions",
    entityId: row.id,
    metadata: { userId: row.userId, corporateAccountId: row.corporateAccountId, permission: row.permission }
  });

  redirectAdminUsers(formData, "saved", "corporate-removed");
}
