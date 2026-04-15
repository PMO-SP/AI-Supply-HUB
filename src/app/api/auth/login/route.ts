import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { password } = await request.json();

  const expected = process.env.AUTH_PASSWORD;
  if (!expected || password !== expected) {
    return NextResponse.json({ error: "Falsches Passwort" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("auth_token", expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 30, // 30 Tage
    path: "/",
  });
  return response;
}
