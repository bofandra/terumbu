"use server";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  adminAuditLogs,
  campaignFollowSubscriptions,
  campaignUpdates,
  campaigns,
  courseEnrollments,
  donations,
  monthlyImpactReports,
  notificationPreferences,
  projectEvidence,
  sponsoredEcosystems,
  userNotifications,
  userSavedCampaigns,
  users
} from "@/db/schema";
import { requireRole, requireUser, safeRedirectPath } from "@/lib/auth";
import { getMetadataNumber, toNumber } from "@/lib/domain";
import { sendTransactionalEmail } from "@/lib/email";

function returnPath(formData: FormData, fallback: string) {
  return safeRedirectPath(formData.get("next") ?? fallback);
}

function monthKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function fullMonthLabel(value: Date) {
  return value.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

function monthRange(value: Date) {
  const start = new Date(value.getFullYear(), value.getMonth(), 1);
  const end = new Date(value.getFullYear(), value.getMonth() + 1, 1);

  return { start, end };
}

async function campaignBySlug(slug: string) {
  const [campaign] = await db.select({ id: campaigns.id, title: campaigns.title, slug: campaigns.slug }).from(campaigns).where(eq(campaigns.slug, slug)).limit(1);

  return campaign ?? null;
}

async function createNotification(input: {
  userId: string;
  notificationCode: string;
  category: string;
  title: string;
  message: string;
  href: string;
  sourceType?: string | null;
  sourceId?: string | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();

  await db
    .insert(userNotifications)
    .values({
      userId: input.userId,
      notificationCode: input.notificationCode,
      category: input.category,
      title: input.title,
      message: input.message,
      href: input.href,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      createdAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: [userNotifications.userId, userNotifications.notificationCode],
      set: {
        category: input.category,
        title: input.title,
        message: input.message,
        href: input.href,
        sourceType: input.sourceType ?? null,
        sourceId: input.sourceId ?? null,
        updatedAt: now
      }
    });
}

export async function saveCampaignAction(formData: FormData) {
  const user = await requireUser("/campaigns");
  const slug = String(formData.get("campaignSlug") ?? "");
  const next = returnPath(formData, slug ? `/campaigns/${slug}` : "/campaigns");
  const campaign = await campaignBySlug(slug);

  if (!campaign) {
    redirect(`${next}?error=campaign`);
  }

  const now = new Date();

  await db
    .insert(userSavedCampaigns)
    .values({
      userId: user.id,
      campaignId: campaign.id,
      status: "active",
      savedAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: [userSavedCampaigns.userId, userSavedCampaigns.campaignId],
      set: {
        status: "active",
        updatedAt: now
      }
    });

  await createNotification({
    userId: user.id,
    notificationCode: `saved-${campaign.id}`,
    category: "Saved projects",
    title: campaign.title,
    message: `${campaign.title} was saved to your dashboard.`,
    href: "/dashboard/saved",
    sourceType: "campaign",
    sourceId: campaign.id,
    now
  });

  redirect(`${next}?saved=project`);
}

export async function removeSavedCampaignAction(formData: FormData) {
  const user = await requireUser("/dashboard/saved");
  const slug = String(formData.get("campaignSlug") ?? "");
  const next = returnPath(formData, "/dashboard/saved");
  const campaign = await campaignBySlug(slug);

  if (!campaign) {
    redirect(`${next}?error=campaign`);
  }

  await db
    .update(userSavedCampaigns)
    .set({
      status: "removed",
      updatedAt: new Date()
    })
    .where(and(eq(userSavedCampaigns.userId, user.id), eq(userSavedCampaigns.campaignId, campaign.id)));

  redirect(`${next}?saved=project`);
}

export async function followCampaignAction(formData: FormData) {
  const user = await requireUser("/campaigns");
  const slug = String(formData.get("campaignSlug") ?? "");
  const frequency = String(formData.get("frequency") ?? "weekly");
  const safeFrequency = ["instant", "weekly", "monthly"].includes(frequency) ? frequency : "weekly";
  const next = returnPath(formData, slug ? `/campaigns/${slug}` : "/campaigns");
  const campaign = await campaignBySlug(slug);

  if (!campaign) {
    redirect(`${next}?error=campaign`);
  }

  const now = new Date();

  await db
    .insert(campaignFollowSubscriptions)
    .values({
      userId: user.id,
      campaignId: campaign.id,
      email: user.email,
      status: "active",
      frequency: safeFrequency,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: [campaignFollowSubscriptions.userId, campaignFollowSubscriptions.campaignId],
      set: {
        email: user.email,
        status: "active",
        frequency: safeFrequency,
        updatedAt: now
      }
    });

  await createNotification({
    userId: user.id,
    notificationCode: `follow-${campaign.id}`,
    category: "Followed campaigns",
    title: campaign.title,
    message: `You will receive ${safeFrequency} updates for ${campaign.title}.`,
    href: "/dashboard/saved",
    sourceType: "campaign",
    sourceId: campaign.id,
    now
  });

  redirect(`${next}?saved=follow`);
}

export async function unfollowCampaignAction(formData: FormData) {
  const user = await requireUser("/dashboard/saved");
  const slug = String(formData.get("campaignSlug") ?? "");
  const next = returnPath(formData, "/dashboard/saved");
  const campaign = await campaignBySlug(slug);

  if (!campaign) {
    redirect(`${next}?error=campaign`);
  }

  await db
    .update(campaignFollowSubscriptions)
    .set({
      status: "unsubscribed",
      updatedAt: new Date()
    })
    .where(and(eq(campaignFollowSubscriptions.userId, user.id), eq(campaignFollowSubscriptions.campaignId, campaign.id)));

  redirect(`${next}?saved=follow`);
}

export async function updateNotificationPreferencesAction(formData: FormData) {
  const user = await requireUser("/dashboard/settings");
  const now = new Date();
  const values = {
    campaignUpdates: formData.get("campaignUpdates") === "on",
    evidenceAlerts: formData.get("evidenceAlerts") === "on",
    expeditionReminders: formData.get("expeditionReminders") === "on",
    academyUpdates: formData.get("academyUpdates") === "on",
    monthlyImpactEmail: formData.get("monthlyImpactEmail") === "on",
    monthlyImpactReport: formData.get("monthlyImpactReport") === "on"
  };

  await db
    .insert(notificationPreferences)
    .values({
      userId: user.id,
      ...values,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: notificationPreferences.userId,
      set: {
        ...values,
        updatedAt: now
      }
    });

  redirect("/dashboard/settings?saved=notifications#notifications");
}

export async function markNotificationReadAction(formData: FormData) {
  const user = await requireUser("/dashboard");
  const notificationId = String(formData.get("notificationId") ?? "");
  const next = returnPath(formData, "/dashboard#notifications");

  await db
    .update(userNotifications)
    .set({
      readAt: new Date(),
      updatedAt: new Date()
    })
    .where(and(eq(userNotifications.id, notificationId), eq(userNotifications.userId, user.id)));

  redirect(next);
}

export async function markAllNotificationsReadAction(formData: FormData) {
  const user = await requireUser("/dashboard");
  const next = returnPath(formData, "/dashboard#notifications");

  await db
    .update(userNotifications)
    .set({
      readAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(userNotifications.userId, user.id));

  redirect(next);
}

async function buildMonthlyImpactReport(userId: string, now = new Date()) {
  const { start, end } = monthRange(now);
  const reportMonth = monthKey(now);
  const [userRow] = await db.select({ email: users.email, name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
  const [donationRows, followRows, ecosystemRows, enrollmentRows] = await Promise.all([
    db
      .select({ campaignId: donations.campaignId, amount: donations.amount, createdAt: donations.createdAt })
      .from(donations)
      .where(and(eq(donations.userId, userId), eq(donations.status, "paid"))),
    db
      .select({ campaignId: campaignFollowSubscriptions.campaignId })
      .from(campaignFollowSubscriptions)
      .where(and(eq(campaignFollowSubscriptions.userId, userId), eq(campaignFollowSubscriptions.status, "active"))),
    db
      .select({ metadata: sponsoredEcosystems.metadata, lastUpdatedAt: sponsoredEcosystems.lastUpdatedAt })
      .from(sponsoredEcosystems)
      .where(eq(sponsoredEcosystems.userId, userId)),
    db
      .select({ completedAt: courseEnrollments.completedAt })
      .from(courseEnrollments)
      .where(eq(courseEnrollments.userId, userId))
  ]);
  const followedCampaignIds = Array.from(new Set(followRows.map((row) => row.campaignId)));
  const supportedCampaignIds = Array.from(new Set(donationRows.map((row) => row.campaignId)));
  const relevantCampaignIds = Array.from(new Set([...supportedCampaignIds, ...followedCampaignIds]));
  const [campaignRows, updateRows, evidenceRows] =
    relevantCampaignIds.length > 0
      ? await Promise.all([
          db
            .select({
              id: campaigns.id,
              title: campaigns.title,
              slug: campaigns.slug
            })
            .from(campaigns)
            .where(inArray(campaigns.id, relevantCampaignIds)),
          db
            .select({
              id: campaignUpdates.id,
              campaignId: campaignUpdates.campaignId,
              campaignTitle: campaigns.title,
              campaignSlug: campaigns.slug,
              title: campaignUpdates.title,
              publishedAt: campaignUpdates.publishedAt,
              createdAt: campaignUpdates.createdAt
            })
            .from(campaignUpdates)
            .innerJoin(campaigns, eq(campaignUpdates.campaignId, campaigns.id))
            .where(
              and(
                inArray(campaignUpdates.campaignId, relevantCampaignIds),
                sql`coalesce(${campaignUpdates.publishedAt}, ${campaignUpdates.createdAt}) >= ${start}`,
                sql`coalesce(${campaignUpdates.publishedAt}, ${campaignUpdates.createdAt}) < ${end}`
              )
            )
            .orderBy(desc(campaignUpdates.publishedAt), desc(campaignUpdates.createdAt)),
          db
            .select({
              id: projectEvidence.id,
              campaignId: projectEvidence.campaignId,
              title: projectEvidence.title,
              evidenceCode: projectEvidence.evidenceCode,
              verificationStatus: projectEvidence.verificationStatus,
              createdAt: projectEvidence.createdAt
            })
            .from(projectEvidence)
            .where(and(inArray(projectEvidence.campaignId, relevantCampaignIds), sql`${projectEvidence.createdAt} >= ${start}`, sql`${projectEvidence.createdAt} < ${end}`))
        ])
      : [[], [], []];
  const monthlyDonations = donationRows.filter((donation) => donation.createdAt >= start && donation.createdAt < end);
  const contributionByCampaign = monthlyDonations.reduce((totals, donation) => {
    totals.set(donation.campaignId, (totals.get(donation.campaignId) ?? 0) + toNumber(donation.amount));
    return totals;
  }, new Map<string, number>());
  const updateCountByCampaign = updateRows.reduce((totals, update) => {
    totals.set(update.campaignId, (totals.get(update.campaignId) ?? 0) + 1);
    return totals;
  }, new Map<string, number>());
  const evidenceCountByCampaign = evidenceRows.reduce((totals, evidence) => {
    totals.set(evidence.campaignId, (totals.get(evidence.campaignId) ?? 0) + 1);
    return totals;
  }, new Map<string, number>());
  const followedCampaignSet = new Set(followedCampaignIds);
  const campaignDigest = campaignRows
    .map((campaign) => ({
      id: campaign.id,
      title: campaign.title,
      slug: campaign.slug,
      followed: followedCampaignSet.has(campaign.id),
      contribution: contributionByCampaign.get(campaign.id) ?? 0,
      updateCount: updateCountByCampaign.get(campaign.id) ?? 0,
      evidenceCount: evidenceCountByCampaign.get(campaign.id) ?? 0
    }))
    .filter((campaign) => campaign.followed || campaign.contribution > 0 || campaign.updateCount > 0 || campaign.evidenceCount > 0)
    .sort((a, b) => b.updateCount + b.evidenceCount + b.contribution - (a.updateCount + a.evidenceCount + a.contribution));

  return {
    userEmail: userRow?.email ?? "",
    userName: userRow?.name ?? "Ocean Hero",
    reportMonth,
    label: `${fullMonthLabel(now)} Impact Report`,
    contributions: monthlyDonations.reduce((total, donation) => total + toNumber(donation.amount), 0),
    campaignUpdates: updateRows.length,
    newEvidence: evidenceRows.length,
    coralsMonitored: ecosystemRows
      .filter((ecosystem) => ecosystem.lastUpdatedAt && ecosystem.lastUpdatedAt >= start && ecosystem.lastUpdatedAt < end)
      .reduce((total, ecosystem) => total + getMetadataNumber(ecosystem.metadata, "fragments"), 0),
    academyProgress: enrollmentRows.filter((enrollment) => enrollment.completedAt && enrollment.completedAt >= start && enrollment.completedAt < end).length,
    metadata: {
      sourceCampaignIds: relevantCampaignIds,
      supportedCampaignIds,
      followedCampaignIds,
      followedCampaignCount: followedCampaignIds.length,
      campaignCount: campaignDigest.length,
      campaignDigest,
      latestUpdates: updateRows.slice(0, 5).map((update) => ({
        id: update.id,
        title: update.title,
        campaignTitle: update.campaignTitle,
        campaignSlug: update.campaignSlug,
        publishedAt: (update.publishedAt ?? update.createdAt).toISOString()
      })),
      newEvidence: evidenceRows.slice(0, 5).map((evidence) => ({
        id: evidence.id,
        title: evidence.title,
        evidenceCode: evidence.evidenceCode,
        verificationStatus: evidence.verificationStatus,
        createdAt: evidence.createdAt.toISOString()
      }))
    }
  };
}

async function upsertMonthlyImpactReport(
  userId: string,
  options: {
    now?: Date;
    source?: "dashboard_action" | "email_action" | "admin_run";
  } = {}
) {
  const now = options.now ?? new Date();
  const report = await buildMonthlyImpactReport(userId, now);
  const metadata = {
    ...report.metadata,
    generatedBy: options.source ?? "dashboard_action",
    generatedAt: now.toISOString()
  };
  const [savedReport] = await db
    .insert(monthlyImpactReports)
    .values({
      userId,
      reportMonth: report.reportMonth,
      label: report.label,
      contributions: report.contributions.toFixed(2),
      campaignUpdates: report.campaignUpdates,
      newEvidence: report.newEvidence,
      coralsMonitored: report.coralsMonitored,
      academyProgress: report.academyProgress,
      status: "ready",
      metadata,
      generatedAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: [monthlyImpactReports.userId, monthlyImpactReports.reportMonth],
      set: {
        label: report.label,
        contributions: report.contributions.toFixed(2),
        campaignUpdates: report.campaignUpdates,
        newEvidence: report.newEvidence,
        coralsMonitored: report.coralsMonitored,
        academyProgress: report.academyProgress,
        status: "ready",
        metadata,
        generatedAt: now,
        updatedAt: now
      }
    })
    .returning({ id: monthlyImpactReports.id });

  await createNotification({
    userId,
    notificationCode: `monthly-report-${report.reportMonth}`,
    category: "Monthly report",
    title: report.label,
    message: `${report.label} is ready in your dashboard.`,
    href: "/dashboard#monthly-report",
    sourceType: "monthly_impact_report",
    sourceId: savedReport.id,
    now
  });

  return { ...report, id: savedReport.id };
}

export async function generateMonthlyImpactReportAction() {
  const user = await requireUser("/dashboard");

  await upsertMonthlyImpactReport(user.id);

  redirect("/dashboard?saved=monthly-report#monthly-report");
}

export async function emailMonthlyImpactReportAction() {
  const user = await requireUser("/dashboard");
  const report = await upsertMonthlyImpactReport(user.id, { source: "email_action" });
  const now = new Date();

  await sendTransactionalEmail({
    userId: user.id,
    recipientEmail: report.userEmail || user.email,
    subject: `${report.label} from Terumbu.eco`,
    template: "monthly_impact_report",
    payload: {
      name: report.userName,
      reportMonth: report.reportMonth,
      contributions: report.contributions,
      campaignUpdates: report.campaignUpdates,
      newEvidence: report.newEvidence,
      coralsMonitored: report.coralsMonitored,
      academyProgress: report.academyProgress
    }
  });

  await db
    .update(monthlyImpactReports)
    .set({
      emailedAt: now,
      updatedAt: now
    })
    .where(and(eq(monthlyImpactReports.id, report.id), eq(monthlyImpactReports.userId, user.id)));

  redirect("/dashboard?saved=monthly-email#monthly-report");
}

export async function runMonthlyImpactReportCycleAction(formData: FormData) {
  const admin = await requireRole(["admin"], "/admin/reports");
  const sendEmail = formData.get("sendEmail") === "on";
  const now = new Date();
  const eligibleUsers = await db
    .select({
      userId: users.id,
      email: users.email,
      monthlyImpactEmail: notificationPreferences.monthlyImpactEmail
    })
    .from(notificationPreferences)
    .innerJoin(users, eq(notificationPreferences.userId, users.id))
    .where(eq(notificationPreferences.monthlyImpactReport, true));
  let generatedCount = 0;
  let emailedCount = 0;

  for (const eligibleUser of eligibleUsers) {
    const report = await upsertMonthlyImpactReport(eligibleUser.userId, {
      now,
      source: "admin_run"
    });
    generatedCount += 1;

    if (sendEmail && eligibleUser.monthlyImpactEmail) {
      await sendTransactionalEmail({
        userId: eligibleUser.userId,
        recipientEmail: report.userEmail || eligibleUser.email,
        subject: `${report.label} from Terumbu.eco`,
        template: "monthly_impact_report",
        payload: {
          name: report.userName,
          reportMonth: report.reportMonth,
          contributions: report.contributions,
          campaignUpdates: report.campaignUpdates,
          newEvidence: report.newEvidence,
          coralsMonitored: report.coralsMonitored,
          academyProgress: report.academyProgress,
          generatedBy: "admin_run"
        }
      });

      await db
        .update(monthlyImpactReports)
        .set({
          emailedAt: now,
          updatedAt: now
        })
        .where(and(eq(monthlyImpactReports.id, report.id), eq(monthlyImpactReports.userId, eligibleUser.userId)));
      emailedCount += 1;
    }
  }

  await db.insert(adminAuditLogs).values({
    actorUserId: admin.id,
    action: "retention.monthly_report_cycle.run",
    entityType: "monthly_impact_report",
    metadata: {
      generatedCount,
      emailedCount,
      sendEmail,
      eligibleUserCount: eligibleUsers.length
    }
  });

  redirect(`/admin/reports?saved=monthly-run&generated=${generatedCount}&emailed=${emailedCount}#monthly-impact-reports`);
}
