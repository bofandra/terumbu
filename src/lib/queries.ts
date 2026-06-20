import { and, asc, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  assessmentAttempts,
  campaignUpdates,
  campaigns,
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
  expeditionBookings,
  expeditionDepartures,
  expeditions,
  impactPassportItems,
  impactPassports,
  impactSites,
  lessonProgress,
  organizations,
  paymentTransactions,
  profiles,
  projectEvidence,
  sponsoredEcosystems,
  users
} from "@/db/schema";
import {
  getMetadataNumber,
  getMetadataString,
  initialsForName,
  toCampaignCard,
  toExpeditionCard,
  toNumber,
  verificationLabel,
  type CampaignCardData,
  type ExpeditionCardData,
  type ImpactSiteData,
  type ImpactStatData,
  type PassportPreviewData
} from "@/lib/domain";
import { formatCompact, formatCurrency } from "@/lib/utils";

export async function getImpactStats(): Promise<ImpactStatData[]> {
  const [donationSummary] = await db
    .select({
      total: sql<string>`coalesce(sum(${donations.amount}), 0)`,
      donors: sql<number>`count(${donations.id})`
    })
    .from(donations)
    .where(eq(donations.status, "paid"));

  const ecosystemRows = await db
    .select({
      metadata: sponsoredEcosystems.metadata
    })
    .from(sponsoredEcosystems);

  const [heroSummary] = await db
    .select({
      total: sql<number>`count(${users.id})`
    })
    .from(users);

  const corals = ecosystemRows.reduce((total, row) => total + getMetadataNumber(row.metadata, "fragments"), 0);
  const mangroves = ecosystemRows.reduce((total, row) => total + getMetadataNumber(row.metadata, "seedlings"), 0);

  return [
    { label: "Corals restored", value: formatCompact(corals), tone: "coral" },
    { label: "Mangroves planted", value: formatCompact(mangroves), tone: "kelp" },
    { label: "Ocean heroes", value: formatCompact(heroSummary?.total ?? 0), tone: "ocean" },
    { label: "Raised for conservation", value: formatCurrency(toNumber(donationSummary?.total)), tone: "sand" }
  ];
}

export async function getCampaignCards(limit?: number): Promise<CampaignCardData[]> {
  const rows = await db
    .select({
      slug: campaigns.slug,
      title: campaigns.title,
      category: campaigns.category,
      region: campaigns.region,
      summary: campaigns.summary,
      imageUrl: campaigns.imageUrl,
      raisedAmount: campaigns.raisedAmount,
      goalAmount: campaigns.goalAmount,
      donorCount: campaigns.donorCount,
      impactUnit: campaigns.impactUnit,
      impactTarget: campaigns.impactTarget,
      endsAt: campaigns.endsAt,
      partner: organizations.name,
      verification: organizations.verification
    })
    .from(campaigns)
    .innerJoin(organizations, eq(campaigns.organizationId, organizations.id))
    .where(eq(campaigns.status, "published"))
    .orderBy(desc(campaigns.publishedAt));

  const cards = rows.map((row) => toCampaignCard(row));

  return typeof limit === "number" ? cards.slice(0, limit) : cards;
}

