import "dotenv/config";

import { scryptSync } from "node:crypto";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../src/db/schema";

const {
  accounts,
  adminAuditLogs,
  campaignUpdates,
  campaigns,
  corporateAccounts,
  courses,
  donations,
  expeditions,
  impactPassportItems,
  impactPassports,
  impactSites,
  organizations,
  paymentTransactions,
  profiles,
  roles,
  sponsoredEcosystems,
  userRoles,
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
  ecosystemCoral1: "99999999-9999-4999-8999-999999999991",
  ecosystemCoral2: "99999999-9999-4999-8999-999999999992",
  ecosystemMangrove: "99999999-9999-4999-8999-999999999993",
  passportItemDonation: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
  passportItemCoral: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
  passportItemExpedition: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
  passportItemCourse: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4",
  corporateAccount: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  auditLog: "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
};

const queryClient = postgres(databaseUrl, {
  max: 1
});

const db = drizzle(queryClient, { schema });

function passwordHash(password: string) {
  const hash = scryptSync(password, DEMO_PASSWORD_SALT, 64).toString("hex");

  return `scrypt:${DEMO_PASSWORD_SALT}:${hash}`;
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

  if (!userRole || !corporateAdminRole) {
    throw new Error("Required demo roles were not created.");
  }

  await db
    .insert(userRoles)
    .values([
      { id: ids.userRoleUser, userId: demoUser.id, roleId: userRole.id },
      { id: ids.userRoleCorporateAdmin, userId: demoUser.id, roleId: corporateAdminRole.id }
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

  await db
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
    });

  await db
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
          campaign: "restore-raja-ampat-reefs"
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
          fragments: 25
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
