import "dotenv/config";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../src/db/schema";
import { createPasswordHash } from "../src/lib/password";

const {
  accounts,
  adminAuditLogs,
  assessmentAttempts,
  campaignUpdates,
  campaigns,
  campaignFollowSubscriptions,
  corporateAccounts,
  corporateEmployees,
  corporateEvidenceCenter,
  corporatePermissions,
  corporateProgramBudgets,
  corporatePrograms,
  corporateProjectPortfolio,
  corporateReportExports,
  courseAssessments,
  courseCertificates,
  courseEnrollments,
  courseLessons,
  courses,
  donationReceipts,
  donations,
  emailLogs,
  expeditionBookingPayments,
  expeditionBookings,
  expeditionDepartures,
  expeditionParticipants,
  expeditions,
  impactPassportItems,
  impactPassports,
  impactSites,
  lessonProgress,
  monthlyImpactReports,
  notificationPreferences,
  organizationUsers,
  organizations,
  paymentTransactions,
  profiles,
  projectEvidence,
  roles,
  sponsoredEcosystems,
  userRoles,
  userNotifications,
  userSavedCampaigns,
  users
} = schema;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required before running the seed script.");
}

const DEMO_EMAIL = "demo@terumbu.eco";
const DEMO_PASSWORD = process.env.DEMO_ACCOUNT_PASSWORD ?? "TerumbuDemo2026!";
const DEMO_PASSWORD_SALT = "terumbu-demo-account-v1";

const ids = {
  roleUser: "11111111-1111-4111-8111-111111111111",
  roleCorporateAdmin: "11111111-1111-4111-8111-111111111112",
  rolePartner: "11111111-1111-4111-8111-111111111113",
  roleAdmin: "11111111-1111-4111-8111-111111111114",
  demoAccount: "22222222-2222-4222-8222-222222222221",
  userRoleUser: "22222222-2222-4222-8222-222222222222",
  userRoleCorporateAdmin: "22222222-2222-4222-8222-222222222223",
  organizationRajaAmpat: "33333333-3333-4333-8333-333333333331",
  organizationBali: "33333333-3333-4333-8333-333333333332",
  organizationKomodo: "33333333-3333-4333-8333-333333333333",
  campaignUpdateRajaAmpat: "55555555-5555-4555-8555-555555555551",
  campaignUpdateBali: "55555555-5555-4555-8555-555555555552",
  campaignUpdateKomodo: "55555555-5555-4555-8555-555555555553",
  impactSiteRajaAmpat: "66666666-6666-4666-8666-666666666661",
  impactSiteBali: "66666666-6666-4666-8666-666666666662",
  impactSiteKomodo: "66666666-6666-4666-8666-666666666663",
  donationRajaAmpat: "77777777-7777-4777-8777-777777777771",
  donationBali: "77777777-7777-4777-8777-777777777772",
  donationKomodo: "77777777-7777-4777-8777-777777777773",
  transactionRajaAmpat: "88888888-8888-4888-8888-888888888881",
  transactionBali: "88888888-8888-4888-8888-888888888882",
  transactionKomodo: "88888888-8888-4888-8888-888888888883",
  receiptRajaAmpat: "88888888-8888-4888-8888-888888888891",
  receiptBali: "88888888-8888-4888-8888-888888888892",
  receiptKomodo: "88888888-8888-4888-8888-888888888893",
  ecosystemCoral1: "99999999-9999-4999-8999-999999999991",
  ecosystemCoral2: "99999999-9999-4999-8999-999999999992",
  ecosystemMangrove: "99999999-9999-4999-8999-999999999993",
  evidenceRajaAmpat: "dddddddd-dddd-4ddd-8ddd-dddddddddd01",
  evidenceBali: "dddddddd-dddd-4ddd-8ddd-dddddddddd02",
  evidenceKomodo: "dddddddd-dddd-4ddd-8ddd-dddddddddd03",
  evidenceRajaAmpatBefore: "dddddddd-dddd-4ddd-8ddd-dddddddddd04",
  evidenceBaliBefore: "dddddddd-dddd-4ddd-8ddd-dddddddddd05",
  evidenceKomodoBefore: "dddddddd-dddd-4ddd-8ddd-dddddddddd06",
  savedCampaignRaja: "dddddddd-dddd-4ddd-8ddd-dddddddddd07",
  followCampaignRaja: "dddddddd-dddd-4ddd-8ddd-dddddddddd08",
  notificationFollowUpdate: "dddddddd-dddd-4ddd-8ddd-dddddddddd09",
  monthlyReportDemo: "dddddddd-dddd-4ddd-8ddd-dddddddddd0a",
  departureRajaAmpat: "dddddddd-dddd-4ddd-8ddd-dddddddddd11",
  departureWakatobi: "dddddddd-dddd-4ddd-8ddd-dddddddddd12",
  bookingRajaAmpat: "dddddddd-dddd-4ddd-8ddd-dddddddddd21",
  bookingParticipantRaka: "dddddddd-dddd-4ddd-8ddd-dddddddddd31",
  bookingPaymentRajaAmpat: "dddddddd-dddd-4ddd-8ddd-dddddddddd41",
  oceanLessonIntro: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01",
  oceanLessonThreats: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee02",
  coralLessonMethods: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee03",
  coralLessonMonitoring: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee04",
  esgLessonFunding: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee05",
  esgLessonReporting: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee06",
  enrollmentOceanExplorer: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee11",
  lessonProgressIntro: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee21",
  lessonProgressThreats: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee22",
  assessmentOceanExplorer: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee31",
  assessmentAttemptOceanExplorer: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee41",
  certificateOceanExplorer: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee51",
  passportItemDonation: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
  passportItemCoral: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
  passportItemExpedition: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
  passportItemCourse: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4",
  corporateAccount: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  corporateProgram: "bbbbbbbb-bbbb-4bbb-8bbb-000000000001",
  corporateBudgetRestoration: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbd1",
  corporateBudgetEducation: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbd2",
  corporateBudgetReporting: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbd3",
  corporateEmployeeDemo: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbe1",
  corporateEmployeeFinance: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbe2",
  corporatePortfolioRaja: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbf1",
  corporatePortfolioBali: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbf2",
  corporateEvidenceRaja: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbba1",
  corporateEvidenceBali: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbba2",
  corporateReportExport: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb91",
  corporatePermission: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb92",
  emailReceiptRaja: "cccccccc-cccc-4ccc-8ccc-cccccccccc01",
  emailBookingRaja: "cccccccc-cccc-4ccc-8ccc-cccccccccc02",
  auditLog: "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
};

const queryClient = postgres(databaseUrl, {
  max: 1
});

const db = drizzle(queryClient, { schema });

function passwordHash(password: string) {
  return createPasswordHash(password, DEMO_PASSWORD_SALT);
}

function date(value: string) {
  return new Date(value);
}