export async function getCampaignDetail(slug: string) {
  const [row] = await db
    .select({
      id: campaigns.id,
      slug: campaigns.slug,
      title: campaigns.title,
      category: campaigns.category,
      region: campaigns.region,
      summary: campaigns.summary,
      story: campaigns.story,
      imageUrl: campaigns.imageUrl,
      raisedAmount: campaigns.raisedAmount,
      goalAmount: campaigns.goalAmount,
      donorCount: campaigns.donorCount,
      impactUnit: campaigns.impactUnit,
      impactTarget: campaigns.impactTarget,
      endsAt: campaigns.endsAt,
      partner: organizations.name,
      verification: organizations.verification
    })
    .from(campaigns)
    .innerJoin(organizations, eq(campaigns.organizationId, organizations.id))
    .where(eq(campaigns.slug, slug))
    .limit(1);

  if (!row) {
    return null;
  }

  const [updates, sites, evidence] = await Promise.all([
    db
      .select({
        title: campaignUpdates.title,
        body: campaignUpdates.body,
        imageUrl: campaignUpdates.imageUrl,
        publishedAt: campaignUpdates.publishedAt
      })
      .from(campaignUpdates)
      .where(eq(campaignUpdates.campaignId, row.id))
      .orderBy(desc(campaignUpdates.publishedAt)),
    getImpactMapSites(row.id),
    db
      .select({
        title: projectEvidence.title,
        evidenceType: projectEvidence.evidenceType,
        fileUrl: projectEvidence.fileUrl,
        verificationStatus: projectEvidence.verificationStatus,
        createdAt: projectEvidence.createdAt
      })
      .from(projectEvidence)
      .where(eq(projectEvidence.campaignId, row.id))
      .orderBy(desc(projectEvidence.createdAt))
  ]);

  return {
    ...toCampaignCard(row),
    story: row.story,
    updates,
    sites,
    evidence
  };
}

export async function getExpeditionCards(limit?: number): Promise<ExpeditionCardData[]> {
  const rows = await db
    .select({
      slug: expeditions.slug,
      title: expeditions.title,
      region: expeditions.region,
      durationDays: expeditions.durationDays,
      basePrice: expeditions.basePrice,
      imageUrl: expeditions.imageUrl,
      summary: expeditions.summary
    })
    .from(expeditions)
    .orderBy(asc(expeditions.title));

  const cards = rows.map((row) => toExpeditionCard(row));

  return typeof limit === "number" ? cards.slice(0, limit) : cards;
}

export async function getExpeditionDetail(slug: string) {
  const [row] = await db
    .select({
      id: expeditions.id,
      slug: expeditions.slug,
      title: expeditions.title,
      region: expeditions.region,
      durationDays: expeditions.durationDays,
      basePrice: expeditions.basePrice,
      imageUrl: expeditions.imageUrl,
      summary: expeditions.summary
    })
    .from(expeditions)
    .where(eq(expeditions.slug, slug))
    .limit(1);

  if (!row) {
    return null;
  }

  const departures = await db
    .select({
      id: expeditionDepartures.id,
      startsAt: expeditionDepartures.startsAt,
      endsAt: expeditionDepartures.endsAt,
      capacity: expeditionDepartures.capacity,
      seatsBooked: expeditionDepartures.seatsBooked,
      status: expeditionDepartures.status,
      metadata: expeditionDepartures.metadata
    })
    .from(expeditionDepartures)
    .where(eq(expeditionDepartures.expeditionId, row.id))
    .orderBy(asc(expeditionDepartures.startsAt));

  return {
    ...toExpeditionCard(row),
    id: row.id,
    durationDays: row.durationDays,
    departures: departures.map((departure) => ({
      ...departure,
      availableSeats: Math.max(0, departure.capacity - departure.seatsBooked),
      meetingPoint: getMetadataString(departure.metadata, "meetingPoint")
    }))
  };
}

export async function getImpactMapSites(campaignId?: string): Promise<ImpactSiteData[]> {
  const rows = await db
    .select({
      name: impactSites.name,
      type: impactSites.ecosystemType,
      region: impactSites.region,
      latitude: impactSites.latitude,
      longitude: impactSites.longitude,
      metadata: impactSites.metadata,
      verification: organizations.verification
    })
    .from(impactSites)
    .leftJoin(campaigns, eq(impactSites.campaignId, campaigns.id))
    .leftJoin(organizations, eq(campaigns.organizationId, organizations.id))
    .where(campaignId ? eq(impactSites.campaignId, campaignId) : undefined)
    .orderBy(asc(impactSites.name));

  return rows.map((site) => ({
    name: site.name,
    type: site.type,
    region: site.region,
    progress: getMetadataNumber(site.metadata, "progress"),
    latitude: toNumber(site.latitude),
    longitude: toNumber(site.longitude),
    verification: verificationLabel(site.verification),
    evidenceCount: getMetadataNumber(site.metadata, "evidenceCount"),
    latestSurvey: getMetadataString(site.metadata, "latestSurvey")
  }));
}

