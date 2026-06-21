"use server";

import { randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { corporatePermissions, corporatePrograms, corporateReportExports } from "@/db/schema";
import { requireUser } from "@/lib/auth";

function exportCode() {
  return `TRB-ESG-${new Date().getUTCFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function createCorporateReportExportAction() {
  const user = await requireUser("/corporate/dashboard");

  const [program] = await db
    .select({
      programId: corporatePrograms.id
    })
    .from(corporatePermissions)
    .innerJoin(corporatePrograms, eq(corporatePrograms.corporateAccountId, corporatePermissions.corporateAccountId))
    .where(eq(corporatePermissions.userId, user.id))
    .limit(1);

  if (!program) {
    redirect("/corporate/dashboard?error=program");
  }

  await db.insert(corporateReportExports).values({
    programId: program.programId,
    requestedByUserId: user.id,
    exportCode: exportCode(),
    status: "queued"
  });

  redirect("/corporate/reports?saved=export");
}
