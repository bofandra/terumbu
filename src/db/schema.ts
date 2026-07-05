import {
  boolean,
  foreignKey,
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

export const bookingStatus = pgEnum("booking_status", [
  "draft",
  "pending_payment",
  "confirmed",
  "completed",
  "cancelled"
]);

export const enrollmentStatus = pgEnum("enrollment_status", [
  "active",
  "completed",
  "expired"
]);

export const evidenceStatus = pgEnum("evidence_status", [
  "submitted",
  "in_review",
  "verified",
  "rejected"
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

export const userPaymentMethods = pgTable("user_payment_methods", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 80 }).default("demo_gateway").notNull(),
  providerPaymentMethodId: varchar("provider_payment_method_id", { length: 255 }).notNull(),
  label: varchar("label", { length: 160 }).notNull(),
  brand: varchar("brand", { length: 80 }).default("Demo Card").notNull(),
  last4: varchar("last4", { length: 4 }).notNull(),
  expMonth: integer("exp_month"),
  expYear: integer("exp_year"),
  isDefault: boolean("is_default").default(false).notNull(),
  status: varchar("status", { length: 80 }).default("active").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userIdx: index("user_payment_methods_user_idx").on(table.userId),
  providerIdx: uniqueIndex("user_payment_methods_provider_idx").on(table.provider, table.providerPaymentMethodId)
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

export const organizationUsers = pgTable("organization_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 80 }).default("manager").notNull(),
  status: varchar("status", { length: 80 }).default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  organizationIdx: index("organization_users_organization_idx").on(table.organizationId),
  userIdx: index("organization_users_user_idx").on(table.userId),
  userOrganizationIdx: uniqueIndex("organization_users_unique_idx").on(table.organizationId, table.userId)
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

export const donationSubscriptions = pgTable("donation_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  paymentMethodId: uuid("payment_method_id").references(() => userPaymentMethods.id, { onDelete: "set null" }),
  donorName: varchar("donor_name", { length: 160 }).notNull(),
  donorEmail: varchar("donor_email", { length: 255 }).notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).default("IDR").notNull(),
  interval: varchar("interval", { length: 40 }).default("month").notNull(),
  status: varchar("status", { length: 80 }).default("incomplete").notNull(),
  provider: varchar("provider", { length: 80 }).default("demo_gateway").notNull(),
  providerSubscriptionReference: varchar("provider_subscription_reference", { length: 255 }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  nextBillingAt: timestamp("next_billing_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  campaignIdx: index("donation_subscriptions_campaign_idx").on(table.campaignId),
  userIdx: index("donation_subscriptions_user_idx").on(table.userId),
  providerIdx: uniqueIndex("donation_subscriptions_provider_idx").on(table.provider, table.providerSubscriptionReference)
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

export const userSavedCampaigns = pgTable("user_saved_campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 80 }).default("active").notNull(),
  savedAt: timestamp("saved_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userIdx: index("user_saved_campaigns_user_idx").on(table.userId),
  campaignIdx: index("user_saved_campaigns_campaign_idx").on(table.campaignId),
  userCampaignIdx: uniqueIndex("user_saved_campaigns_unique_idx").on(table.userId, table.campaignId)
}));

export const campaignFollowSubscriptions = pgTable("campaign_follow_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }),
  status: varchar("status", { length: 80 }).default("active").notNull(),
  frequency: varchar("frequency", { length: 80 }).default("weekly").notNull(),
  lastNotifiedAt: timestamp("last_notified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userIdx: index("campaign_follow_subscriptions_user_idx").on(table.userId),
  campaignIdx: index("campaign_follow_subscriptions_campaign_idx").on(table.campaignId),
  userCampaignIdx: uniqueIndex("campaign_follow_subscriptions_unique_idx").on(table.userId, table.campaignId)
}));

export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  campaignUpdates: boolean("campaign_updates").default(true).notNull(),
  evidenceAlerts: boolean("evidence_alerts").default(true).notNull(),
  expeditionReminders: boolean("expedition_reminders").default(true).notNull(),
  academyUpdates: boolean("academy_updates").default(true).notNull(),
  monthlyImpactEmail: boolean("monthly_impact_email").default(true).notNull(),
  monthlyImpactReport: boolean("monthly_impact_report").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userIdx: uniqueIndex("notification_preferences_user_idx").on(table.userId)
}));

