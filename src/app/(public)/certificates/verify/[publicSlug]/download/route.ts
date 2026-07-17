import { notFound } from "next/navigation";

import { buildCertificateDownloadHtml, certificateDownloadFilename } from "@/lib/certificate-verification";
import { getCertificateVerification } from "@/lib/queries";

export const dynamic = "force-dynamic";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://terumbu.eco";

export async function GET(_request: Request, { params }: { params: Promise<{ publicSlug: string }> }) {
  const { publicSlug } = await params;
  const certificate = await getCertificateVerification(publicSlug);

  if (!certificate) {
    notFound();
  }

  return new Response(buildCertificateDownloadHtml(certificate, appUrl), {
    headers: {
      "Content-Disposition": `attachment; filename="${certificateDownloadFilename(certificate)}"`,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store"
    }
  });
}
