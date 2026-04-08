import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { NextRequest } from "next/server";
import type { InValue } from "@libsql/client";

export async function GET(request: NextRequest) {
  const db = await getDb();
  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get("article_id");
  const year = searchParams.get("year");

  let query = "SELECT * FROM forecasts WHERE 1=1";
  const params: InValue[] = [];

  if (articleId) {
    query += " AND article_id = ?";
    params.push(articleId);
  }
  if (year) {
    query += " AND year = ?";
    params.push(parseInt(year, 10));
  }

  query += " ORDER BY year, month, article_id";

  const forecasts = await db.prepare(query).all(...params);
  return NextResponse.json({ success: true, data: forecasts });
}
