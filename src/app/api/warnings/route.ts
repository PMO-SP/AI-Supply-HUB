import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = await getDb();

  const warnings = db
    .prepare(
      `SELECT sp.*, a.article_name
       FROM shipment_plans sp
       JOIN articles a ON sp.article_id = a.article_id
       WHERE sp.warning_type IS NOT NULL
       ORDER BY
         CASE sp.warning_type
           WHEN 'production_start_in_past' THEN 1
           WHEN 'ship_date_in_past' THEN 2
           WHEN 'urgent_reorder' THEN 3
           WHEN 'stock_running_low' THEN 4
           WHEN 'high_container_count' THEN 5
         END,
         sp.production_start ASC`
    )
    .all();

  const mapped = (warnings as Record<string, unknown>[]).map((w) => ({
    ...w,
    is_overridden: w.is_overridden === 1,
  }));

  return NextResponse.json({ success: true, data: mapped });
}