export async function getCourses() {
  const rows = await db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      level: courses.level,
      durationMinutes: courses.durationMinutes,
      summary: courses.summary,
      imageUrl: courses.imageUrl
    })
    .from(courses)
    .orderBy(asc(courses.durationMinutes));

  return rows.map((course) => ({
    ...course,
    duration: course.durationMinutes >= 60 ? `${Math.round(course.durationMinutes / 60)} hours` : `${course.durationMinutes} min`
  }));
}

export async function getCourseDetail(slug: string, userId?: string) {
  const [course] = await db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      level: courses.level,
      durationMinutes: courses.durationMinutes,
      summary: courses.summary,
      imageUrl: courses.imageUrl
    })
    .from(courses)
    .where(eq(courses.slug, slug))
    .limit(1);

  if (!course) {
    return null;
  }

  const [lessons, assessments, enrollmentRows] = await Promise.all([
    db
      .select({
        id: courseLessons.id,
        title: courseLessons.title,
        slug: courseLessons.slug,
        position: courseLessons.position,
        durationMinutes: courseLessons.durationMinutes,
        body: courseLessons.body
      })
      .from(courseLessons)
      .where(eq(courseLessons.courseId, course.id))
      .orderBy(asc(courseLessons.position)),
    db
      .select({
        id: courseAssessments.id,
        title: courseAssessments.title,
        passingScore: courseAssessments.passingScore
      })
      .from(courseAssessments)
      .where(eq(courseAssessments.courseId, course.id)),
    userId
      ? db
          .select({
            id: courseEnrollments.id,
            status: courseEnrollments.status,
            completedAt: courseEnrollments.completedAt
          })
          .from(courseEnrollments)
          .where(and(eq(courseEnrollments.courseId, course.id), eq(courseEnrollments.userId, userId)))
          .limit(1)
      : Promise.resolve([])
  ]);

  const enrollment = enrollmentRows[0] ?? null;
  const [progressRows, certificateRows, attemptRows] = await Promise.all([
    enrollment
      ? db
          .select({
            lessonId: lessonProgress.lessonId,
            status: lessonProgress.status,
            score: lessonProgress.score,
            completedAt: lessonProgress.completedAt
          })
          .from(lessonProgress)
          .where(eq(lessonProgress.enrollmentId, enrollment.id))
      : Promise.resolve([]),
    userId
      ? db
          .select({
            certificateNumber: courseCertificates.certificateNumber,
            publicSlug: courseCertificates.publicSlug,
            issuedAt: courseCertificates.issuedAt
          })
          .from(courseCertificates)
          .where(and(eq(courseCertificates.courseId, course.id), eq(courseCertificates.userId, userId)))
          .limit(1)
      : Promise.resolve([]),
    userId && assessments[0]
      ? db
          .select({
            score: assessmentAttempts.score,
            status: assessmentAttempts.status,
            submittedAt: assessmentAttempts.submittedAt
          })
          .from(assessmentAttempts)
          .where(and(eq(assessmentAttempts.assessmentId, assessments[0].id), eq(assessmentAttempts.userId, userId)))
          .limit(1)
      : Promise.resolve([])
  ]);

  const progressByLesson = new Map(progressRows.map((row) => [row.lessonId, row]));

  return {
    ...course,
    duration: course.durationMinutes >= 60 ? `${Math.round(course.durationMinutes / 60)} hours` : `${course.durationMinutes} min`,
    lessons: lessons.map((lesson) => ({
      ...lesson,
      progress: progressByLesson.get(lesson.id) ?? null
    })),
    assessment: assessments[0] ?? null,
    enrollment,
    certificate: certificateRows[0] ?? null,
    attempt: attemptRows[0] ?? null
  };
}

