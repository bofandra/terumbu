"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
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
import { requireUser, safeRedirectPath } from "@/lib/auth";
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
  const relevantCampaignIds = Array.from(new Set([...donationRows.map((row) => row.campaignId), ...followRows.map((row) => row.campaignId)]));
  const [updateSummary, evidenceSummary] =
    relevantCampaignIds.length > 0
      ? await Promise.all([
          db
            .select({ total: sql<number>`count(${campaignUpdates.id})` })
            .from(campaignUpdates)
            .where(and(inArray(campaignUpdates.campaignId, relevantCampaignIds), sql`${campaignUpdates.createdAt} >= ${start}`, sql`${campaignUpdates.createdAt} < ${end}`)),
          db
            .select({ total: sql<number>`count(${projectEvidence.id})` })
            .from(projectEvidence)
            .where(and(inArray(projectEvidence.campaignId, relevantCampaignIds), sql`${projectEvidence.createdAt} >= ${start}`, sql`${projectEvidence.createdAt} < ${end}`))
        ])
      : [[{ total: 0 }], [{ total: 0 }]];

  return {
    userEmail: userRow?.email ?? "",
    userName: userRow?.name ?? "Ocean Hero",
    reportMonth,
    label: `${fullMonthLabel(now)} Impact Report`,
    contributions: donationRows.filter((donation) => donation.createdAt >= start && donation.createdAt < end).reduce((total, donation) => total + toNumber(donation.amount), 0),
    campaignUpdates: Number(updateSummary[0]?.total ?? 0),
    newEvidence: Number(evidenceSummary[0]?.total ?? 0),
    coralsMonitored: ecosystemRows
      .filter((ecosystem) => ecosystem.lastUpdatedAt && ecosystem.lastUpdatedAt >= start && ecosystem.lastUpdatedAt < end)
      .reduce((total, ecosystem) => total + getMetadataNumber(ecosystem.metadata, "fragments"), 0),
    academyProgress: enrollmentRows.filter((enrollment) => enrollment.completedAt && enrollment.completedAt >= start && enrollment.completedAt < end).length
  };
}

async function upsertMonthlyImpactReport(userId: string) {
  const now = new Date();
  const report = await buildMonthlyImpactReport(userId, now);
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
      metadata: {
        generatedBy: "dashboard_action"
      },
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
  const report = await upsertMonthlyImpactReport(user.id);
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
