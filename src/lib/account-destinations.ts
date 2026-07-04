export const REGULAR_ACCOUNT_HOME = "/dashboard";

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