async function seed() {
  const now = new Date();

  const [demoUser] = await db
    .insert(users)
    .values({
      email: DEMO_EMAIL,
      name: "Raka Demo",
      passwordHash: passwordHash(DEMO_PASSWORD),
      imageUrl: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=512&q=80",
      emailVerifiedAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        name: "Raka Demo",
        passwordHash: passwordHash(DEMO_PASSWORD),
        imageUrl: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=512&q=80",
        emailVerifiedAt: now,
        updatedAt: now
      }
    })
    .returning({ id: users.id });

  await db
    .insert(accounts)
    .values({
      id: ids.demoAccount,
      userId: demoUser.id,
      provider: "credentials",
      providerAccountId: DEMO_EMAIL
    })
    .onConflictDoUpdate({
      target: [accounts.provider, accounts.providerAccountId],
      set: {
        userId: demoUser.id,
        accessToken: null,
        refreshToken: null,
        expiresAt: null
      }
    });

  const roleRows = await db
    .insert(roles)
    .values([
      { id: ids.roleUser, key: "user", name: "User" },
      { id: ids.roleCorporateAdmin, key: "corporate_admin", name: "Corporate Admin" },
      { id: ids.rolePartner, key: "partner", name: "Partner" },
      { id: ids.roleAdmin, key: "admin", name: "Admin" }
    ])
    .onConflictDoUpdate({
      target: roles.key,
      set: {
        name: sql`excluded.name`
      }
    })
    .returning({ id: roles.id, key: roles.key });

  const userRole = roleRows.find((role) => role.key === "user");
  const corporateAdminRole = roleRows.find((role) => role.key === "corporate_admin");
  const partnerRole = roleRows.find((role) => role.key === "partner");
  const adminRole = roleRows.find((role) => role.key === "admin");

  if (!userRole || !corporateAdminRole || !partnerRole || !adminRole) {
    throw new Error("Required demo roles were not created.");
  }

  await db
    .insert(userRoles)
    .values([
      { id: ids.userRoleUser, userId: demoUser.id, roleId: userRole.id },
      { id: ids.userRoleCorporateAdmin, userId: demoUser.id, roleId: corporateAdminRole.id },
      { userId: demoUser.id, roleId: partnerRole.id },
      { userId: demoUser.id, roleId: adminRole.id }
    ])
    .onConflictDoNothing({
      target: [userRoles.userId, userRoles.roleId]
    });

  await db
    .insert(profiles)
    .values({
      userId: demoUser.id,
      displayName: "Raka Demo",
      location: "Jakarta, Indonesia",
      bio: "Demo Ocean Hero account with donations, sponsored ecosystems, learning progress, and expedition activity.",
      heroLevel: 4,
      xp: 2450,
      isPublic: true,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        displayName: "Raka Demo",
        location: "Jakarta, Indonesia",
        bio: "Demo Ocean Hero account with donations, sponsored ecosystems, learning progress, and expedition activity.",
        heroLevel: 4,
        xp: 2450,
        isPublic: true,
        updatedAt: now
      }
    });

  const [rajaAmpatOrg, baliOrg, komodoOrg] = await db
    .insert(organizations)
    .values([
      {
        id: ids.organizationRajaAmpat,
        name: "Yayasan Bahari Lestari",
        slug: "yayasan-bahari-lestari",
        type: "ngo",
        websiteUrl: "https://example.com/yayasan-bahari-lestari",
        description: "Field restoration partner coordinating coral nurseries and reef monitoring in Raja Ampat.",
        verification: "field",
        updatedAt: now
      },
      {
        id: ids.organizationBali,
        name: "Koperasi Pesisir Hijau",
        slug: "koperasi-pesisir-hijau",
        type: "community_cooperative",
        websiteUrl: "https://example.com/koperasi-pesisir-hijau",
        description: "North Bali community cooperative running mangrove nurseries and coastal planting days.",
        verification: "document",
        updatedAt: now
      },
      {
        id: ids.organizationKomodo,
        name: "Komodo Ocean Watch",
        slug: "komodo-ocean-watch",
        type: "community_group",
        websiteUrl: "https://example.com/komodo-ocean-watch",
        description: "Cleanup and education partner working with island schools around Labuan Bajo.",
        verification: "basic",
        updatedAt: now
      }
    ])
    .onConflictDoUpdate({
      target: organizations.slug,
      set: {
        name: sql`excluded.name`,
        type: sql`excluded.type`,
        websiteUrl: sql`excluded.website_url`,
        description: sql`excluded.description`,
        verification: sql`excluded.verification`,
        updatedAt: now
      }
    })
    .returning({ id: organizations.id, slug: organizations.slug });

  const organizationBySlug = new Map([
    [rajaAmpatOrg.slug, rajaAmpatOrg.id],
    [baliOrg.slug, baliOrg.id],
    [komodoOrg.slug, komodoOrg.id]
  ]);

  await db
    .insert(organizationUsers)
    .values([
      { organizationId: organizationBySlug.get("yayasan-bahari-lestari")!, userId: demoUser.id, role: "owner", status: "active", updatedAt: now },
      { organizationId: organizationBySlug.get("koperasi-pesisir-hijau")!, userId: demoUser.id, role: "manager", status: "active", updatedAt: now },
      { organizationId: organizationBySlug.get("komodo-ocean-watch")!, userId: demoUser.id, role: "manager", status: "active", updatedAt: now }
    ])
    .onConflictDoUpdate({
      target: [organizationUsers.organizationId, organizationUsers.userId],
      set: {
        role: sql`excluded.role`,
        status: sql`excluded.status`,
        updatedAt: now
      }
    });

  const [rajaAmpatCampaign, baliCampaign, komodoCampaign] = await db
    .insert(campaigns)
    .values([
      {
        organizationId: organizationBySlug.get("yayasan-bahari-lestari")!,
        title: "Restore Raja Ampat Reefs",
        slug: "restore-raja-ampat-reefs",
        summary: "Help local conservation teams plant and monitor 10,000 coral fragments across damaged reef zones.",
        story:
          "Funds support coral tables, diver monitoring, village coordination, and monthly visual evidence from the restoration site.",
        category: "Coral Restoration",
        region: "Raja Ampat, Southwest Papua",
        imageUrl: "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=1200&q=80",
        goalAmount: "350000000.00",
        raisedAmount: "250000000.00",
        donorCount: 2350,
        impactUnit: "coral fragments",
        impactTarget: 10000,
        status: "published",
        publishedAt: date("2026-05-28T02:00:00.000Z"),
        endsAt: date("2026-07-30T16:59:59.000Z"),
        updatedAt: now
      },
      {
        organizationId: organizationBySlug.get("koperasi-pesisir-hijau")!,
        title: "Mangrove Shield for North Bali",
        slug: "mangrove-shield-bali",
        summary: "Fund community nurseries, coastal planting days, and survival monitoring for a stronger shoreline.",
        story:
          "The program supports nursery materials, youth planting days, coastal erosion monitoring, and public survival-rate reports.",
        category: "Mangrove Restoration",
        region: "Buleleng, Bali",
        imageUrl: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1200&q=80",
        goalAmount: "150000000.00",
        raisedAmount: "92000000.00",
        donorCount: 890,
        impactUnit: "mangrove seedlings",
        impactTarget: 25000,
        status: "published",
        publishedAt: date("2026-05-14T02:00:00.000Z"),
        endsAt: date("2026-07-15T16:59:59.000Z"),
        updatedAt: now
      },
      {
        organizationId: organizationBySlug.get("komodo-ocean-watch")!,
        title: "Cleanup Komodo Coastline",
        slug: "cleanup-komodo-coast",
        summary: "Support cleanup boats, waste sorting, and school education programs around island communities.",
        story:
          "Campaign funds go toward boat fuel, reusable sorting equipment, local crew stipends, and school-based ocean waste education.",
        category: "Ocean Cleanup",
        region: "Labuan Bajo, East Nusa Tenggara",
        imageUrl: "https://images.unsplash.com/photo-1546026423-cc4642628d2b?auto=format&fit=crop&w=1200&q=80",
        goalAmount: "100000000.00",
        raisedAmount: "63000000.00",
        donorCount: 510,
        impactUnit: "tons of plastic removed",
        impactTarget: 12,
        status: "published",
        publishedAt: date("2026-05-04T02:00:00.000Z"),
        endsAt: date("2026-07-08T16:59:59.000Z"),
        updatedAt: now
      }
    ])
    .onConflictDoUpdate({
      target: campaigns.slug,
      set: {
        organizationId: sql`excluded.organization_id`,
        title: sql`excluded.title`,
        summary: sql`excluded.summary`,
        story: sql`excluded.story`,
        category: sql`excluded.category`,
        region: sql`excluded.region`,
        imageUrl: sql`excluded.image_url`,
        goalAmount: sql`excluded.goal_amount`,
        raisedAmount: sql`excluded.raised_amount`,
        donorCount: sql`excluded.donor_count`,
        impactUnit: sql`excluded.impact_unit`,
        impactTarget: sql`excluded.impact_target`,
        status: sql`excluded.status`,
        publishedAt: sql`excluded.published_at`,
        endsAt: sql`excluded.ends_at`,
        updatedAt: now
      }
    })
    .returning({ id: campaigns.id, slug: campaigns.slug });

  const campaignBySlug = new Map([
    [rajaAmpatCampaign.slug, rajaAmpatCampaign.id],
    [baliCampaign.slug, baliCampaign.id],
    [komodoCampaign.slug, komodoCampaign.id]
  ]);

  await db
    .insert(impactSites)
    .values([
      {
        id: ids.impactSiteRajaAmpat,
        campaignId: campaignBySlug.get("restore-raja-ampat-reefs")!,
        name: "Raja Ampat Reef Garden",
        ecosystemType: "Coral",
        region: "Southwest Papua",
        latitude: "-0.234900",
        longitude: "130.516600",
        metadata: {
          progress: 72,
          evidenceCount: 14,
          latestSurvey: "2026-06-12",
          verification: "field"
        }
      },
      {
        id: ids.impactSiteBali,
        campaignId: campaignBySlug.get("mangrove-shield-bali")!,
        name: "North Bali Mangrove Belt",
        ecosystemType: "Mangrove",
        region: "Bali",
        latitude: "-8.113100",
        longitude: "114.650700",
        metadata: {
          progress: 61,
          evidenceCount: 8,
          latestSurvey: "2026-06-09",
          verification: "document"
        }
      },
      {
        id: ids.impactSiteKomodo,
        campaignId: campaignBySlug.get("cleanup-komodo-coast")!,
        name: "Komodo Cleanup Route",
        ecosystemType: "Cleanup",
        region: "East Nusa Tenggara",
        latitude: "-8.486600",
        longitude: "119.887700",
        metadata: {
          progress: 48,
          evidenceCount: 6,
          latestSurvey: "2026-06-05",
          verification: "basic"
        }
      }
    ])
    .onConflictDoUpdate({
      target: impactSites.id,
      set: {
        campaignId: sql`excluded.campaign_id`,
        name: sql`excluded.name`,
        ecosystemType: sql`excluded.ecosystem_type`,
        region: sql`excluded.region`,
        latitude: sql`excluded.latitude`,
        longitude: sql`excluded.longitude`,
        metadata: sql`excluded.metadata`
      }
    });

  await db
    .insert(campaignUpdates)
    .values([
      {
        id: ids.campaignUpdateRajaAmpat,
        campaignId: campaignBySlug.get("restore-raja-ampat-reefs")!,
        title: "First coral table batch installed",
        body: "Field teams installed the first restoration tables and tagged the demo cohort for monthly monitoring.",
        imageUrl: "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=1200&q=80",
        publishedAt: date("2026-06-11T03:00:00.000Z")
      },
      {
        id: ids.campaignUpdateBali,
        campaignId: campaignBySlug.get("mangrove-shield-bali")!,
        title: "Nursery stock reached 18,400 seedlings",
        body: "Community nursery teams completed the second seedling audit and prepared the next volunteer planting block.",
        imageUrl: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1200&q=80",
        publishedAt: date("2026-06-10T03:00:00.000Z")
      },
      {
        id: ids.campaignUpdateKomodo,
        campaignId: campaignBySlug.get("cleanup-komodo-coast")!,
        title: "School cleanup challenge launched",
        body: "Three island schools joined the coastal cleanup challenge and began tracking sorted waste by material type.",
        imageUrl: "https://images.unsplash.com/photo-1546026423-cc4642628d2b?auto=format&fit=crop&w=1200&q=80",
        publishedAt: date("2026-06-08T03:00:00.000Z")
      }
    ])
    .onConflictDoUpdate({
      target: campaignUpdates.id,
      set: {
        campaignId: sql`excluded.campaign_id`,
        title: sql`excluded.title`,
        body: sql`excluded.body`,
        imageUrl: sql`excluded.image_url`,
        publishedAt: sql`excluded.published_at`
      }
    });

  await db
    .insert(projectEvidence)
    .values([
      {
        id: ids.evidenceRajaAmpatBefore,
        campaignId: campaignBySlug.get("restore-raja-ampat-reefs")!,
        impactSiteId: ids.impactSiteRajaAmpat,
        uploadedByUserId: demoUser.id,
        evidenceCode: "EVD-RAJA-AMPAT-REEF-000",
        title: "Raja Ampat reef baseline photo",
        evidenceType: "before_photo",
        fileUrl: "https://images.unsplash.com/photo-1546026423-cc4642628d2b?auto=format&fit=crop&w=1200&q=80",
        storageProvider: "cloudflare_r2_ready",
        verificationStatus: "verified",
        verifiedAt: date("2026-05-20T04:00:00.000Z"),
        metadata: {
          stage: "before",
          surveyDate: "2026-05-20",
          observation: "Baseline record before the first restoration table batch was installed.",
          metricLabel: "Tagged fragments",
          metricValue: 0,
          reviewer: "field_partner"
        }
      },
      {
        id: ids.evidenceRajaAmpat,
        campaignId: campaignBySlug.get("restore-raja-ampat-reefs")!,
        impactSiteId: ids.impactSiteRajaAmpat,
        uploadedByUserId: demoUser.id,
        evidenceCode: "EVD-RAJA-AMPAT-REEF-001",
        title: "Raja Ampat reef table survey",
        evidenceType: "field_photo",
        fileUrl: "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=1200&q=80",
        storageProvider: "cloudflare_r2_ready",
        verificationStatus: "verified",
        verifiedAt: date("2026-06-12T04:00:00.000Z"),
        metadata: {
          stage: "after",
          surveyDate: "2026-06-12",
          evidenceCount: 14,
          observation: "Restoration tables are installed and the first demo coral cohort is tagged for monitoring.",
          metricLabel: "Tagged fragments",
          metricValue: 2350,
          survivalRate: 94,
          reviewer: "field_partner"
        }
      },
      {
        id: ids.evidenceBaliBefore,
        campaignId: campaignBySlug.get("mangrove-shield-bali")!,
        impactSiteId: ids.impactSiteBali,
        uploadedByUserId: demoUser.id,
        evidenceCode: "EVD-BALI-MANGROVE-000",
        title: "North Bali shoreline baseline",
        evidenceType: "before_photo",
        fileUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
        storageProvider: "cloudflare_r2_ready",
        verificationStatus: "verified",
        verifiedAt: date("2026-05-18T04:00:00.000Z"),
        metadata: {
          stage: "before",
          surveyDate: "2026-05-18",
          observation: "Baseline shoreline condition recorded before nursery transfer and planting blocks.",
          metricLabel: "Seedlings planted",
          metricValue: 0,
          reviewer: "field_partner"
        }
      },
      {
        id: ids.evidenceBali,
        campaignId: campaignBySlug.get("mangrove-shield-bali")!,
        impactSiteId: ids.impactSiteBali,
        uploadedByUserId: demoUser.id,
        evidenceCode: "EVD-BALI-MANGROVE-001",
        title: "North Bali nursery audit",
        evidenceType: "document",
        fileUrl: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1200&q=80",
        storageProvider: "cloudflare_r2_ready",
        verificationStatus: "verified",
        verifiedAt: date("2026-06-10T04:00:00.000Z"),
        metadata: {
          stage: "monitoring",
          surveyDate: "2026-06-09",
          observation: "Nursery audit confirmed planting stock and early survival indicators for the next coastal block.",
          metricLabel: "Seedlings ready",
          metricValue: 18400,
          seedlingsReady: 18400,
          survivalRate: 89
        }
      },
      {
        id: ids.evidenceKomodoBefore,
        campaignId: campaignBySlug.get("cleanup-komodo-coast")!,
        impactSiteId: ids.impactSiteKomodo,
        uploadedByUserId: demoUser.id,
        evidenceCode: "EVD-KOMODO-CLEANUP-000",
        title: "Komodo cleanup route baseline",
        evidenceType: "before_photo",
        fileUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
        storageProvider: "cloudflare_r2_ready",
        verificationStatus: "verified",
        verifiedAt: date("2026-05-24T04:00:00.000Z"),
        metadata: {
          stage: "before",
          surveyDate: "2026-05-24",
          observation: "Baseline coastal route photographed before school cleanup teams started sorting waste.",
          metricLabel: "Sorted waste",
          metricValue: "0 kg",
          reviewer: "field_partner"
        }
      },
      {
        id: ids.evidenceKomodo,
        campaignId: campaignBySlug.get("cleanup-komodo-coast")!,
        impactSiteId: ids.impactSiteKomodo,
        uploadedByUserId: demoUser.id,
        evidenceCode: "EVD-KOMODO-CLEANUP-001",
        title: "Komodo school cleanup launch",
        evidenceType: "field_report",
        fileUrl: "https://images.unsplash.com/photo-1546026423-cc4642628d2b?auto=format&fit=crop&w=1200&q=80",
        storageProvider: "cloudflare_r2_ready",
        verificationStatus: "in_review",
        metadata: {
          stage: "monitoring",
          surveyDate: "2026-06-05",
          observation: "School teams launched the first cleanup route and logged sorted waste by material type.",
          metricLabel: "Sorted waste",
          metricValue: "420 kg",
          schools: 3,
          sortedWasteKg: 420
        }
      }
    ])
    .onConflictDoUpdate({
      target: projectEvidence.evidenceCode,
      set: {
        campaignId: sql`excluded.campaign_id`,
        impactSiteId: sql`excluded.impact_site_id`,
        uploadedByUserId: demoUser.id,
        title: sql`excluded.title`,
        evidenceType: sql`excluded.evidence_type`,
        fileUrl: sql`excluded.file_url`,
        storageProvider: sql`excluded.storage_provider`,
        verificationStatus: sql`excluded.verification_status`,
        verifiedAt: sql`excluded.verified_at`,
        metadata: sql`excluded.metadata`
      }
    });

  await db
    .insert(donations)
    .values([
      {
        id: ids.donationRajaAmpat,
        campaignId: campaignBySlug.get("restore-raja-ampat-reefs")!,
        userId: demoUser.id,
        donorName: "Raka Demo",
        donorEmail: DEMO_EMAIL,
        amount: "1500000.00",
        currency: "IDR",
        status: "paid",
        message: "For the next coral monitoring milestone.",
        createdAt: date("2026-06-01T04:30:00.000Z")
      },
      {
        id: ids.donationBali,
        campaignId: campaignBySlug.get("mangrove-shield-bali")!,
        userId: demoUser.id,
        donorName: "Raka Demo",
        donorEmail: DEMO_EMAIL,
        amount: "1000000.00",
        currency: "IDR",
        status: "paid",
        message: "Supporting coastal communities in Bali.",
        createdAt: date("2026-06-07T06:15:00.000Z")
      },
      {
        id: ids.donationKomodo,
        campaignId: campaignBySlug.get("cleanup-komodo-coast")!,
        userId: demoUser.id,
        donorName: "Raka Demo",
        donorEmail: DEMO_EMAIL,
        amount: "700000.00",
        currency: "IDR",
        status: "paid",
        message: "Cleanup teams need visible wins.",
        createdAt: date("2026-06-13T08:45:00.000Z")
      }
    ])
    .onConflictDoUpdate({
      target: donations.id,
      set: {
        campaignId: sql`excluded.campaign_id`,
        userId: demoUser.id,
        donorName: sql`excluded.donor_name`,
        donorEmail: sql`excluded.donor_email`,
        amount: sql`excluded.amount`,
        currency: sql`excluded.currency`,
        status: sql`excluded.status`,
        message: sql`excluded.message`,
        createdAt: sql`excluded.created_at`
      }
    });

  await db
    .insert(paymentTransactions)
    .values([
      {
        id: ids.transactionRajaAmpat,
        donationId: ids.donationRajaAmpat,
        provider: "demo_gateway",
        providerReference: "DEMO-RAJA-AMPAT-0001",
        status: "paid",
        payload: {
          method: "virtual_account",
          paidAt: "2026-06-01T04:31:00.000Z"
        },
        updatedAt: now
      },
      {
        id: ids.transactionBali,
        donationId: ids.donationBali,
        provider: "demo_gateway",
        providerReference: "DEMO-BALI-0001",
        status: "paid",
        payload: {
          method: "qris",
          paidAt: "2026-06-07T06:16:00.000Z"
        },
        updatedAt: now
      },
      {
        id: ids.transactionKomodo,
        donationId: ids.donationKomodo,
        provider: "demo_gateway",
        providerReference: "DEMO-KOMODO-0001",
        status: "paid",
        payload: {
          method: "card",
          paidAt: "2026-06-13T08:46:00.000Z"
        },
        updatedAt: now
      }
    ])
    .onConflictDoUpdate({
      target: [paymentTransactions.provider, paymentTransactions.providerReference],
      set: {
        donationId: sql`excluded.donation_id`,
        status: sql`excluded.status`,
        payload: sql`excluded.payload`,
        updatedAt: now
      }
    });

  await db
    .insert(donationReceipts)
    .values([
      {
        id: ids.receiptRajaAmpat,
        donationId: ids.donationRajaAmpat,
        receiptNumber: "TRB-RCP-2026-0001",
        issuedAt: date("2026-06-01T04:31:00.000Z"),
        emailedAt: date("2026-06-01T04:32:00.000Z"),
        payload: {
          campaign: "Restore Raja Ampat Reefs",
          amount: 1500000,
          currency: "IDR"
        }
      },
      {
        id: ids.receiptBali,
        donationId: ids.donationBali,
        receiptNumber: "TRB-RCP-2026-0002",
        issuedAt: date("2026-06-07T06:16:00.000Z"),
        emailedAt: date("2026-06-07T06:17:00.000Z"),
        payload: {
          campaign: "Mangrove Shield for North Bali",
          amount: 1000000,
          currency: "IDR"
        }
      },
      {
        id: ids.receiptKomodo,
        donationId: ids.donationKomodo,
        receiptNumber: "TRB-RCP-2026-0003",
        issuedAt: date("2026-06-13T08:46:00.000Z"),
        emailedAt: date("2026-06-13T08:47:00.000Z"),
        payload: {
          campaign: "Cleanup Komodo Coastline",
          amount: 700000,
          currency: "IDR"
        }
      }
    ])
    .onConflictDoUpdate({
      target: donationReceipts.receiptNumber,
      set: {
        donationId: sql`excluded.donation_id`,
        issuedAt: sql`excluded.issued_at`,
        emailedAt: sql`excluded.emailed_at`,
        payload: sql`excluded.payload`
      }
    });

  await db
    .insert(sponsoredEcosystems)
    .values([
      {
        id: ids.ecosystemCoral1,
        userId: demoUser.id,
        campaignId: campaignBySlug.get("restore-raja-ampat-reefs")!,
        impactSiteId: ids.impactSiteRajaAmpat,
        code: "TRB-CORAL-RA-0001",
        label: "Raka's Coral Cluster A",
        status: "growing",
        plantedAt: date("2026-06-04T02:30:00.000Z"),
        lastUpdatedAt: date("2026-06-12T02:30:00.000Z"),
        metadata: {
          fragments: 15,
          survivalRate: 94,
          depthMeters: 6
        }
      },
      {
        id: ids.ecosystemCoral2,
        userId: demoUser.id,
        campaignId: campaignBySlug.get("restore-raja-ampat-reefs")!,
        impactSiteId: ids.impactSiteRajaAmpat,
        code: "TRB-CORAL-RA-0002",
        label: "Raka's Coral Cluster B",
        status: "monitored",
        plantedAt: date("2026-06-04T02:45:00.000Z"),
        lastUpdatedAt: date("2026-06-12T02:45:00.000Z"),
        metadata: {
          fragments: 10,
          survivalRate: 92,
          depthMeters: 7
        }
      },
      {
        id: ids.ecosystemMangrove,
        userId: demoUser.id,
        campaignId: campaignBySlug.get("mangrove-shield-bali")!,
        impactSiteId: ids.impactSiteBali,
        code: "TRB-MANGROVE-BL-0001",
        label: "North Bali Mangrove Plot",
        status: "growing",
        plantedAt: date("2026-06-09T03:00:00.000Z"),
        lastUpdatedAt: date("2026-06-15T03:00:00.000Z"),
        metadata: {
          seedlings: 20,
          survivalRate: 89,
          plot: "NB-12"
        }
      }
    ])
    .onConflictDoUpdate({
      target: sponsoredEcosystems.code,
      set: {
        userId: demoUser.id,
        campaignId: sql`excluded.campaign_id`,
        impactSiteId: sql`excluded.impact_site_id`,
        label: sql`excluded.label`,
        status: sql`excluded.status`,
        plantedAt: sql`excluded.planted_at`,
        lastUpdatedAt: sql`excluded.last_updated_at`,
        metadata: sql`excluded.metadata`
      }
    });

  const expeditionRows = await db
    .insert(expeditions)
    .values([
      {
        title: "Raja Ampat Coral Restoration Expedition",
        slug: "raja-ampat-coral-restoration",
        region: "Raja Ampat",
        durationDays: 4,
        basePrice: "2500000.00",
        summary: "Plant coral fragments, join reef monitoring, and learn directly from local field teams.",
        imageUrl: "https://images.unsplash.com/photo-1546026423-cc4642628d2b?auto=format&fit=crop&w=1200&q=80",
        relatedCampaignId: campaignBySlug.get("restore-raja-ampat-reefs")!
      },
      {
        title: "Wakatobi Reef Monitoring Weekend",
        slug: "wakatobi-reef-monitoring",
        region: "Wakatobi",
        durationDays: 3,
        basePrice: "1850000.00",
        summary: "Practice reef survey basics, document restoration sites, and support community guides.",
        imageUrl: "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=1200&q=80",
        relatedCampaignId: campaignBySlug.get("restore-raja-ampat-reefs")!
      }
    ])
    .onConflictDoUpdate({
      target: expeditions.slug,
      set: {
        title: sql`excluded.title`,
        region: sql`excluded.region`,
        durationDays: sql`excluded.duration_days`,
        basePrice: sql`excluded.base_price`,
        summary: sql`excluded.summary`,
        imageUrl: sql`excluded.image_url`,
        relatedCampaignId: sql`excluded.related_campaign_id`
      }
    })
    .returning({ id: expeditions.id, slug: expeditions.slug });

  const expeditionBySlug = new Map(expeditionRows.map((expedition) => [expedition.slug, expedition.id]));

  await db
    .insert(expeditionDepartures)
    .values([
      {
        id: ids.departureRajaAmpat,
        expeditionId: expeditionBySlug.get("raja-ampat-coral-restoration")!,
        startsAt: date("2026-10-09T01:00:00.000Z"),
        endsAt: date("2026-10-12T09:00:00.000Z"),
        capacity: 12,
        seatsBooked: 1,
        status: "open",
        metadata: {
          meetingPoint: "Sorong Harbor",
          guide: "Yayasan Bahari Lestari field team"
        }
      },
      {
        id: ids.departureWakatobi,
        expeditionId: expeditionBySlug.get("wakatobi-reef-monitoring")!,
        startsAt: date("2026-09-18T01:00:00.000Z"),
        endsAt: date("2026-09-20T09:00:00.000Z"),
        capacity: 10,
        seatsBooked: 0,
        status: "open",
        metadata: {
          meetingPoint: "Wanci Harbor",
          guide: "Community reef monitor network"
        }
      }
    ])
    .onConflictDoUpdate({
      target: [expeditionDepartures.expeditionId, expeditionDepartures.startsAt],
      set: {
        endsAt: sql`excluded.ends_at`,
        capacity: sql`excluded.capacity`,
        seatsBooked: sql`excluded.seats_booked`,
        status: sql`excluded.status`,
        metadata: sql`excluded.metadata`
      }
    });

  await db
    .insert(expeditionBookings)
    .values({
      id: ids.bookingRajaAmpat,
      expeditionId: expeditionBySlug.get("raja-ampat-coral-restoration")!,
      departureId: ids.departureRajaAmpat,
      userId: demoUser.id,
      bookingCode: "TRB-EXP-2026-0001",
      contactName: "Raka Demo",
      contactEmail: DEMO_EMAIL,
      participantsCount: 1,
      totalAmount: "2500000.00",
      currency: "IDR",
      status: "confirmed",
      paymentStatus: "paid",
      bookedAt: date("2026-06-14T05:00:00.000Z"),
      confirmedAt: date("2026-06-14T05:02:00.000Z"),
      metadata: {
        confirmationEmailQueued: true,
        departureMonth: "2026-10"
      }
    })
    .onConflictDoUpdate({
      target: expeditionBookings.bookingCode,
      set: {
        expeditionId: sql`excluded.expedition_id`,
        departureId: sql`excluded.departure_id`,
        userId: demoUser.id,
        contactName: sql`excluded.contact_name`,
        contactEmail: sql`excluded.contact_email`,
        participantsCount: sql`excluded.participants_count`,
        totalAmount: sql`excluded.total_amount`,
        status: sql`excluded.status`,
        paymentStatus: sql`excluded.payment_status`,
        bookedAt: sql`excluded.booked_at`,
        confirmedAt: sql`excluded.confirmed_at`,
        metadata: sql`excluded.metadata`
      }
    });

  await db
    .insert(expeditionParticipants)
    .values({
      id: ids.bookingParticipantRaka,
      bookingId: ids.bookingRajaAmpat,
      fullName: "Raka Demo",
      email: DEMO_EMAIL,
      phone: "+62 812 0000 2026",
      emergencyContact: "Demo Contact +62 812 1111 2026",
      dietaryNotes: "No shellfish"
    })
    .onConflictDoUpdate({
      target: expeditionParticipants.id,
      set: {
        bookingId: ids.bookingRajaAmpat,
        fullName: "Raka Demo",
        email: DEMO_EMAIL,
        phone: "+62 812 0000 2026",
        emergencyContact: "Demo Contact +62 812 1111 2026",
        dietaryNotes: "No shellfish"
      }
    });

  await db
    .insert(expeditionBookingPayments)
    .values({
      id: ids.bookingPaymentRajaAmpat,
      bookingId: ids.bookingRajaAmpat,
      provider: "demo_gateway",
      providerReference: "DEMO-EXPEDITION-RAJA-AMPAT-0001",
      status: "paid",
      payload: {
        method: "virtual_account",
        paidAt: "2026-06-14T05:01:00.000Z"
      },
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: [expeditionBookingPayments.provider, expeditionBookingPayments.providerReference],
      set: {
        bookingId: ids.bookingRajaAmpat,
        status: sql`excluded.status`,
        payload: sql`excluded.payload`,
        updatedAt: now
      }
    });

  const courseRows = await db
    .insert(courses)
    .values([
      {
        title: "Ocean Explorer",
        slug: "ocean-explorer",
        level: "Beginner",
        durationMinutes: 45,
        summary: "Coral basics, ocean threats, and how restoration projects are measured.",
        imageUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=1200&q=80"
      },
      {
        title: "Coral Guardian",
        slug: "coral-guardian",
        level: "Intermediate",
        durationMinutes: 120,
        summary: "Restoration methods, monitoring indicators, and field safety preparation.",
        imageUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80"
      },
      {
        title: "ESG for Coastal Conservation",
        slug: "esg-for-coastal-conservation",
        level: "Professional",
        durationMinutes: 180,
        summary: "How companies can fund, verify, and report nature-positive outcomes.",
        imageUrl: "https://images.unsplash.com/photo-1498622205843-3b0ac17f8ba2?auto=format&fit=crop&w=1200&q=80"
      }
    ])
    .onConflictDoUpdate({
      target: courses.slug,
      set: {
        title: sql`excluded.title`,
        level: sql`excluded.level`,
        durationMinutes: sql`excluded.duration_minutes`,
        summary: sql`excluded.summary`,
        imageUrl: sql`excluded.image_url`
      }
    })
    .returning({ id: courses.id, slug: courses.slug });

  const courseBySlug = new Map(courseRows.map((course) => [course.slug, course.id]));

  await db
    .insert(courseLessons)
    .values([
      {
        id: ids.oceanLessonIntro,
        courseId: courseBySlug.get("ocean-explorer")!,
        title: "Reading a healthy reef",
        slug: "reading-a-healthy-reef",
        position: 1,
        durationMinutes: 18,
        body: "Learn the visual cues field teams use when evaluating coral health, fish presence, and reef stress."
      },
      {
        id: ids.oceanLessonThreats,
        courseId: courseBySlug.get("ocean-explorer")!,
        title: "Threats and restoration signals",
        slug: "threats-and-restoration-signals",
        position: 2,
        durationMinutes: 27,
        body: "Connect warming, blast damage, plastic waste, and restoration evidence to measurable conservation claims."
      },
      {
        id: ids.coralLessonMethods,
        courseId: courseBySlug.get("coral-guardian")!,
        title: "Coral nursery methods",
        slug: "coral-nursery-methods",
        position: 1,
        durationMinutes: 48,
        body: "Compare table, rope, and fragment tagging methods used by restoration teams."
      },
      {
        id: ids.coralLessonMonitoring,
        courseId: courseBySlug.get("coral-guardian")!,
        title: "Monitoring and field safety",
        slug: "monitoring-and-field-safety",
        position: 2,
        durationMinutes: 72,
        body: "Prepare for survey checklists, evidence handling, and safe movement around active reef sites."
      },
      {
        id: ids.esgLessonFunding,
        courseId: courseBySlug.get("esg-for-coastal-conservation")!,
        title: "Funding nature-positive programs",
        slug: "funding-nature-positive-programs",
        position: 1,
        durationMinutes: 80,
        body: "Structure conservation funding portfolios that can be reconciled to project outputs."
      },
      {
        id: ids.esgLessonReporting,
        courseId: courseBySlug.get("esg-for-coastal-conservation")!,
        title: "Evidence and report export",
        slug: "evidence-and-report-export",
        position: 2,
        durationMinutes: 100,
        body: "Translate field evidence, budget usage, and employee engagement into corporate reports."
      }
    ])
    .onConflictDoUpdate({
      target: courseLessons.id,
      set: {
        courseId: sql`excluded.course_id`,
        title: sql`excluded.title`,
        slug: sql`excluded.slug`,
        position: sql`excluded.position`,
        durationMinutes: sql`excluded.duration_minutes`,
        body: sql`excluded.body`
      }
    });

  const [oceanEnrollment] = await db
    .insert(courseEnrollments)
    .values({
      id: ids.enrollmentOceanExplorer,
      userId: demoUser.id,
      courseId: courseBySlug.get("ocean-explorer")!,
      status: "completed",
      enrolledAt: date("2026-06-12T02:00:00.000Z"),
      completedAt: date("2026-06-16T07:00:00.000Z"),
      metadata: {
        source: "demo_seed"
      }
    })
    .onConflictDoUpdate({
      target: [courseEnrollments.userId, courseEnrollments.courseId],
      set: {
        status: "completed",
        enrolledAt: date("2026-06-12T02:00:00.000Z"),
        completedAt: date("2026-06-16T07:00:00.000Z"),
        metadata: sql`excluded.metadata`
      }
    })
    .returning({ id: courseEnrollments.id });

  await db
    .insert(lessonProgress)
    .values([
      {
        id: ids.lessonProgressIntro,
        enrollmentId: oceanEnrollment.id,
        lessonId: ids.oceanLessonIntro,
        status: "completed",
        completedAt: date("2026-06-14T04:00:00.000Z"),
        score: 96
      },
      {
        id: ids.lessonProgressThreats,
        enrollmentId: oceanEnrollment.id,
        lessonId: ids.oceanLessonThreats,
        status: "completed",
        completedAt: date("2026-06-16T06:30:00.000Z"),
        score: 92
      }
    ])
    .onConflictDoUpdate({
      target: [lessonProgress.enrollmentId, lessonProgress.lessonId],
      set: {
        status: "completed",
        completedAt: sql`excluded.completed_at`,
        score: sql`excluded.score`
      }
    });

  const [oceanAssessment] = await db
    .insert(courseAssessments)
    .values({
      id: ids.assessmentOceanExplorer,
      courseId: courseBySlug.get("ocean-explorer")!,
      title: "Ocean Explorer final check",
      slug: "final-check",
      passingScore: 80,
      metadata: {
        questionCount: 12
      }
    })
    .onConflictDoUpdate({
      target: [courseAssessments.courseId, courseAssessments.slug],
      set: {
        title: "Ocean Explorer final check",
        passingScore: 80,
        metadata: sql`excluded.metadata`
      }
    })
    .returning({ id: courseAssessments.id });

  await db
    .insert(assessmentAttempts)
    .values({
      id: ids.assessmentAttemptOceanExplorer,
      assessmentId: oceanAssessment.id,
      userId: demoUser.id,
      score: 92,
      status: "passed",
      submittedAt: date("2026-06-16T06:45:00.000Z"),
      metadata: {
        durationMinutes: 11
      }
    })
    .onConflictDoUpdate({
      target: [assessmentAttempts.assessmentId, assessmentAttempts.userId],
      set: {
        score: 92,
        status: "passed",
        submittedAt: date("2026-06-16T06:45:00.000Z"),
        metadata: sql`excluded.metadata`
      }
    });

  await db
    .insert(courseCertificates)
    .values({
      id: ids.certificateOceanExplorer,
      userId: demoUser.id,
      courseId: courseBySlug.get("ocean-explorer")!,
      enrollmentId: oceanEnrollment.id,
      certificateNumber: "TRB-CERT-2026-0001",
      publicSlug: "raka-demo-ocean-explorer-2026",
      issuedAt: date("2026-06-16T07:00:00.000Z"),
      metadata: {
        score: 92,
        credential: "Ocean Explorer"
      }
    })
    .onConflictDoUpdate({
      target: [courseCertificates.userId, courseCertificates.courseId],
      set: {
        enrollmentId: oceanEnrollment.id,
        certificateNumber: "TRB-CERT-2026-0001",
        publicSlug: "raka-demo-ocean-explorer-2026",
        issuedAt: date("2026-06-16T07:00:00.000Z"),
        metadata: sql`excluded.metadata`
      }
    });

  const [passport] = await db
    .insert(impactPassports)
    .values({
      userId: demoUser.id,
      publicSlug: "raka-demo-ocean-hero",
      visibility: "public",
      story: "A demo Impact Passport showing how donations, sponsored ecosystems, courses, and field activities can become a user profile.",
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: impactPassports.userId,
      set: {
        publicSlug: "raka-demo-ocean-hero",
        visibility: "public",
        story:
          "A demo Impact Passport showing how donations, sponsored ecosystems, courses, and field activities can become a user profile.",
        updatedAt: now
      }
    })
    .returning({ id: impactPassports.id });

  await db
    .insert(impactPassportItems)
    .values([
      {
        id: ids.passportItemDonation,
        passportId: passport.id,
        itemType: "donation",
        title: "Funded Raja Ampat reef restoration",
        description: "Rp1.5M donation connected to coral restoration progress.",
        evidenceUrl: "https://example.com/evidence/raja-ampat-donation",
        occurredAt: date("2026-06-01T04:30:00.000Z"),
        metadata: {
          amount: 1500000,
          currency: "IDR",
          campaign: "restore-raja-ampat-reefs",
          campaignSlug: "restore-raja-ampat-reefs",
          evidenceCode: "EVD-RAJA-AMPAT-REEF-001"
        }
      },
      {
        id: ids.passportItemCoral,
        passportId: passport.id,
        itemType: "sponsored_ecosystem",
        title: "25 coral fragments sponsored",
        description: "Two coral clusters are tracked with field monitoring updates.",
        evidenceUrl: "https://example.com/evidence/raja-ampat-coral-clusters",
        occurredAt: date("2026-06-04T02:30:00.000Z"),
        metadata: {
          codes: ["TRB-CORAL-RA-0001", "TRB-CORAL-RA-0002"],
          fragments: 25,
          campaignSlug: "restore-raja-ampat-reefs",
          evidenceCode: "EVD-RAJA-AMPAT-REEF-001"
        }
      },
      {
        id: ids.passportItemExpedition,
        passportId: passport.id,
        itemType: "expedition",
        title: "Raja Ampat expedition reserved",
        description: "Demo reservation for the October 2026 coral restoration field program.",
        evidenceUrl: "https://example.com/evidence/raja-ampat-expedition-reservation",
        occurredAt: date("2026-06-14T05:00:00.000Z"),
        metadata: {
          trip: "raja-ampat-coral-restoration",
          departureMonth: "2026-10"
        }
      },
      {
        id: ids.passportItemCourse,
        passportId: passport.id,
        itemType: "certificate",
        title: "Ocean Explorer certificate",
        description: "Completed the introductory Terumbu Academy learning track.",
        evidenceUrl: "https://example.com/evidence/ocean-explorer-certificate",
        occurredAt: date("2026-06-16T07:00:00.000Z"),
        metadata: {
          course: "ocean-explorer",
          score: 92
        }
      }
    ])
    .onConflictDoUpdate({
      target: impactPassportItems.id,
      set: {
        passportId: passport.id,
        itemType: sql`excluded.item_type`,
        title: sql`excluded.title`,
        description: sql`excluded.description`,
        evidenceUrl: sql`excluded.evidence_url`,
        occurredAt: sql`excluded.occurred_at`,
        metadata: sql`excluded.metadata`
      }
    });

  await db
    .insert(notificationPreferences)
    .values({
      userId: demoUser.id,
      campaignUpdates: true,
      evidenceAlerts: true,
      expeditionReminders: true,
      academyUpdates: true,
      monthlyImpactEmail: true,
      monthlyImpactReport: true,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: notificationPreferences.userId,
      set: {
        campaignUpdates: true,
        evidenceAlerts: true,
        expeditionReminders: true,
        academyUpdates: true,
        monthlyImpactEmail: true,
        monthlyImpactReport: true,
        updatedAt: now
      }
    });

  await db
    .insert(userSavedCampaigns)
    .values({
      id: ids.savedCampaignRaja,
      userId: demoUser.id,
      campaignId: campaignBySlug.get("restore-raja-ampat-reefs")!,
      status: "active",
      savedAt: date("2026-06-13T04:00:00.000Z"),
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: [userSavedCampaigns.userId, userSavedCampaigns.campaignId],
      set: {
        status: "active",
        updatedAt: now
      }
    });

  await db
    .insert(campaignFollowSubscriptions)
    .values({
      id: ids.followCampaignRaja,
      userId: demoUser.id,
      campaignId: campaignBySlug.get("restore-raja-ampat-reefs")!,
      email: DEMO_EMAIL,
      status: "active",
      frequency: "weekly",
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: [campaignFollowSubscriptions.userId, campaignFollowSubscriptions.campaignId],
      set: {
        email: DEMO_EMAIL,
        status: "active",
        frequency: "weekly",
        updatedAt: now
      }
    });

  await db
    .insert(userNotifications)
    .values({
      id: ids.notificationFollowUpdate,
      userId: demoUser.id,
      notificationCode: "seed-follow-update-raja-ampat",
      category: "Followed campaigns",
      title: "First coral table batch installed",
      message: "Restore 10,000 Coral Fragments in Raja Ampat published a new update.",
      href: `/campaigns/restore-raja-ampat-reefs/updates/${ids.campaignUpdateRajaAmpat}`,
      sourceType: "campaign_update",
      sourceId: ids.campaignUpdateRajaAmpat,
      createdAt: date("2026-06-12T05:00:00.000Z"),
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: [userNotifications.userId, userNotifications.notificationCode],
      set: {
        message: "Restore 10,000 Coral Fragments in Raja Ampat published a new update.",
        href: `/campaigns/restore-raja-ampat-reefs/updates/${ids.campaignUpdateRajaAmpat}`,
        updatedAt: now
      }
    });

  await db
    .insert(monthlyImpactReports)
    .values({
      id: ids.monthlyReportDemo,
      userId: demoUser.id,
      reportMonth: "2026-06",
      status: "ready",
      label: "June 2026 Impact Report",
      contributions: "2750000.00",
      campaignUpdates: 3,
      newEvidence: 6,
      coralsMonitored: 25,
      academyProgress: 1,
      metadata: {
        generatedBy: "seed"
      },
      generatedAt: date("2026-06-30T03:00:00.000Z"),
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: [monthlyImpactReports.userId, monthlyImpactReports.reportMonth],
      set: {
        label: "June 2026 Impact Report",
        contributions: "2750000.00",
        campaignUpdates: 3,
        newEvidence: 6,
        coralsMonitored: 25,
        academyProgress: 1,
        generatedAt: date("2026-06-30T03:00:00.000Z"),
        updatedAt: now
      }
    });

  await db
    .insert(corporateAccounts)
    .values({
      id: ids.corporateAccount,
      name: "Nusantara Bank",
      slug: "nusantara-bank",
      logoUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=512&q=80"
    })
    .onConflictDoUpdate({
      target: corporateAccounts.slug,
      set: {
        name: "Nusantara Bank",
        logoUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=512&q=80"
      }
    });

  await db
    .insert(corporatePrograms)
    .values({
      id: ids.corporateProgram,
      corporateAccountId: ids.corporateAccount,
      name: "Ocean Impact Program 2026",
      slug: "nusantara-bank-ocean-impact-2026",
      startsAt: date("2026-01-01T00:00:00.000Z"),
      endsAt: date("2026-12-31T16:59:59.000Z"),
      budgetAmount: "500000000.00",
      status: "active"
    })
    .onConflictDoUpdate({
      target: corporatePrograms.slug,
      set: {
        corporateAccountId: ids.corporateAccount,
        name: "Ocean Impact Program 2026",
        startsAt: date("2026-01-01T00:00:00.000Z"),
        endsAt: date("2026-12-31T16:59:59.000Z"),
        budgetAmount: "500000000.00",
        status: "active"
      }
    });

  await db
    .insert(corporateProgramBudgets)
    .values([
      {
        id: ids.corporateBudgetRestoration,
        programId: ids.corporateProgram,
        category: "Restoration portfolio",
        allocatedAmount: "350000000.00",
        spentAmount: "238000000.00",
        metadata: {
          reportingCode: "RESTORE"
        }
      },
      {
        id: ids.corporateBudgetEducation,
        programId: ids.corporateProgram,
        category: "Employee learning",
        allocatedAmount: "90000000.00",
        spentAmount: "54000000.00",
        metadata: {
          reportingCode: "LEARN"
        }
      },
      {
        id: ids.corporateBudgetReporting,
        programId: ids.corporateProgram,
        category: "Verification and reports",
        allocatedAmount: "60000000.00",
        spentAmount: "48000000.00",
        metadata: {
          reportingCode: "VERIFY"
        }
      }
    ])
    .onConflictDoUpdate({
      target: [corporateProgramBudgets.programId, corporateProgramBudgets.category],
      set: {
        allocatedAmount: sql`excluded.allocated_amount`,
        spentAmount: sql`excluded.spent_amount`,
        metadata: sql`excluded.metadata`
      }
    });

  await db
    .insert(corporateEmployees)
    .values([
      {
        id: ids.corporateEmployeeDemo,
        corporateAccountId: ids.corporateAccount,
        userId: demoUser.id,
        email: DEMO_EMAIL,
        name: "Raka Demo",
        department: "Sustainability",
        role: "program_admin",
        status: "active"
      },
      {
        id: ids.corporateEmployeeFinance,
        corporateAccountId: ids.corporateAccount,
        email: "finance.demo@nusantarabank.example",
        name: "Finance Demo",
        department: "Finance",
        role: "report_viewer",
        status: "invited"
      }
    ])
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
    .insert(corporateProjectPortfolio)
    .values([
      {
        id: ids.corporatePortfolioRaja,
        programId: ids.corporateProgram,
        campaignId: campaignBySlug.get("restore-raja-ampat-reefs")!,
        allocationAmount: "220000000.00",
        status: "funded"
      },
      {
        id: ids.corporatePortfolioBali,
        programId: ids.corporateProgram,
        campaignId: campaignBySlug.get("mangrove-shield-bali")!,
        allocationAmount: "118000000.00",
        status: "monitoring"
      }
    ])
    .onConflictDoUpdate({
      target: [corporateProjectPortfolio.programId, corporateProjectPortfolio.campaignId],
      set: {
        allocationAmount: sql`excluded.allocation_amount`,
        status: sql`excluded.status`
      }
    });

  await db
    .insert(corporateEvidenceCenter)
    .values([
      {
        id: ids.corporateEvidenceRaja,
        programId: ids.corporateProgram,
        evidenceId: ids.evidenceRajaAmpat,
        visibility: "reportable",
        addedAt: date("2026-06-12T05:00:00.000Z")
      },
      {
        id: ids.corporateEvidenceBali,
        programId: ids.corporateProgram,
        evidenceId: ids.evidenceBali,
        visibility: "reportable",
        addedAt: date("2026-06-10T05:00:00.000Z")
      }
    ])
    .onConflictDoUpdate({
      target: [corporateEvidenceCenter.programId, corporateEvidenceCenter.evidenceId],
      set: {
        visibility: sql`excluded.visibility`,
        addedAt: sql`excluded.added_at`
      }
    });

  await db
    .insert(corporateReportExports)
    .values({
      id: ids.corporateReportExport,
      programId: ids.corporateProgram,
      requestedByUserId: demoUser.id,
      approvedByUserId: demoUser.id,
      exportCode: "TRB-CORP-EXPORT-2026-0001",
      reportType: "esg",
      status: "published",
      fileUrl: "/generated/corporate-reports/trb-corp-export-2026-0001.json",
      previewUrl: "/generated/corporate-reports/trb-corp-export-2026-0001.html",
      evidenceBundleUrl: "/generated/corporate-reports/trb-corp-export-2026-0001-evidence.json",
      publicSlug: "nusantara-bank-ocean-impact-2026",
      approvedAt: date("2026-06-18T04:00:00.000Z"),
      publishedAt: date("2026-06-19T04:00:00.000Z"),
      metadata: {
        portfolioCount: 2,
        evidenceCount: 2,
        verifiedOutputs: 2,
        committedFunding: 500000000,
        generatedBy: "seeded_corporate_report"
      },
      updatedAt: date("2026-06-19T04:00:00.000Z"),
      createdAt: date("2026-06-18T02:00:00.000Z")
    })
    .onConflictDoUpdate({
      target: corporateReportExports.exportCode,
      set: {
        programId: ids.corporateProgram,
        requestedByUserId: demoUser.id,
        approvedByUserId: demoUser.id,
        reportType: "esg",
        status: "published",
        fileUrl: "/generated/corporate-reports/trb-corp-export-2026-0001.json",
        previewUrl: "/generated/corporate-reports/trb-corp-export-2026-0001.html",
        evidenceBundleUrl: "/generated/corporate-reports/trb-corp-export-2026-0001-evidence.json",
        publicSlug: "nusantara-bank-ocean-impact-2026",
        approvedAt: date("2026-06-18T04:00:00.000Z"),
        publishedAt: date("2026-06-19T04:00:00.000Z"),
        metadata: {
          portfolioCount: 2,
          evidenceCount: 2,
          verifiedOutputs: 2,
          committedFunding: 500000000,
          generatedBy: "seeded_corporate_report"
        },
        updatedAt: date("2026-06-19T04:00:00.000Z"),
        createdAt: date("2026-06-18T02:00:00.000Z")
      }
    });

  await db
    .insert(corporatePermissions)
    .values({
      id: ids.corporatePermission,
      corporateAccountId: ids.corporateAccount,
      userId: demoUser.id,
      permission: "program.manage"
    })
    .onConflictDoNothing({
      target: [corporatePermissions.corporateAccountId, corporatePermissions.userId, corporatePermissions.permission]
    });

  await db
    .insert(emailLogs)
    .values([
      {
        id: ids.emailReceiptRaja,
        userId: demoUser.id,
        recipientEmail: DEMO_EMAIL,
        subject: "Your Terumbu donation receipt",
        template: "donation_receipt",
        status: "sent",
        payload: {
          receiptNumber: "TRB-RCP-2026-0001",
          donationId: ids.donationRajaAmpat
        },
        sentAt: date("2026-06-01T04:32:00.000Z")
      },
      {
        id: ids.emailBookingRaja,
        userId: demoUser.id,
        recipientEmail: DEMO_EMAIL,
        subject: "Your Raja Ampat expedition booking is confirmed",
        template: "expedition_booking_confirmation",
        status: "sent",
        payload: {
          bookingCode: "TRB-EXP-2026-0001",
          departure: "2026-10-09"
        },
        sentAt: date("2026-06-14T05:03:00.000Z")
      }
    ])
    .onConflictDoUpdate({
      target: emailLogs.id,
      set: {
        userId: demoUser.id,
        recipientEmail: sql`excluded.recipient_email`,
        subject: sql`excluded.subject`,
        template: sql`excluded.template`,
        status: sql`excluded.status`,
        payload: sql`excluded.payload`,
        sentAt: sql`excluded.sent_at`
      }
    });

  await db
    .insert(adminAuditLogs)
    .values({
      id: ids.auditLog,
      actorUserId: demoUser.id,
      action: "seed.demo_data.upserted",
      entityType: "seed",
      entityId: null,
      metadata: {
        demoEmail: DEMO_EMAIL,
        campaigns: 3,
        donations: 3,
        impactPassportItems: 4
      },
      createdAt: now
    })
    .onConflictDoUpdate({
      target: adminAuditLogs.id,
      set: {
        actorUserId: demoUser.id,
        action: "seed.demo_data.upserted",
        entityType: "seed",
        entityId: null,
        metadata: sql`excluded.metadata`,
        createdAt: now
      }
    });

  console.log("Seed complete.");
  console.log(`Demo account: ${DEMO_EMAIL}`);
  console.log(`Demo password: ${DEMO_PASSWORD}`);
  console.log("Seeded: roles, profile, organizations, campaigns, updates, impact sites, donations, transactions, ecosystems, expeditions, courses, passport, corporate account.");
}

seed()
  .catch((error) => {
    console.error("Seed failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await queryClient.end();
  });
