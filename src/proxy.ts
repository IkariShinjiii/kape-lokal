import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, locales } from "@/lib/i18n";

// Filipino speakers may send "fil" or the older "tl" in Accept-Language;
// Hiligaynon speakers "hil".
function pickLocale(request: NextRequest): string {
  const header = request.headers.get("accept-language") ?? "";
  const first = header.split(",")[0]?.trim().toLowerCase() ?? "";
  if (first.startsWith("hil")) return "hil";
  if (first.startsWith("fil") || first.startsWith("tl")) return "fil";
  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) return;

  request.nextUrl.pathname = `/${pickLocale(request)}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  // Skip Next internals, API routes, the sign-in callback and files with an
  // extension (icons, images, map files).
  matcher: ["/((?!_next|api|auth|.*\\..*).*)"],
};
