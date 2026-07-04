import "dotenv/config";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import {
  accounts,
  corporateAccounts,
  corporateEmployees,
  corporatePermissions,
  corporatePrograms,
  impactPassports,
  organizationUsers,
  organizations,
  profiles,
  roles,
  userRoles,
  users
} from "../src/db/schema";
import { createPasswordHash } from "../src/lib/password";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const demoPassword = process.env.DEMO_ROLE_PASSWORD ?? "";

if (!demoPassword || demoPassword.length < 12) {
  throw new Error("DEMO_ROLE_PASSWORD is required and must be at least 12 characters.");
}
const now = new Date();

const roleAccounts = [
  {
    roleKey: "user",
    roleName: "User",
    email: "user.demo@terumbu.eco",
    name: "User Demo",
    displayName: "User Demo",
    location: "Indonesia",
    bio: "Demo supporter account for donations, expeditions, Academy learning, and Impact Passport flows.",
    heroLevel: 3,
    xp: 2800
  },
  {
    roleKey: "corporate_admin",
    roleName: "Corporate Admin",
    email: "corporate.demo@terumbu.eco",
    name: "Corporate Demo",
    displayName: "Corporate Demo",
    location: "Jakarta, Indonesia",
    bio: "Demo corporate ESG manager account for the corporate dashboard and report workflows.",
    heroLevel: 6,
    xp: 7200
  },
  {
    roleKey: "partner",
    roleName: "Partner",
    email: "partner.demo@terumbu.eco",
    name: "Partner Demo",
    displayName: "Partner Demo",
    location: "Raja Ampat, Indonesia",
    bio: "Demo conservation partner account for campaign activity and evidence verification workflows.",
    heroLevel: 5,
    xp: 5600
  },
  {
    roleKey: "admin",
    roleName: "Admin",
    email: "admin.demo@terumbu.eco",
    name: "Admin Demo",
    displayName: "Admin Demo",
    location: "Indonesia",
    bio: "Demo platform administrator account for operations, verification, and reconciliation.",
    heroLevel: 8,
    xp: 12000
  }
];

const queryClient = postgres(databaseUrl, {
  max: 1
});

const db = drizzle(queryClient);

function slugFor(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

async function upsertRole(key: string, name: string) {
  const [role] = await db
    .insert(roles)
    .values({ key, name })
    .onConflictDoUpdate({
      target: roles.key,
      set: { name: sql`excluded.name` }
    })
    .returning({ id: roles.id });

  return role;
}

async function upsertUser(account: (typeof roleAccounts)[number]) {
  const [user] = await db
    .insert(users)
    .values({
      email: account.email,
      name: account.name,
      passwordHash: createPasswordHash(demoPassword),
      emailVerifiedAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        name: sql`excluded.name`,
        passwordHash: sql`excluded.password_hash`,
        emailVerifiedAt: sql`excluded.email_verified_at`,
        updatedAt: now
      }
    })
    .returning({ id: users.id, email: users.email });

  await db
    .insert(accounts)
    .values({
      userId: user.id,
      provider: "credentials",
      providerAccountId: account.email
    })
    .onConflictDoUpdate({
      target: [accounts.provider, accounts.providerAccountId],
      set: {
        userId: user.id,
        accessToken: null,
        refreshToken: null,
        expiresAt: null
      }
    });

  await db
    .insert(profiles)
    .values({
      userId: user.id,
      displayName: account.displayName,
      location: account.location,
      bio: account.bio,
      heroLevel: account.heroLevel,
      xp: account.xp,
      isPublic: account.roleKey === "user",
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        displayName: sql`excluded.display_name`,
        location: sql`excluded.location`,
        bio: sql`excluded.bio`,
        heroLevel: sql`excluded.hero_level`,
        xp: sql`excluded.xp`,
        isPublic: sql`excluded.is_public`,
        updatedAt: now
      }
    });

  await db
    .insert(impactPassports)
    .values({
      userId: user.id,
      publicSlug: `${slugFor(account.name)}-role-demo`,
      visibility: account.roleKey === "user" ? "public" : "private",
      story: `Demo ${account.roleName} Impact Passport for validating role-specific user journeys.`,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: impactPassports.userId,
      set: {
        publicSlug: sql`excluded.public_slug`,
        visibility: sql`excluded.visibility`,
        story: sql`excluded.story`,
        updatedAt: now
      }
    });

  return user;
}

