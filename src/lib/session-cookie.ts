type SecureCookieOptions = {
  appUrl?: string;
  nodeEnv?: string;
  override?: string;
};

export function shouldUseSecureSessionCookie({
  appUrl = process.env.NEXT_PUBLIC_APP_URL,
  nodeEnv = process.env.NODE_ENV,
  override = process.env.SESSION_COOKIE_SECURE
}: SecureCookieOptions = {}) {
  if (override === "true") {
    return true;
  }

  if (override === "false") {
    return false;
  }

  if (appUrl) {
    try {
      return new URL(appUrl).protocol === "https:";
    } catch {
      return nodeEnv === "production";
    }
  }

  return nodeEnv === "production";
}
