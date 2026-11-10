import { NextRequest, NextResponse } from "next/server";

/**
 * Localized public content aliases.
 * Internal authenticated routes and server actions keep their original paths.
 * The locale cookie is injected into the rewritten request so server-rendered
 * metadata, body copy, and layout all agree on the URL's language.
 */
export function proxy(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/(en|id)(\/.*)?$/);
  if (!match) return NextResponse.next();

  const locale = match[1]!;
  const internalPath = match[2] || "/";
  if (!(internalPath === "/" || internalPath === "/impact-map" || internalPath === "/expeditions" || /^\/expeditions\/[^/]+$/.test(internalPath))) {
    return NextResponse.next();
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
  return response;
}

export const config = {
  matcher: ["/en", "/id", "/en/impact-map", "/id/impact-map", "/en/expeditions/:path*", "/id/expeditions/:path*"]
};
