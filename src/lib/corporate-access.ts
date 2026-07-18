import { redirect } from "next/navigation";

import { forbiddenRedirectPath } from "@/lib/account-destinations";
import { getCorporateDashboardData } from "@/lib/queries";

export type CorporateDashboardData = NonNullable<Awaited<ReturnType<typeof getCorporateDashboardData>>>;

export async function requireCorporateDashboardData(userId: string, nextPath = "/corporate", programId?: string | null): Promise<CorporateDashboardData> {
  const data = await getCorporateDashboardData(userId, programId);

  if (!data) {
    redirect(forbiddenRedirectPath(nextPath));
  }

  return data;
}
