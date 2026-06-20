import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

export const campaignStatus = pgEnum("campaign_status", [
  "draft",
  "review",
  "published",
  "funded",
  "completed",
  "archived"
]);

export const paymentStatus = pgEnum("payment_status", [
  "created",
  "pending",
  "paid",
  "failed",
  "expired",
  "refunded"
]);

export const verificationLevel = pgEnum("verification_level", [
  "basic",
  "document",
  "field"
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 160 }),
  passwordHash: text("password_hash"),
  imageUrl: text("image_url"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  emailIdx: uniqueIndex("users_email_idx").on(table.email)
}));

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 80 }).notNull(),
  providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: integer("expires_at"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  providerIdx: uniqueIndex("accounts_provider_account_idx").on(table.provider, table.providerAccountId),
  userIdx: index("accounts_user_idx").on(table.userId)
}));

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionToken: varchar("session_token", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  tokenIdx: uniqueIndex("sessions_token_idx").on(table.sessionToken),
  userIdx: index("sessions_user_idx").on(table.userId)
}));

export const verificationTokens = pgTable("verification_tokens", {
  identifier: varchar("identifier", { length: 255 }).notNull(),
  token: varchar("token", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull()
}, (table) => ({
  tokenIdx: uniqueIndex("verification_tokens_token_idx").on(table.token)
}));

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 80 }).notNull(),
  name: varchar("name", { length: 120 }).notNull()
}, (table) => ({
  keyIdx: uniqueIndex("roles_key_idx").on(table.key)
}));

export const userRoles = pgTable("user_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userRoleIdx: uniqueIndex("user_roles_unique_idx").on(table.userId, table.roleId)
}));

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  displayName: varchar("display_name", { length: 160 }).notNull(),
  location: varchar("location", { length: 160 }),
  bio: text("bio"),
  heroLevel: integer("hero_level").default(1).notNull(),
  xp: integer("xp").default(0).notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userIdx: uniqueIndex("profiles_user_idx").on(table.userId)
}));

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 180 }).notNull(),
  type: varchar("type", { length: 80 }).notNull(),
  logoUrl: text("logo_url"),
  websiteUrl: text("website_url"),
  description: text("description"),
  verification: verificationLevel("verification").default("basic").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  slugIdx: uniqueIndex("organizations_slug_idx").on(table.slug)
}));

export const campaigns = pgTable("campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  title: varchar("title", { length: 220 }).notNull(),
  slug: varchar("slug", { length: 220 }).notNull(),
  summary: text("summary").notNull(),
  story: text("story"),
  category: varchar("category", { length: 80 }).notNull(),
  region: varchar("region", { length: 120 }).notNull(),
  imageUrl: text("image_url"),
  goalAmount: numeric("goal_amount", { precision: 14, scale: 2 }).notNull(),
  raisedAmount: numeric("raised_amount", { precision: 14, scale: 2 }).default("0").notNull(),
  donorCount: integer("donor_count").default(0).notNull(),
  impactUnit: varchar("impact_unit", { length: 120 }).notNull(),
  impactTarget: integer("impact_target").notNull(),
  status: campaignStatus("status").default("draft").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  slugIdx: uniqueIndex("campaigns_slug_idx").on(table.slug),
  statusIdx: index("campaigns_status_idx").on(table.status),
  categoryIdx: index("campaigns_category_idx").on(table.category)
}));

export const impactSites = pgTable("impact_sites", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  name: varchar("name", { length: 180 }).notNull(),
  ecosystemType: varchar("ecosystem_type", { length: 80 }).notNull(),
  region: varchar("region", { length: 120 }).notNull(),
  latitude: numeric("latitude", { precision: 9, scale: 6 }).notNull(),
  longitude: numeric("longitude", { precision: 9, scale: 6 }).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  campaignIdx: index("impact_sites_campaign_idx").on(table.campaignId)
}));

export const campaignUpdates = pgTable("campaign_updates", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 220 }).notNull(),
  body: text("body").notNull(),
  imageUrl: text("image_url"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  campaignIdx: index("campaign_updates_campaign_idx").on(table.campaignId)
}));

export const donations = pgTable("donations", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  donorName: varchar("donor_name", { length: 160 }),
  donorEmail: varchar("donor_email", { length: 255 }),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).default("IDR").notNull(),
  status: paymentStatus("status").default("created").notNull(),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  campaignIdx: index("donations_campaign_idx").on(table.campaignId),
  userIdx: index("donations_user_idx").on(table.userId),
  statusIdx: index("donations_status_idx").on(table.status)
}));

export const paymentTransactions = pgTable("payment_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  donationId: uuid("donation_id").references(() => donations.id, { onDelete: "set null" }),
  provider: varchar("provider", { length: 80 }).notNull(),
  providerReference: varchar("provider_reference", { length: 255 }).notNull(),
  status: paymentStatus("status").default("created").notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  providerIdx: uniqueIndex("payment_transactions_provider_idx").on(table.provider, table.providerReference)
}));

export const sponsoredEcosystems = pgTable("sponsored_ecosystems", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id),
  impactSiteId: uuid("impact_site_id").references(() => impactSites.id, { onDelete: "set null" }),
  code: varchar("code", { length: 80 }).notNull(),
  label: varchar("label", { length: 160 }).notNull(),
  status: varchar("status", { length: 80 }).default("growing").notNull(),
  plantedAt: timestamp("planted_at", { withTimezone: true }),
  lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }),
  metadata: jsonb("metadata")
}, (table) => ({
  codeIdx: uniqueIndex("sponsored_ecosystems_code_idx").on(table.code),
  userIdx: index("sponsored_ecosystems_user_idx").on(table.userId)
}));

export const expeditions = pgTable("expeditions", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 220 }).notNull(),
  slug: varchar("slug", { length: 220 }).notNull(),
  region: varchar("region", { length: 120 }).notNull(),
  durationDays: integer("duration_days").notNull(),
  basePrice: numeric("base_price", { precision: 14, scale: 2 }).notNull(),
  summary: text("summary").notNull(),
  imageUrl: text("image_url"),
  relatedCampaignId: uuid("related_campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  slugIdx: uniqueIndex("expeditions_slug_idx").on(table.slug)
}));

export const courses = pgTable("courses", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 220 }).notNull(),
  slug: varchar("slug", { length: 220 }).notNull(),
  level: varchar("level", { length: 80 }).notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  summary: text("summary").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  slugIdx: uniqueIndex("courses_slug_idx").on(table.slug)
}));

export const impactPassports = pgTable("impact_passports", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  publicSlug: varchar("public_slug", { length: 180 }).notNull(),
  visibility: varchar("visibility", { length: 40 }).default("private").notNull(),
  story: text("story"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userIdx: uniqueIndex("impact_passports_user_idx").on(table.userId),
  slugIdx: uniqueIndex("impact_passports_public_slug_idx").on(table.publicSlug)
}));

export const impactPassportItems = pgTable("impact_passport_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  passportId: uuid("passport_id").notNull().references(() => impactPassports.id, { onDelete: "cascade" }),
  itemType: varchar("item_type", { length: 80 }).notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  description: text("description"),
  evidenceUrl: text("evidence_url"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  metadata: jsonb("metadata")
}, (table) => ({
  passportIdx: index("impact_passport_items_passport_idx").on(table.passportId)
}));

export const corporateAccounts = pgTable("corporate_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 180 }).notNull(),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  slugIdx: uniqueIndex("corporate_accounts_slug_idx").on(table.slug)
}));

export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 160 }).notNull(),
  entityType: varchar("entity_type", { length: 120 }).notNull(),
  entityId: uuid("entity_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
