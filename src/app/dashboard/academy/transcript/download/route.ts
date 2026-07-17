import { academyTranscriptFilename, buildAcademyTranscriptCsv } from "@/lib/academy-transcript";
import { getAcademyTranscriptData } from "@/lib/academy-transcript-data";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://terumbu.eco";

export async function GET() {
  const user = await requireUser("/dashboard/academy");
  const transcript = await getAcademyTranscriptData(user.id);

  return new Response(buildAcademyTranscriptCsv(transcript, appUrl), {
    headers: {
      "Content-Disposition": `attachment; filename="${academyTranscriptFilename(transcript)}"`,
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "private, no-store"
    }
  });
}
