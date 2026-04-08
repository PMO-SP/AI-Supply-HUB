import { NextResponse } from "next/server";
import { getDb, type Db } from "@/lib/db";
import { computeShipmentPlans } from "@/lib/planner";
import type { NextRequest } from "next/server";
import type { InValue } from "@libsql/client";
import type {
  Article, Forecast, Override, StockLevel,
  MonthlyPerformance, SeasonalityEntry,
} from "@/lib/types";

export async function GET(request: NextRequest) {
  const db = await getDb();
  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get("article_id");

  let query = "SELECT * FROM overrides WHERE 1=1";
  const params: InValue[] = [];

  if (articleId) {
    query += " AND article_id = ?";
    params.push(articleId);
  }

  query += " ORDER BY year, month, article_id";

  const overrides = await db.prepare(query).all(...params);
  return NextResponse.json({ success: true, data: overrides });
}

export async function POST(request: NextRequest) {
  const db = await getDb();
  const body = await request.json();
  const { article_id, year, month, field, override_value, reason } = body;

  if (!article_id || !year || !month || !field || override_value === undefined) {
    return NextResponse.json(
      { success: false, error: "Missing required fields" },
      { status: 400 }
    );
  }

  const currentPlan = await db
    .prepare("SELECT * FROM shipment_plans WHERE article_id = ? AND year = ? AND month = ?")
    .get(article_id, year, month);

  const originalValue = currentPlan ? String(currentPlan[field] ?? "") : "";

  await db.prepare(
    `INSERT INTO overrides (article_id, year, month, field, original_value, override_value, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(article_id, year, month, field)
     DO UPDATE SET override_value = excluded.override_value, reason = excluded.reason, updated_at = datetime('now')`
  ).run(article_id, year, month, field, originalValue, String(override_value), reason || "");

  await recomputePlans(db);

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const db = await getDb();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ success: false, error: "Missing override id" }, { status: 400 });
  }

  await db.prepare("DELETE FROM overrides WHERE id = ?").run(parseInt(id, 10));
  await recomputePlans(db);

  return NextResponse.json({ success: true });
}

async function recomputePlans(db: Db) {
  const [articles, forecasts, overrides, stockLevels, performance, seasonalityData] =
    await Promise.all([
      db.prepare("SELECT * FROM articles").all() as Promise<Article[]>,
      db.prepare("SELECT * FROM forecasts").all() as Promise<Forecast[]>,
      db.prepare("SELECT * FROM overrides").all() as Promise<Override[]>,
      db.prepare("SELECT * FROM stock_levels").all() as Promise<StockLevel[]>,
      db.prepare("SELECT * FROM monthly_performance").all() as Promise<MonthlyPerformance[]>,
      db.prepare("SELECT * FROM seasonality").all() as Promise<SeasonalityEntry[]>,
    ]);

  const plans = computeShipmentPlans({
    articles, forecasts, overrides, stockLevels, performance, seasonality: seasonalityData,
  });

  const statements: { sql: string; args?: InValue[] }[] = [
    { sql: "DELETE FROM shipment_plans" },
    ...plans.map((p) => ({
      sql: `INSERT INTO shipment_plans
        (article_id, year, month, target_units, containers_needed, arrival_date, ship_date, production_start,
         warning_type, warning_message, is_overridden,
         current_stock_units, units_needed_after_stock, safety_stock_units, total_units_needed,
         stock_coverage_months, status_color, safety_stock_breakdown, performance_info)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        p.article_id, p.year, p.month, p.target_units, p.containers_needed,
        p.arrival_date, p.ship_date, p.production_start,
        p.warning_type, p.warning_message, p.is_overridden ? 1 : 0,
        p.current_stock_units, p.units_needed_after_stock, p.safety_stock_units,
        p.total_units_needed, p.stock_coverage_months, p.status_color,
        p.safety_stock_breakdown, p.performance_info,
      ] as InValue[],
    })),
  ];

  await db.batch(statements);
}
