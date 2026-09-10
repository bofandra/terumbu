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