export async function getPassportPreviewForUser(userId: string): Promise<PassportPreviewData | null> {
  const [passport] = await db
    .select({
      id: impactPassports.id,
      publicSlug: impactPassports.publicSlug,
      visibility: impactPassports.visibility,
      displayName: profiles.displayName,
      heroLevel: profiles.heroLevel,
      xp: profiles.xp
    })
    .from(impactPassports)
    .innerJoin(profiles, eq(impactPassports.userId, profiles.userId))
    .where(eq(impactPassports.userId, userId))
    .limit(1);

  if (!passport) {
    return null;
  }

  return buildPassportPreview(passport.id, {
    displayName: passport.displayName,
    heroLevel: passport.heroLevel,
    xp: passport.xp,
    href: `/passport/${passport.publicSlug}`
  });
}

export async function getPublicPassport(publicSlug: string) {
  const [passport] = await db
    .select({
      id: impactPassports.id,
      publicSlug: impactPassports.publicSlug,
      visibility: impactPassports.visibility,
      story: impactPassports.story,
      userId: impactPassports.userId,
      displayName: profiles.displayName,
      location: profiles.location,
      bio: profiles.bio,
      heroLevel: profiles.heroLevel,
      xp: profiles.xp,
      isPublic: profiles.isPublic
    })
    .from(impactPassports)
    .innerJoin(profiles, eq(impactPassports.userId, profiles.userId))
    .where(eq(impactPassports.publicSlug, publicSlug))
    .limit(1);

  if (!passport || passport.visibility !== "public" || !passport.isPublic) {
    return null;
  }

  const [preview, items] = await Promise.all([
    buildPassportPreview(passport.id, {
      displayName: passport.displayName,
      heroLevel: passport.heroLevel,
      xp: passport.xp,
      href: `/passport/${passport.publicSlug}`
    }),
    db
      .select({
        itemType: impactPassportItems.itemType,
        title: impactPassportItems.title,
        description: impactPassportItems.description,
        evidenceUrl: impactPassportItems.evidenceUrl,
        occurredAt: impactPassportItems.occurredAt,
        metadata: impactPassportItems.metadata
      })
      .from(impactPassportItems)
      .where(eq(impactPassportItems.passportId, passport.id))
      .orderBy(desc(impactPassportItems.occurredAt))
  ]);

  return {
    ...passport,
    preview,
    items
  };
}

async function buildPassportPreview(
  passportId: string,
  profile: {
    displayName: string;
    heroLevel: number;
    xp: number;
    href: string;
  }
): Promise<PassportPreviewData> {
  const items = await db
    .select({
      itemType: impactPassportItems.itemType,
      title: impactPassportItems.title,
      description: impactPassportItems.description,
      occurredAt: impactPassportItems.occurredAt,
      metadata: impactPassportItems.metadata
    })
    .from(impactPassportItems)
    .where(eq(impactPassportItems.passportId, passportId))
    .orderBy(desc(impactPassportItems.occurredAt));

  const donationsCount = items.filter((item) => item.itemType === "donation").length;
  const fieldCount = items.filter((item) => item.itemType === "expedition").length;
  const certificateCount = items.filter((item) => item.itemType === "certificate").length;
  const coralCount = items.reduce((total, item) => total + getMetadataNumber(item.metadata, "fragments"), 0);
  const xpTarget = Math.max(1000, profile.heroLevel * 2500);

  return {
    displayName: profile.displayName,
    initials: initialsForName(profile.displayName),
    levelLabel: `Ocean Hero, Level ${profile.heroLevel}`,
    xp: profile.xp,
    xpTarget,
    href: profile.href,
    stats: [
      { label: "Donations", value: String(donationsCount) },
      { label: "Corals", value: String(coralCount) },
      { label: "Field activities", value: String(fieldCount) },
      { label: "Certificates", value: String(certificateCount) }
    ],
    latestActivity: items[0]
      ? {
          title: items[0].title,
          description: items[0].description ?? "Verified activity added to this Impact Passport."
        }
      : null
  };
}

