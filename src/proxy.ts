import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@/lib/types";
import { homeFor } from "@/lib/format";
import { verifySession } from "@/lib/session-token";
import { COOKIE } from "@/lib/ids";
import { refreshSupabase } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { response, hasUser } = await refreshSupabase(request);
  const payload = await verifySession(request.cookies.get(COOKIE)?.value);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api") || isPublic(pathname)) return response;

  if (!payload && !hasUser) return redirectTo(request, response, "/login");

  if (payload && pathname === "/login") return redirectTo(request, response, homeFor(payload.role));

  if (payload) {
    const dest = blockedDestination(payload.role, pathname);
    if (dest) return redirectTo(request, response, dest);
  }

  return response;
}

function redirectTo(request: NextRequest, response: NextResponse, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  const redirect = NextResponse.redirect(url);
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

function isPublic(pathname: string) {
  if (pathname === "/") return true;
  return ["/login", "/book", "/demo"].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function blockedDestination(role: Role, pathname: string) {
  const allowed = (prefixes: string[]) => prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (role === "technician") return allowed(["/tech", "/notifications"]) ? null : "/tech";
  if (role === "customer") return allowed(["/portal", "/pay", "/notifications"]) ? null : "/portal";
  if (role === "superadmin") return allowed(["/admin", "/notifications"]) ? null : "/admin";
  if (allowed(["/admin", "/tech", "/portal"])) return "/dashboard";
  return null;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
