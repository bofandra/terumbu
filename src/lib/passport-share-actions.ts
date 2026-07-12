"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { passportShareAccessCookieName } from "@/lib/passport-sharing";
import { getPassportShareUnlock } from "@/lib/queries";
import { shouldUseSecureSessionCookie } from "@/lib/session-cookie";

function passportPath(publicSlug: string, token: string | null, error?: string) {
  const params = new URLSearchParams();

  if (token) {
    params.set("token", token);
  }

  if (error) {
    params.set("error", error);
  }

  const query = params.toString();

  return `/passport/${publicSlug}${query ? `?${query}` : ""}`;
}

export async function unlockPassportShareAction(formData: FormData) {
  const publicSlug = String(formData.get("publicSlug") ?? "")
    .trim()
    .replace(/[^a-z0-9_-]/gi, "");
  const token = String(formData.get("token") ?? "").trim() || null;
  const accessCode = String(formData.get("accessCode") ?? "").trim();

  if (!publicSlug || !accessCode) {
    redirect("/passport");
  }

  const unlock = await getPassportShareUnlock({
    publicSlug,
    token,
    accessCode
  });

  if (!unlock) {
    redirect(passportPath(publicSlug, token, "access"));
  }

  const maxAge = unlock.shareExpiresAt
    ? Math.max(60, Math.floor((unlock.shareExpiresAt.getTime() - Date.now()) / 1000))
    : 60 * 60 * 24 * 7;
  const cookieStore = await cookies();

  cookieStore.set(passportShareAccessCookieName(publicSlug), unlock.accessProof, {
    httpOnly: true,
    maxAge,
    path: `/passport/${publicSlug}`,
    sameSite: "lax",
    secure: shouldUseSecureSessionCookie()
  });

  redirect(passportPath(publicSlug, token));
}