export async function getDashboardData(userId: string) {
  const [profile, donationRows, ecosystemRows, bookingRows, enrollmentRows, certificateRows, passportPreview] =
    await Promise.all([
      db
        .select({
          displayName: profiles.displayName,
          heroLevel: profiles.heroLevel,
          xp: profiles.xp,
          publicSlug: impactPassports.publicSlug
        })
        .from(profiles)
        .leftJoin(impactPassports, eq(impactPassports.userId, profiles.userId))
        .where(eq(profiles.userId, userId))
        .limit(1),
      db
        .select({
          id: donations.id,
          campaignTitle: campaigns.title,
          amount: donations.amount,
          currency: donations.currency,
          status: donations.status,
          createdAt: donations.createdAt,
          receiptNumber: donationReceipts.receiptNumber
        })
        .from(donations)
        .innerJoin(campaigns, eq(donations.campaignId, campaigns.id))
        .leftJoin(donationReceipts, eq(donationReceipts.donationId, donations.id))
        .where(eq(donations.userId, userId))
        .orderBy(desc(donations.createdAt)),
      db
        .select({
          code: sponsoredEcosystems.code,
          label: sponsoredEcosystems.label,
          status: sponsoredEcosystems.status,
          metadata: sponsoredEcosystems.metadata,
          campaignTitle: campaigns.title,
          siteName: impactSites.name,
          lastUpdatedAt: sponsoredEcosystems.lastUpdatedAt
        })
        .from(sponsoredEcosystems)
        .innerJoin(campaigns, eq(sponsoredEcosystems.campaignId, campaigns.id))
        .leftJoin(impactSites, eq(sponsoredEcosystems.impactSiteId, impactSites.id))
        .where(eq(sponsoredEcosystems.userId, userId))
        .orderBy(desc(sponsoredEcosystems.lastUpdatedAt)),
      db
        .select({
          bookingCode: expeditionBookings.bookingCode,
          status: expeditionBookings.status,
          paymentStatus: expeditionBookings.paymentStatus,
          participantsCount: expeditionBookings.participantsCount,
          totalAmount: expeditionBookings.totalAmount,
          expeditionTitle: expeditions.title,
          startsAt: expeditionDepartures.startsAt
        })
        .from(expeditionBookings)
        .innerJoin(expeditions, eq(expeditionBookings.expeditionId, expeditions.id))
        .innerJoin(expeditionDepartures, eq(expeditionBookings.departureId, expeditionDepartures.id))
        .where(eq(expeditionBookings.userId, userId))
        .orderBy(desc(expeditionBookings.bookedAt)),
      db
        .select({
          courseTitle: courses.title,
          courseSlug: courses.slug,
          status: courseEnrollments.status,
          completedAt: courseEnrollments.completedAt
        })
        .from(courseEnrollments)
        .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
        .where(eq(courseEnrollments.userId, userId))
        .orderBy(desc(courseEnrollments.enrolledAt)),
      db
        .select({
          certificateNumber: courseCertificates.certificateNumber,
          publicSlug: courseCertificates.publicSlug,
          issuedAt: courseCertificates.issuedAt,
          courseTitle: courses.title
        })
        .from(courseCertificates)
        .innerJoin(courses, eq(courseCertificates.courseId, courses.id))
        .where(eq(courseCertificates.userId, userId))
        .orderBy(desc(courseCertificates.issuedAt)),
      getPassportPreviewForUser(userId)
    ]);

  const totalDonated = donationRows
    .filter((donation) => donation.status === "paid")
    .reduce((total, donation) => total + toNumber(donation.amount), 0);
  const coralFragments = ecosystemRows.reduce((total, ecosystem) => total + getMetadataNumber(ecosystem.metadata, "fragments"), 0);

  return {
    profile: profile[0] ?? null,
    summary: {
      totalDonated,
      coralFragments,
      fieldActivities: bookingRows.length,
      certificates: certificateRows.length
    },
    donations: donationRows,
    ecosystems: ecosystemRows,
    bookings: bookingRows,
    enrollments: enrollmentRows,
    certificates: certificateRows,
    passportPreview
  };
}

