import { NextResponse } from "next/server";

import {
  publicR2ObjectUrl,
  r2StorageConfiguration
} from "@/lib/r2-storage";

export const dynamic = "force-dynamic";

function validPublicMediaKey(parts: string[]) {
  return (
    parts.length >= 5 &&
    parts[0] === "public-media" &&
    parts.every((part) => /^[A-Za-z0-9._-]+$/.test(part) && part !== "." && part !== "..")
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string[] }> }
) {
  const { key } = await context.params;

  if (!validPublicMediaKey(key)) {
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }

  const configuration = r2StorageConfiguration();

  if (configuration.status !== "configured") {
    return NextResponse.json({ error: "Media storage is unavailable." }, { status: 503 });
  }

  const objectUrl = publicR2ObjectUrl(configuration.config, key.join("/"));
  const response = NextResponse.redirect(objectUrl, 307);
  response.headers.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  return response;
}