export const userNotifications = pgTable("user_notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  notificationCode: varchar("notification_code", { length: 180 }).notNull(),
  category: varchar("category", { length: 120 }).notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  message: text("message").notNull(),
  href: text("href").notNull(),
  sourceType: varchar("source_type", { length: 80 }),
  sourceId: uuid("source_id"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userIdx: index("user_notifications_user_idx").on(table.userId),
  sourceIdx: index("user_notifications_source_idx").on(table.sourceType, table.sourceId),
  userCodeIdx: uniqueIndex("user_notifications_code_idx").on(table.userId, table.notificationCode)
}));

export const monthlyImpactReports = pgTable("monthly_impact_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reportMonth: varchar("report_month", { length: 7 }).notNull(),
  status: varchar("status", { length: 80 }).default("ready").notNull(),
  label: varchar("label", { length: 160 }).notNull(),
  contributions: numeric("contributions", { precision: 14, scale: 2 }).default("0").notNull(),
  campaignUpdates: integer("campaign_updates").default(0).notNull(),
  newEvidence: integer("new_evidence").default(0).notNull(),
  coralsMonitored: integer("corals_monitored").default(0).notNull(),
  academyProgress: integer("academy_progress").default(0).notNull(),
  emailedAt: timestamp("emailed_at", { withTimezone: true }),
  metadata: jsonb("metadata"),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userIdx: index("monthly_impact_reports_user_idx").on(table.userId),
  userMonthIdx: uniqueIndex("monthly_impact_reports_user_month_idx").on(table.userId, table.reportMonth)
}));

export const projectEvidence = pgTable("project_evidence", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  impactSiteId: uuid("impact_site_id").references(() => impactSites.id, { onDelete: "set null" }),
  uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, { onDelete: "set null" }),
  evidenceCode: varchar("evidence_code", { length: 120 }).notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  evidenceType: varchar("evidence_type", { length: 80 }).notNull(),
  fileUrl: text("file_url").notNull(),
  storageProvider: varchar("storage_provider", { length: 80 }).default("local_demo").notNull(),
  verificationStatus: evidenceStatus("verification_status").default("submitted").notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  codeIdx: uniqueIndex("project_evidence_code_idx").on(table.evidenceCode),
  campaignIdx: index("project_evidence_campaign_idx").on(table.campaignId),
  statusIdx: index("project_evidence_status_idx").on(table.verificationStatus)
}));

export const campaignActivities = pgTable("campaign_activity", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  sourceUpdateId: uuid("source_update_id").references(() => campaignUpdates.id, { onDelete: "set null" }),
  sourceEvidenceId: uuid("source_evidence_id").references(() => projectEvidence.id, { onDelete: "set null" }),
  impactSiteId: uuid("impact_site_id").references(() => impactSites.id, { onDelete: "set null" }),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  activityCode: varchar("activity_code", { length: 120 }).notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  body: text("body"),
  activityType: varchar("activity_type", { length: 80 }).default("field_note").notNull(),
  mediaUrl: text("media_url"),
  evidenceType: varchar("evidence_type", { length: 80 }),
  visibilityStatus: varchar("visibility_status", { length: 80 }).default("published").notNull(),
  verificationStatus: evidenceStatus("verification_status"),
  storageProvider: varchar("storage_provider", { length: 80 }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  codeIdx: uniqueIndex("campaign_activity_code_idx").on(table.activityCode),
  campaignIdx: index("campaign_activity_campaign_idx").on(table.campaignId),
  sourceUpdateIdx: index("campaign_activity_update_idx").on(table.sourceUpdateId),
  sourceEvidenceIdx: index("campaign_activity_evidence_idx").on(table.sourceEvidenceId),
  statusIdx: index("campaign_activity_status_idx").on(table.visibilityStatus, table.verificationStatus)
}));