export async function getDonationCheckoutOptions() {
  return getCampaignCards();
}

export async function getExpeditionCheckoutOptions() {
  const rows = await db
    .select({
      expeditionId: expeditions.id,
      expeditionSlug: expeditions.slug,
      expeditionTitle: expeditions.title,
      basePrice: expeditions.basePrice,
      departureId: expeditionDepartures.id,
      startsAt: expeditionDepartures.startsAt,
      endsAt: expeditionDepartures.endsAt,
      capacity: expeditionDepartures.capacity,
      seatsBooked: expeditionDepartures.seatsBooked,
      status: expeditionDepartures.status
    })
    .from(expeditionDepartures)
    .innerJoin(expeditions, eq(expeditionDepartures.expeditionId, expeditions.id))
    .orderBy(asc(expeditionDepartures.startsAt));

  return rows.map((row) => ({
    ...row,
    basePrice: toNumber(row.basePrice),
    availableSeats: Math.max(0, row.capacity - row.seatsBooked)
  }));
}

export async function getCorporateDashboardData(userId: string) {
  const [program] = await db
    .select({
      accountName: corporateAccounts.name,
      accountId: corporateAccounts.id,
      programId: corporatePrograms.id,
      programName: corporatePrograms.name,
      startsAt: corporatePrograms.startsAt,
      endsAt: corporatePrograms.endsAt,
      budgetAmount: corporatePrograms.budgetAmount
    })
    .from(corporatePermissions)
    .innerJoin(corporateAccounts, eq(corporatePermissions.corporateAccountId, corporateAccounts.id))
    .innerJoin(corporatePrograms, eq(corporatePrograms.corporateAccountId, corporateAccounts.id))
    .where(eq(corporatePermissions.userId, userId))
    .limit(1);

  if (!program) {
    return null;
  }

  const [budgets, employees, portfolio, evidence, exports] = await Promise.all([
    db
      .select({
        category: corporateProgramBudgets.category,
        allocatedAmount: corporateProgramBudgets.allocatedAmount,
        spentAmount: corporateProgramBudgets.spentAmount
      })
      .from(corporateProgramBudgets)
      .where(eq(corporateProgramBudgets.programId, program.programId)),
    db
      .select({
        name: corporateEmployees.name,
        email: corporateEmployees.email,
        department: corporateEmployees.department,
        role: corporateEmployees.role,
        status: corporateEmployees.status
      })
      .from(corporateEmployees)
      .where(eq(corporateEmployees.corporateAccountId, program.accountId)),
    db
      .select({
        campaignTitle: campaigns.title,
        region: campaigns.region,
        allocationAmount: corporateProjectPortfolio.allocationAmount,
        status: corporateProjectPortfolio.status
      })
      .from(corporateProjectPortfolio)
      .innerJoin(campaigns, eq(corporateProjectPortfolio.campaignId, campaigns.id))
      .where(eq(corporateProjectPortfolio.programId, program.programId)),
    db
      .select({
        title: projectEvidence.title,
        evidenceType: projectEvidence.evidenceType,
        verificationStatus: projectEvidence.verificationStatus,
        fileUrl: projectEvidence.fileUrl,
        addedAt: corporateEvidenceCenter.addedAt
      })
      .from(corporateEvidenceCenter)
      .innerJoin(projectEvidence, eq(corporateEvidenceCenter.evidenceId, projectEvidence.id))
      .where(eq(corporateEvidenceCenter.programId, program.programId))
      .orderBy(desc(corporateEvidenceCenter.addedAt)),
    db
      .select({
        exportCode: corporateReportExports.exportCode,
        status: corporateReportExports.status,
        fileUrl: corporateReportExports.fileUrl,
        createdAt: corporateReportExports.createdAt
      })
      .from(corporateReportExports)
      .where(eq(corporateReportExports.programId, program.programId))
      .orderBy(desc(corporateReportExports.createdAt))
  ]);

  const totalAllocated = budgets.reduce((total, budget) => total + toNumber(budget.allocatedAmount), 0);
  const totalSpent = budgets.reduce((total, budget) => total + toNumber(budget.spentAmount), 0);
  const budgetUsed = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;

  return {
    program,
    budgets,
    employees,
    portfolio,
    evidence,
    exports,
    metrics: {
      budgetUsed,
      employeesEngaged: employees.filter((employee) => employee.status === "active").length,
      verifiedOutputs: evidence.filter((item) => item.verificationStatus === "verified").length,
      atRiskProjects: portfolio.filter((item) => item.status !== "funded" && item.status !== "monitoring").length
    }
  };
}

