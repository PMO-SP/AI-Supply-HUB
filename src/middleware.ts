import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Login-Seite und Auth-API immer erlauben
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const expected = process.env.AUTH_PASSWORD;

  // Kein Passwort gesetzt → lokale Entwicklung, alles erlauben
  if (!expected) return NextResponse.next();

  const token = request.cookies.get("auth_token")?.value;
  if (!token || token !== expected) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
