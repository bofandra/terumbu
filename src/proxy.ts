import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { securityHeaders } from "@/lib/security-headers";

/**
 * Localized public content aliases.
 * Internal authenticated routes and server actions keep their original paths.
 * The locale cookie is injected into the rewritten request so server-rendered
 * metadata, body copy, and layout all agree on the URL's language.
 */
export function proxy(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/(en|id)(\/.*)?$/);
  if (!match) {
    const response = NextResponse.next();
    for (const header of securityHeaders) response.headers.set(header.key, header.value);
    return response;
  }

  const locale = match[1]!;
  const internalPath = match[2] || "/";
  if (!(internalPath === "/" || internalPath === "/impact-map" || internalPath === "/expeditions" || /^\/expeditions\/[^/]+$/.test(internalPath))) {
    const response = NextResponse.next();
    for (const header of securityHeaders) response.headers.set(header.key, header.value);
    return response;
  }

  const destination = request.nextUrl.clone();
  destination.pathname = internalPath;
  request.cookies.set("terumbu_locale", locale);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-terumbu-locale-prefix", locale);
  const response = NextResponse.rewrite(destination, { request: { headers: requestHeaders } });
  response.cookies.set("terumbu_locale", locale, {
    path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: false
  });
  for (const header of securityHeaders) response.headers.set(header.key, header.value);
  return response;
}

// Continue applying security headers to all runtime routes, not just locale aliases.
export const config = { matcher: ["/:path*"] };
