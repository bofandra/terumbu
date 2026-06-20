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
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).default("IDR").notNull(),
  status: bookingStatus("status").default("pending_payment").notNull(),
  paymentStatus: paymentStatus("payment_status").default("created").notNull(),
  bookedAt: timestamp("booked_at", { withTimezone: true }).defaultNow().notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  metadata: jsonb("metadata")
}, (table) => ({
  bookingCodeIdx: uniqueIndex("expedition_bookings_code_idx").on(table.bookingCode),
  userIdx: index("expedition_bookings_user_idx").on(table.userId),
  departureIdx: index("expedition_bookings_departure_idx").on(table.departureId),
  statusIdx: index("expedition_bookings_status_idx").on(table.status)
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
  bookingId: uuid("booking_id").notNull().references(() => expeditionBookings.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 80 }).notNull(),
  providerReference: varchar("provider_reference", { length: 255 }).notNull(),
  status: paymentStatus("status").default("created").notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  providerIdx: uniqueIndex("expedition_booking_payments_provider_idx").on(table.provider, table.providerReference),
  bookingIdx: index("expedition_booking_payments_booking_idx").on(table.bookingId)
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

export const corporatePrograms = pgTable("corporate_programs", {
  id: uuid("id").defaultRandom().primaryKey(),
  corporateAccountId: uuid("corporate_account_id").notNull().references(() => corporateAccounts.id, { onDelete: "cascade" }),
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
  accountIdx: index("corporate_programs_account_idx").on(table.corporateAccountId)
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
  corporateAccountId: uuid("corporate_account_id").notNull().references(() => corporateAccounts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  department: varchar("department", { length: 120 }),
  role: varchar("role", { length: 120 }).default("member").notNull(),
  status: varchar("status", { length: 80 }).default("invited").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  accountEmailIdx: uniqueIndex("corporate_employees_account_email_idx").on(table.corporateAccountId, table.email),
  accountIdx: index("corporate_employees_account_idx").on(table.corporateAccountId)
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
  exportCode: varchar("export_code", { length: 120 }).notNull(),
  status: varchar("status", { length: 80 }).default("queued").notNull(),
  fileUrl: text("file_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  exportCodeIdx: uniqueIndex("corporate_report_exports_code_idx").on(table.exportCode),
  programIdx: index("corporate_report_exports_program_idx").on(table.programId)
}));

export const corporatePermissions = pgTable("corporate_permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  corporateAccountId: uuid("corporate_account_id").notNull().references(() => corporateAccounts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  permission: varchar("permission", { length: 120 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  permissionIdx: uniqueIndex("corporate_permissions_unique_idx").on(table.corporateAccountId, table.userId, table.permission)
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