export const donations = pgTable("donations", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  subscriptionId: uuid("subscription_id").references(() => donationSubscriptions.id, { onDelete: "set null" }),
  idempotencyKey: varchar("idempotency_key", { length: 160 }),
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
  statusIdx: index("donations_status_idx").on(table.status),
  idempotencyIdx: uniqueIndex("donations_idempotency_idx").on(table.idempotencyKey)
}));

export const donationReceipts = pgTable("donation_receipts", {
  id: uuid("id").defaultRandom().primaryKey(),
  donationId: uuid("donation_id").notNull().references(() => donations.id, { onDelete: "cascade" }),
  receiptNumber: varchar("receipt_number", { length: 120 }).notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
  emailedAt: timestamp("emailed_at", { withTimezone: true }),
  payload: jsonb("payload")
}, (table) => ({
  donationIdx: uniqueIndex("donation_receipts_donation_idx").on(table.donationId),
  receiptIdx: uniqueIndex("donation_receipts_number_idx").on(table.receiptNumber)
}));

export const paymentTransactions = pgTable("payment_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  donationId: uuid("donation_id").references(() => donations.id, { onDelete: "set null" }),
  paymentMethodId: uuid("payment_method_id").references(() => userPaymentMethods.id, { onDelete: "set null" }),
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
  donationId: uuid("donation_id").references(() => donations.id, { onDelete: "set null" }),
  impactSiteId: uuid("impact_site_id").references(() => impactSites.id, { onDelete: "set null" }),
  code: varchar("code", { length: 80 }).notNull(),
  label: varchar("label", { length: 160 }).notNull(),
  status: varchar("status", { length: 80 }).default("growing").notNull(),
  plantedAt: timestamp("planted_at", { withTimezone: true }),
  lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }),
  metadata: jsonb("metadata")
}, (table) => ({
  codeIdx: uniqueIndex("sponsored_ecosystems_code_idx").on(table.code),
  donationIdx: uniqueIndex("sponsored_ecosystems_donation_idx").on(table.donationId),
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
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  slugIdx: uniqueIndex("expeditions_slug_idx").on(table.slug)
}));

export const expeditionDepartures = pgTable("expedition_departures", {
  id: uuid("id").defaultRandom().primaryKey(),
  expeditionId: uuid("expedition_id").notNull().references(() => expeditions.id, { onDelete: "cascade" }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  capacity: integer("capacity").notNull(),
  seatsBooked: integer("seats_booked").default(0).notNull(),
  status: varchar("status", { length: 80 }).default("open").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  departureIdx: uniqueIndex("expedition_departures_unique_idx").on(table.expeditionId, table.startsAt),
  expeditionIdx: index("expedition_departures_expedition_idx").on(table.expeditionId)
}));

export const expeditionBookings = pgTable("expedition_bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  expeditionId: uuid("expedition_id").notNull().references(() => expeditions.id),
  departureId: uuid("departure_id").notNull().references(() => expeditionDepartures.id),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  bookingCode: varchar("booking_code", { length: 120 }).notNull(),
  contactName: varchar("contact_name", { length: 160 }).notNull(),
  contactEmail: varchar("contact_email", { length: 255 }).notNull(),
  participantsCount: integer("participants_count").notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 160 }),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).default("IDR").notNull(),
  status: bookingStatus("status").default("pending_payment").notNull(),
  paymentStatus: paymentStatus("payment_status").default("created").notNull(),
  bookedAt: timestamp("booked_at", { withTimezone: true }).defaultNow().notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  metadata: jsonb("metadata")
}, (table) => ({
  bookingCodeIdx: uniqueIndex("expedition_bookings_code_idx").on(table.bookingCode),
  idempotencyIdx: uniqueIndex("expedition_bookings_idempotency_idx").on(table.idempotencyKey),
  userIdx: index("expedition_bookings_user_idx").on(table.userId),
  departureIdx: index("expedition_bookings_departure_idx").on(table.departureId),
  statusIdx: index("expedition_bookings_status_idx").on(table.status)
}));

