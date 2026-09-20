import { eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { platformSettings } from "@/db/schema";
import { CARBON_SETTING_KEY, parseCarbonKgPerUsd } from "@/lib/impact-calculations";

function settingRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export async function getCarbonKgPerUsd(database: typeof db = db) {
  const [setting] = await database
    .select({
      value: platformSettings.value
    })
    .from(platformSettings)
    .where(eq(platformSettings.key, CARBON_SETTING_KEY))
    .limit(1);

  return parseCarbonKgPerUsd(settingRecord(setting?.value).kgCo2ePerUsd);
}

export async function upsertCarbonKgPerUsd(input: {
  value: number | null;
  updatedByUserId?: string | null;
  database?: typeof db;
  now?: Date;
}) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();

  await database
    .insert(platformSettings)
    .values({
      key: CARBON_SETTING_KEY,
      value: input.value == null ? null : { kgCo2ePerUsd: input.value },
      updatedByUserId: input.updatedByUserId ?? null,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: {
        value: sql`excluded.value`,
        updatedByUserId: input.updatedByUserId ?? null,
        updatedAt: now
      }
    });
}


export const PLATFORM_DELIVERY_SETTING_KEY = "platform_delivery_settings";

export type PlatformDeliverySettings = {
  campaignUpdates: boolean;
  evidenceAlerts: boolean;
  expeditionReminders: boolean;
  academyUpdates: boolean;
  monthlyImpactReport: boolean;
  monthlyImpactEmail: boolean;
};

export const defaultPlatformDeliverySettings: PlatformDeliverySettings = {
  campaignUpdates: true,
  evidenceAlerts: true,
  expeditionReminders: true,
  academyUpdates: true,
  monthlyImpactReport: true,
  monthlyImpactEmail: false
};

function booleanSetting(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export async function getPlatformDeliverySettings(database: typeof db = db): Promise<PlatformDeliverySettings> {
  const [setting] = await database
    .select({ value: platformSettings.value })
    .from(platformSettings)
    .where(eq(platformSettings.key, PLATFORM_DELIVERY_SETTING_KEY))
    .limit(1);

  const record = settingRecord(setting?.value);

  return {
    campaignUpdates: booleanSetting(record.campaignUpdates, defaultPlatformDeliverySettings.campaignUpdates),
    evidenceAlerts: booleanSetting(record.evidenceAlerts, defaultPlatformDeliverySettings.evidenceAlerts),
    expeditionReminders: booleanSetting(record.expeditionReminders, defaultPlatformDeliverySettings.expeditionReminders),
    academyUpdates: booleanSetting(record.academyUpdates, defaultPlatformDeliverySettings.academyUpdates),
    monthlyImpactReport: booleanSetting(record.monthlyImpactReport, defaultPlatformDeliverySettings.monthlyImpactReport),
    monthlyImpactEmail: booleanSetting(record.monthlyImpactEmail, defaultPlatformDeliverySettings.monthlyImpactEmail)
  };
}

export async function upsertPlatformDeliverySettings(input: {
  settings: PlatformDeliverySettings;
  updatedByUserId?: string | null;
  database?: typeof db;
  now?: Date;
}) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();

  await database
    .insert(platformSettings)
    .values({
      key: PLATFORM_DELIVERY_SETTING_KEY,
      value: input.settings,
      updatedByUserId: input.updatedByUserId ?? null,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: {
        value: sql`excluded.value`,
        updatedByUserId: input.updatedByUserId ?? null,
        updatedAt: now
      }
    });
}
