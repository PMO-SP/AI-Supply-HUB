import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db
      .prepare(
        `SELECT g.*,
                CASE WHEN g.article_name != '' THEN g.article_name
                     ELSE COALESCE(a.article_name, g.article_id)
                END AS article_name
         FROM goods_on_the_way g
         LEFT JOIN articles a ON g.article_id = a.article_id
         ORDER BY g.eta ASC`
      )
      .all();
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
