import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { securityHeaders } from "./lib/security-headers";
import { resolveLocalizedPublicPath } from "./lib/public-locale-routing";

export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  // Preserve the proxy-injected locale header across internal rewrites.
  // Locale-prefixed URLs always overwrite it from the route itself.
  const localized = resolveLocalizedPublicPath(request.nextUrl.pathname);
  const response = localized
    ? (() => {
        headers.set("x-terumbu-route-locale", localized.locale);
        const destination = request.nextUrl.clone();
        destination.pathname = localized.path;
        return NextResponse.rewrite(destination, { request: { headers } });
      })()
    : NextResponse.next({ request: { headers } });

  for (const header of securityHeaders) {
    response.headers.set(header.key, header.value);
  }

  return response;
}