export async function getAdminPortalData() {
  const [campaignRows, evidenceRows, donationRows] = await Promise.all([
    db
      .select({
        title: campaigns.title,
        slug: campaigns.slug,
        status: campaigns.status,
        raisedAmount: campaigns.raisedAmount,
        goalAmount: campaigns.goalAmount,
        donorCount: campaigns.donorCount,
        partner: organizations.name
      })
      .from(campaigns)
      .innerJoin(organizations, eq(campaigns.organizationId, organizations.id))
      .orderBy(desc(campaigns.updatedAt)),
    db
      .select({
        id: projectEvidence.id,
        title: projectEvidence.title,
        evidenceCode: projectEvidence.evidenceCode,
        verificationStatus: projectEvidence.verificationStatus,
        campaignTitle: campaigns.title,
        createdAt: projectEvidence.createdAt
      })
      .from(projectEvidence)
      .innerJoin(campaigns, eq(projectEvidence.campaignId, campaigns.id))
      .orderBy(desc(projectEvidence.createdAt)),
    db
      .select({
        id: donations.id,
        donorName: donations.donorName,
        amount: donations.amount,
        status: donations.status,
        campaignTitle: campaigns.title,
        providerReference: paymentTransactions.providerReference
      })
      .from(donations)
      .innerJoin(campaigns, eq(donations.campaignId, campaigns.id))
      .leftJoin(paymentTransactions, eq(paymentTransactions.donationId, donations.id))
      .orderBy(desc(donations.createdAt))
  ]);

  return {
    campaigns: campaignRows,
    evidence: evidenceRows,
    donations: donationRows
  };
}

export async function getPartnerPortalData() {
  const [campaignRows, evidenceRows, updateRows] = await Promise.all([
    db
      .select({
        id: campaigns.id,
        title: campaigns.title,
        slug: campaigns.slug,
        region: campaigns.region,
        status: campaigns.status,
        raisedAmount: campaigns.raisedAmount,
        goalAmount: campaigns.goalAmount
      })
      .from(campaigns)
      .orderBy(desc(campaigns.updatedAt)),
    db
      .select({
        title: projectEvidence.title,
        evidenceCode: projectEvidence.evidenceCode,
        verificationStatus: projectEvidence.verificationStatus,
        campaignTitle: campaigns.title,
        fileUrl: projectEvidence.fileUrl
      })
      .from(projectEvidence)
      .innerJoin(campaigns, eq(projectEvidence.campaignId, campaigns.id))
      .orderBy(desc(projectEvidence.createdAt)),
    db
      .select({
        title: campaignUpdates.title,
        campaignTitle: campaigns.title,
        publishedAt: campaignUpdates.publishedAt
      })
      .from(campaignUpdates)
      .innerJoin(campaigns, eq(campaignUpdates.campaignId, campaigns.id))
      .orderBy(desc(campaignUpdates.publishedAt))
  ]);

  return {
    campaigns: campaignRows,
    evidence: evidenceRows,
    updates: updateRows
  };
}
