import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const db = await getDb();
  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get("article_id");
  const year = searchParams.get("year");

  let query = "SELECT * FROM forecasts WHERE 1=1";
  const params: (string | number)[] = [];

  if (articleId) {
    query += " AND article_id = ?";
    params.push(articleId);
  }
  if (year) {
    query += " AND year = ?";
    params.push(parseInt(year, 10));
  }

  query += " ORDER BY year, month, article_id";

  const forecasts = db.prepare(query).all(...params);
  return NextResponse.json({ success: true, data: forecasts });
}
