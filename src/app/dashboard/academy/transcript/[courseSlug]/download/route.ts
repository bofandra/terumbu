import { notFound } from "next/navigation";

import { academyCourseTranscriptFilename, buildAcademyCourseTranscriptPdf } from "@/lib/academy-transcript";
import { getAcademyTranscriptData } from "@/lib/academy-transcript-data";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function transcriptOrigin(request: Request) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  return configuredUrl ? configuredUrl.replace(/\/+$/, "") : new URL(request.url).origin;
}

export async function GET(request: Request, { params }: { params: Promise<{ courseSlug: string }> }) {
  const user = await requireUser("/dashboard/academy");
  const { courseSlug } = await params;
  const transcript = await getAcademyTranscriptData(user.id);
  const course = transcript.courses.find((item) => item.courseSlug === courseSlug);

  if (!course) {
    notFound();
  }

  return new Response(buildAcademyCourseTranscriptPdf(transcript, course, transcriptOrigin(request)), {
    headers: {
      "Content-Disposition": `attachment; filename="${academyCourseTranscriptFilename(transcript, course)}"`,
      "Content-Type": "application/pdf",
      "Cache-Control": "private, no-store"
    }
  });
}
