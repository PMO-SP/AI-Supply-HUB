import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { NextRequest } from "next/server";
import type { InValue } from "@libsql/client";

export async function GET(request: NextRequest) {
  const db = await getDb();
  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get("article_id");
  const year = searchParams.get("year");
  const warningsOnly = searchParams.get("warnings_only");

  let query = `
    SELECT sp.*, a.article_name
    FROM shipment_plans sp
    JOIN articles a ON sp.article_id = a.article_id
    WHERE 1=1
  `;
  const params: InValue[] = [];

  if (articleId) {
    query += " AND sp.article_id = ?";
    params.push(articleId);
  }
  if (year) {
    query += " AND sp.year = ?";
    params.push(parseInt(year, 10));
  }
  if (warningsOnly === "true") {
    query += " AND sp.warning_type IS NOT NULL";
  }

  query += " ORDER BY sp.production_start ASC";

  const plans = await db.prepare(query).all(...params);

  const mapped = (plans as Record<string, unknown>[]).map((p) => ({
    ...p,
    is_overridden: p.is_overridden === 1,
  }));

  return NextResponse.json({ success: true, data: mapped });
}