export const expeditionReviews = pgTable("expedition_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  expeditionId: uuid("expedition_id").notNull().references(() => expeditions.id, { onDelete: "cascade" }),
  bookingId: uuid("booking_id").notNull().references(() => expeditionBookings.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  rating: integer("rating").notNull(),
  title: varchar("title", { length: 160 }),
  body: text("body").notNull(),
  status: varchar("status", { length: 80 }).default("published").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  bookingIdx: uniqueIndex("expedition_reviews_booking_idx").on(table.bookingId),
  expeditionIdx: index("expedition_reviews_expedition_idx").on(table.expeditionId),
  userIdx: index("expedition_reviews_user_idx").on(table.userId),
  statusIdx: index("expedition_reviews_status_idx").on(table.status)
}));

export const expeditionParticipants = pgTable("expedition_participants", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").notNull().references(() => expeditionBookings.id, { onDelete: "cascade" }),
  fullName: varchar("full_name", { length: 160 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 80 }),
  emergencyContact: varchar("emergency_contact", { length: 220 }),
  dietaryNotes: text("dietary_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  bookingIdx: index("expedition_participants_booking_idx").on(table.bookingId)
}));

export const expeditionBookingPayments = pgTable("expedition_booking_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").notNull(),
  paymentMethodId: uuid("payment_method_id").references(() => userPaymentMethods.id, { onDelete: "set null" }),
  provider: varchar("provider", { length: 80 }).notNull(),
  providerReference: varchar("provider_reference", { length: 255 }).notNull(),
  status: paymentStatus("status").default("created").notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  providerIdx: uniqueIndex("expedition_booking_payments_provider_idx").on(table.provider, table.providerReference),
  bookingIdx: index("expedition_booking_payments_booking_idx").on(table.bookingId),
  bookingFk: foreignKey({
    name: "expedition_booking_payments_booking_fk",
    columns: [table.bookingId],
    foreignColumns: [expeditionBookings.id]
  }).onDelete("cascade")
}));

export const paymentOperations = pgTable("payment_operations", {
  id: uuid("id").defaultRandom().primaryKey(),
  operationCode: varchar("operation_code", { length: 120 }).notNull(),
  operationType: varchar("operation_type", { length: 80 }).notNull(),
  entityType: varchar("entity_type", { length: 80 }).notNull(),
  donationId: uuid("donation_id").references(() => donations.id, { onDelete: "set null" }),
  bookingId: uuid("booking_id").references(() => expeditionBookings.id, { onDelete: "set null" }),
  subscriptionId: uuid("subscription_id").references(() => donationSubscriptions.id, { onDelete: "set null" }),
  requestedByUserId: uuid("requested_by_user_id").references(() => users.id, { onDelete: "set null" }),
  processedByUserId: uuid("processed_by_user_id").references(() => users.id, { onDelete: "set null" }),
  status: varchar("status", { length: 80 }).default("pending").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }),
  currency: varchar("currency", { length: 8 }).default("IDR").notNull(),
  provider: varchar("provider", { length: 80 }).default("demo_gateway").notNull(),
  providerReference: varchar("provider_reference", { length: 255 }),
  reason: text("reason"),
  metadata: jsonb("metadata"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  codeIdx: uniqueIndex("payment_operations_code_idx").on(table.operationCode),
  donationIdx: index("payment_operations_donation_idx").on(table.donationId),
  bookingIdx: index("payment_operations_booking_idx").on(table.bookingId),
  subscriptionIdx: index("payment_operations_subscription_idx").on(table.subscriptionId),
  statusIdx: index("payment_operations_status_idx").on(table.status)
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

export const courseLessons = pgTable("course_lessons", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 220 }).notNull(),
  slug: varchar("slug", { length: 220 }).notNull(),
  position: integer("position").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  body: text("body"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  slugIdx: uniqueIndex("course_lessons_course_slug_idx").on(table.courseId, table.slug),
  courseIdx: index("course_lessons_course_idx").on(table.courseId)
}));

export const courseEnrollments = pgTable("course_enrollments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  status: enrollmentStatus("status").default("active").notNull(),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  metadata: jsonb("metadata")
}, (table) => ({
  userCourseIdx: uniqueIndex("course_enrollments_user_course_idx").on(table.userId, table.courseId),
  userIdx: index("course_enrollments_user_idx").on(table.userId),
  courseIdx: index("course_enrollments_course_idx").on(table.courseId)
}));

