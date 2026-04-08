import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = await getDb();
  const articles = await db.prepare("SELECT * FROM articles ORDER BY article_name").all();
  return NextResponse.json({ success: true, data: articles });
}
