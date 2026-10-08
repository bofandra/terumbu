import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { securityHeaders } from "./lib/security-headers";

export function proxy(_request: NextRequest) {
  const response = NextResponse.next();

  for (const header of securityHeaders) {
    response.headers.set(header.key, header.value);
  }

  return response;
}
