import {
  r2CredentialsConfiguration,
  signedR2GetRequest
} from "@/lib/r2-storage";

export function metadataObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function metadataString(value: unknown, key: string) {
  const candidate = metadataObject(value)[key];
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
}

export function validPrivateObjectKey(value: string | null, namespace: string) {
  return Boolean(value && value.startsWith(`private-media/${namespace}/`) && !value.includes(".."));
}

export async function privateR2ObjectResponse(input: {
  objectKey: string;
  contentType?: string | null;
}) {
  const configuration = r2CredentialsConfiguration();

  if (configuration.status !== "configured") {
    return Response.json({ error: "Private media storage is unavailable." }, { status: 503 });
  }

  const signed = signedR2GetRequest(configuration.config, {
    objectKey: input.objectKey
  });
  const upstream = await fetch(signed.url, {
    method: "GET",
    headers: signed.headers,
    cache: "no-store"
  });

  if (upstream.status === 404) {
    return Response.json({ error: "Media not found." }, { status: 404 });
  }

  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: "Media could not be loaded." }, { status: 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Type": input.contentType || upstream.headers.get("content-type") || "application/octet-stream",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
