import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { buildMonthlyImpactReportDownloadHtml, monthlyImpactReportFilename } from "@/lib/monthly-impact-report";
import { getMonthlyImpactReportDownload } from "@/lib/queries";

export const dynamic = "force-dynamic";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://terumbu.eco";

export async function GET(_request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const user = await requireUser("/dashboard");
  const { reportId } = await params;
  const report = await getMonthlyImpactReportDownload(reportId, user.id);

  if (!report) {
    notFound();
  }

  return new Response(buildMonthlyImpactReportDownloadHtml(report, appUrl), {
    headers: {
      "Content-Disposition": `attachment; filename="${monthlyImpactReportFilename(report)}"`,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store"
    }
  });
}