async function attachCorporateAccess(userId: string) {
  const [corporateAccount] = await db
    .insert(corporateAccounts)
    .values({
      name: "Nusantara Bank",
      slug: "nusantara-bank",
      logoUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=512&q=80"
    })
    .onConflictDoUpdate({
      target: corporateAccounts.slug,
      set: {
        name: sql`excluded.name`,
        logoUrl: sql`excluded.logo_url`
      }
    })
    .returning({ id: corporateAccounts.id });

  await db
    .insert(corporatePrograms)
    .values({
      corporateAccountId: corporateAccount.id,
      name: "Ocean Impact Program 2026",
      slug: "nusantara-bank-ocean-impact-2026",
      startsAt: new Date("2026-01-01T00:00:00.000Z"),
      endsAt: new Date("2026-12-31T16:59:59.000Z"),
      budgetAmount: "500000000.00",
      currency: "IDR",
      status: "active"
    })
    .onConflictDoUpdate({
      target: corporatePrograms.slug,
      set: {
        corporateAccountId: corporateAccount.id,
        name: sql`excluded.name`,
        startsAt: sql`excluded.starts_at`,
        endsAt: sql`excluded.ends_at`,
        budgetAmount: sql`excluded.budget_amount`,
        currency: sql`excluded.currency`,
        status: sql`excluded.status`
      }
    });

  await db
    .insert(corporateEmployees)
    .values({
      corporateAccountId: corporateAccount.id,
      userId,
      email: "corporate.demo@terumbu.eco",
      name: "Corporate Demo",
      department: "Sustainability",
      role: "program_admin",
      status: "active"
    })
    .onConflictDoUpdate({
      target: [corporateEmployees.corporateAccountId, corporateEmployees.email],
      set: {
        userId: sql`excluded.user_id`,
        name: sql`excluded.name`,
        department: sql`excluded.department`,
        role: sql`excluded.role`,
        status: sql`excluded.status`
      }
    });

  await db
    .insert(corporatePermissions)
    .values({
      corporateAccountId: corporateAccount.id,
      userId,
      permission: "program.manage"
    })
    .onConflictDoNothing({
      target: [corporatePermissions.corporateAccountId, corporatePermissions.userId, corporatePermissions.permission]
    });
}

async function attachPartnerAccess(userId: string) {
  const partnerRows = await db
    .select({
      id: organizations.id,
      slug: organizations.slug
    })
    .from(organizations);

  const primaryPartner = partnerRows.find((organization) => organization.slug === "yayasan-bahari-lestari") ?? partnerRows[0];

  if (!primaryPartner) {
    return;
  }

  await db
    .insert(organizationUsers)
    .values({
      organizationId: primaryPartner.id,
      userId,
      role: "manager",
      status: "active",
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: [organizationUsers.organizationId, organizationUsers.userId],
      set: {
        role: sql`excluded.role`,
        status: sql`excluded.status`,
        updatedAt: now
      }
    });
}

async function seedRoleUsers() {
  const createdAccounts = [];

  for (const account of roleAccounts) {
    const role = await upsertRole(account.roleKey, account.roleName);
    const user = await upsertUser(account);

    await db
      .insert(userRoles)
      .values({
        userId: user.id,
        roleId: role.id
      })
      .onConflictDoNothing({
        target: [userRoles.userId, userRoles.roleId]
      });

    if (account.roleKey === "corporate_admin") {
      await attachCorporateAccess(user.id);
    }

    if (account.roleKey === "partner") {
      await attachPartnerAccess(user.id);
    }

    createdAccounts.push(`${account.roleKey}:${account.email}`);
  }

  console.log(`Seeded role demo accounts: ${createdAccounts.join(", ")}`);
}

seedRoleUsers()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await queryClient.end();
  });
