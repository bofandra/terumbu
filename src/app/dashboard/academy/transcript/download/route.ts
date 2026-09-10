import { academyTranscriptFilename, buildAcademyTranscriptCsv } from "@/lib/academy-transcript";
import { getAcademyTranscriptData } from "@/lib/academy-transcript-data";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function transcriptOrigin(request: Request) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  return configuredUrl ? configuredUrl.replace(/\/+$/, "") : new URL(request.url).origin;
}

export async function GET(request: Request) {
  const user = await requireUser("/dashboard/academy");
  const transcript = await getAcademyTranscriptData(user.id);

  return new Response(buildAcademyTranscriptCsv(transcript, transcriptOrigin(request)), {
    headers: {
      "Content-Disposition": `attachment; filename="${academyTranscriptFilename(transcript)}"`,
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "private, no-store"
    }
  });
}
