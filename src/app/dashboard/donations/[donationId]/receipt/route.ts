import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db/client";
import { campaigns, donationReceipts, donations, organizations } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { buildDonationReceiptDownloadHtml, donationReceiptFilename } from "@/lib/donation-receipt";

export const dynamic = "force-dynamic";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://terumbu.eco";

export async function GET(_request: Request, { params }: { params: Promise<{ donationId: string }> }) {
  const user = await requireUser("/dashboard/donations");
  const { donationId } = await params;
  const [receipt] = await db
    .select({
      donationId: donations.id,
      receiptNumber: donationReceipts.receiptNumber,
      issuedAt: donationReceipts.issuedAt,
      emailedAt: donationReceipts.emailedAt,
      payload: donationReceipts.payload,
      donorName: donations.donorName,
      donorEmail: donations.donorEmail,
      amount: donations.amount,
      currency: donations.currency,
      status: donations.status,
      createdAt: donations.createdAt,
      campaignTitle: campaigns.title,
      campaignSlug: campaigns.slug,
      organizationName: organizations.name
    })
    .from(donations)
    .innerJoin(campaigns, eq(donations.campaignId, campaigns.id))
    .innerJoin(organizations, eq(campaigns.organizationId, organizations.id))
    .innerJoin(donationReceipts, eq(donationReceipts.donationId, donations.id))
    .where(and(eq(donations.id, donationId), eq(donations.userId, user.id), eq(donations.status, "paid")))
    .limit(1);

  if (!receipt) {
    notFound();
  }

  return new Response(buildDonationReceiptDownloadHtml(receipt, appUrl), {
    headers: {
      "Content-Disposition": `attachment; filename="${donationReceiptFilename(receipt)}"`,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store"
    }
  });
}