export const lessonProgress = pgTable("lesson_progress", {
  id: uuid("id").defaultRandom().primaryKey(),
  enrollmentId: uuid("enrollment_id").notNull().references(() => courseEnrollments.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id").notNull().references(() => courseLessons.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 80 }).default("not_started").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  score: integer("score"),
  metadata: jsonb("metadata")
}, (table) => ({
  enrollmentLessonIdx: uniqueIndex("lesson_progress_enrollment_lesson_idx").on(table.enrollmentId, table.lessonId),
  enrollmentIdx: index("lesson_progress_enrollment_idx").on(table.enrollmentId)
}));

export const courseAssessments = pgTable("course_assessments", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 220 }).notNull(),
  slug: varchar("slug", { length: 220 }).notNull(),
  passingScore: integer("passing_score").default(80).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  slugIdx: uniqueIndex("course_assessments_course_slug_idx").on(table.courseId, table.slug)
}));

export const assessmentAttempts = pgTable("assessment_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  assessmentId: uuid("assessment_id").notNull().references(() => courseAssessments.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  status: varchar("status", { length: 80 }).notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  metadata: jsonb("metadata")
}, (table) => ({
  assessmentUserIdx: uniqueIndex("assessment_attempts_assessment_user_idx").on(table.assessmentId, table.userId),
  userIdx: index("assessment_attempts_user_idx").on(table.userId)
}));

export const courseCertificates = pgTable("course_certificates", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  enrollmentId: uuid("enrollment_id").references(() => courseEnrollments.id, { onDelete: "set null" }),
  certificateNumber: varchar("certificate_number", { length: 120 }).notNull(),
  publicSlug: varchar("public_slug", { length: 180 }).notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
  metadata: jsonb("metadata")
}, (table) => ({
  certificateIdx: uniqueIndex("course_certificates_number_idx").on(table.certificateNumber),
  publicSlugIdx: uniqueIndex("course_certificates_public_slug_idx").on(table.publicSlug),
  userCourseIdx: uniqueIndex("course_certificates_user_course_idx").on(table.userId, table.courseId)
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
  sourceType: varchar("source_type", { length: 80 }),
  sourceId: uuid("source_id"),
  itemType: varchar("item_type", { length: 80 }).notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  description: text("description"),
  evidenceUrl: text("evidence_url"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  metadata: jsonb("metadata")
}, (table) => ({
  passportIdx: index("impact_passport_items_passport_idx").on(table.passportId),
  sourceIdx: uniqueIndex("impact_passport_items_source_idx").on(table.passportId, table.sourceType, table.sourceId)
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

export const corporatePrograms = pgTable("corporate_programs", {
  id: uuid("id").defaultRandom().primaryKey(),
  corporateAccountId: uuid("corporate_account_id").notNull(),
  name: varchar("name", { length: 220 }).notNull(),
  slug: varchar("slug", { length: 220 }).notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  budgetAmount: numeric("budget_amount", { precision: 14, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).default("IDR").notNull(),
  status: varchar("status", { length: 80 }).default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  slugIdx: uniqueIndex("corporate_programs_slug_idx").on(table.slug),
  accountIdx: index("corporate_programs_account_idx").on(table.corporateAccountId),
  accountFk: foreignKey({
    name: "corporate_programs_account_fk",
    columns: [table.corporateAccountId],
    foreignColumns: [corporateAccounts.id]
  }).onDelete("cascade")
}));

export const corporateProgramBudgets = pgTable("corporate_program_budgets", {
  id: uuid("id").defaultRandom().primaryKey(),
  programId: uuid("program_id").notNull().references(() => corporatePrograms.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 120 }).notNull(),
  allocatedAmount: numeric("allocated_amount", { precision: 14, scale: 2 }).notNull(),
  spentAmount: numeric("spent_amount", { precision: 14, scale: 2 }).default("0").notNull(),
  metadata: jsonb("metadata")
}, (table) => ({
  programCategoryIdx: uniqueIndex("corporate_program_budgets_category_idx").on(table.programId, table.category)
}));

export const corporateEmployees = pgTable("corporate_employees", {
  id: uuid("id").defaultRandom().primaryKey(),
  corporateAccountId: uuid("corporate_account_id").notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  department: varchar("department", { length: 120 }),
  role: varchar("role", { length: 120 }).default("member").notNull(),
  status: varchar("status", { length: 80 }).default("invited").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  accountEmailIdx: uniqueIndex("corporate_employees_account_email_idx").on(table.corporateAccountId, table.email),
  accountIdx: index("corporate_employees_account_idx").on(table.corporateAccountId),
  accountFk: foreignKey({
    name: "corporate_employees_account_fk",
    columns: [table.corporateAccountId],
    foreignColumns: [corporateAccounts.id]
  }).onDelete("cascade")
}));

export const corporateProjectPortfolio = pgTable("corporate_project_portfolio", {
  id: uuid("id").defaultRandom().primaryKey(),
  programId: uuid("program_id").notNull().references(() => corporatePrograms.id, { onDelete: "cascade" }),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id),
  allocationAmount: numeric("allocation_amount", { precision: 14, scale: 2 }).notNull(),
  status: varchar("status", { length: 80 }).default("funded").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  programCampaignIdx: uniqueIndex("corporate_project_portfolio_unique_idx").on(table.programId, table.campaignId)
}));

