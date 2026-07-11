export const REGULAR_ACCOUNT_HOME = "/dashboard";
export const ACCESS_DENIED_PATH = "/forbidden";

export function internalRedirectPath(value: string | null | undefined, fallback = REGULAR_ACCOUNT_HOME) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

export function forbiddenRedirectPath(requestedPath: string | null | undefined, fallback = REGULAR_ACCOUNT_HOME) {
  return `${ACCESS_DENIED_PATH}?next=${encodeURIComponent(internalRedirectPath(requestedPath, fallback))}`;
}

export function defaultAuthenticatedPathForAccount({
  roles,
  hasCorporateAccess = false
}: {
  roles: Iterable<string>;
  hasCorporateAccess?: boolean;
}) {
  const roleSet = new Set(roles);

  if (roleSet.has("admin")) {
    return "/admin";
  }

  if (roleSet.has("partner")) {
    return "/partner";
  }

  if (roleSet.has("corporate_admin") || hasCorporateAccess) {
    return "/corporate";
  }

  return REGULAR_ACCOUNT_HOME;
}