export const corporateEvidenceCenter = pgTable("corporate_evidence_center", {
  id: uuid("id").defaultRandom().primaryKey(),
  programId: uuid("program_id").notNull().references(() => corporatePrograms.id, { onDelete: "cascade" }),
  evidenceId: uuid("evidence_id").notNull().references(() => projectEvidence.id, { onDelete: "cascade" }),
  visibility: varchar("visibility", { length: 80 }).default("internal").notNull(),
  addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  programEvidenceIdx: uniqueIndex("corporate_evidence_center_unique_idx").on(table.programId, table.evidenceId)
}));

export const corporateReportExports = pgTable("corporate_report_exports", {
  id: uuid("id").defaultRandom().primaryKey(),
  programId: uuid("program_id").notNull().references(() => corporatePrograms.id, { onDelete: "cascade" }),
  requestedByUserId: uuid("requested_by_user_id").references(() => users.id, { onDelete: "set null" }),
  approvedByUserId: uuid("approved_by_user_id").references(() => users.id, { onDelete: "set null" }),
  exportCode: varchar("export_code", { length: 120 }).notNull(),
  reportType: varchar("report_type", { length: 80 }).default("esg").notNull(),
  status: varchar("status", { length: 80 }).default("queued").notNull(),
  fileUrl: text("file_url"),
  previewUrl: text("preview_url"),
  evidenceBundleUrl: text("evidence_bundle_url"),
  publicSlug: varchar("public_slug", { length: 180 }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  metadata: jsonb("metadata"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  exportCodeIdx: uniqueIndex("corporate_report_exports_code_idx").on(table.exportCode),
  publicSlugIdx: uniqueIndex("corporate_report_exports_public_slug_idx").on(table.publicSlug),
  programIdx: index("corporate_report_exports_program_idx").on(table.programId)
}));

export const corporatePermissions = pgTable("corporate_permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  corporateAccountId: uuid("corporate_account_id").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  permission: varchar("permission", { length: 120 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  permissionIdx: uniqueIndex("corporate_permissions_unique_idx").on(table.corporateAccountId, table.userId, table.permission),
  accountFk: foreignKey({
    name: "corporate_permissions_account_fk",
    columns: [table.corporateAccountId],
    foreignColumns: [corporateAccounts.id]
  }).onDelete("cascade")
}));

export const emailLogs = pgTable("email_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 220 }).notNull(),
  template: varchar("template", { length: 120 }).notNull(),
  status: varchar("status", { length: 80 }).default("queued").notNull(),
  payload: jsonb("payload"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  recipientIdx: index("email_logs_recipient_idx").on(table.recipientEmail),
  userIdx: index("email_logs_user_idx").on(table.userId)
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
