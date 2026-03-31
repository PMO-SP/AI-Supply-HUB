import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { TrendStatus } from "@/lib/types";

export interface ArticlePerformance {
  article_id: string;
  article_name: string;
  category: string;
  current_month_pct: number | null;
  performance_m3: number;
  performance_m2: number;
  performance_m1: number;
  trend_3m: TrendStatus;
  forecast_units: number;
  actual_units: number;
  current_stock: number;
  overstock_units: number;
}

export async function GET() {
  try {
    const db = await getDb();
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;

    // Get all articles
    const articles = db.prepare("SELECT article_id, article_name, category FROM articles").all() as {
      article_id: string; article_name: string; category: string;
    }[];

    // Get current month performance data
    const perfRows = db.prepare(
      "SELECT * FROM monthly_performance WHERE year = ? AND month = ?"
    ).all(curYear, curMonth) as {
      article_id: string; year: number; month: number; actual_units_sold: number;
      performance_pct: number; performance_m3: number; performance_m2: number;
      performance_m1: number; trend_3m: string;
    }[];
    const perfMap = new Map(perfRows.map((p) => [p.article_id, p]));

    // Get current month forecasts
    const forecastRows = db.prepare(
      "SELECT article_id, target_units FROM forecasts WHERE year = ? AND month = ?"
    ).all(curYear, curMonth) as { article_id: string; target_units: number }[];
    const forecastMap = new Map(forecastRows.map((f) => [f.article_id, f.target_units]));

    // Get stock levels
    const stockRows = db.prepare("SELECT article_id, current_stock_units FROM stock_levels").all() as {
      article_id: string; current_stock_units: number;
    }[];
    const stockMap = new Map(stockRows.map((s) => [s.article_id, s.current_stock_units]));

    // Get performance for previous 3 months (for category rollup)
    // M-1, M-2, M-3 relative to current month
    const histMonths: { year: number; month: number; label: string }[] = [];
    for (let offset = 3; offset >= 1; offset--) {
      const d = new Date(curYear, curMonth - 1 - offset, 1);
      histMonths.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: `M-${offset}` });
    }
    // Fetch all historical performance rows for those 3 months
    const histPerfRows = db.prepare(
      `SELECT article_id, year, month, performance_pct FROM monthly_performance
       WHERE (year * 100 + month) IN (${histMonths.map((m) => m.year * 100 + m.month).join(",")})`
    ).all() as { article_id: string; year: number; month: number; performance_pct: number }[];
    // Map: article_id -> { m3: pct, m2: pct, m1: pct }
    const histMap = new Map<string, { m3: number; m2: number; m1: number }>();
    for (const row of histPerfRows) {
      if (!histMap.has(row.article_id)) histMap.set(row.article_id, { m3: 0, m2: 0, m1: 0 });
      const entry = histMap.get(row.article_id)!;
      const ym = row.year * 100 + row.month;
      if (ym === histMonths[0].year * 100 + histMonths[0].month) entry.m3 = row.performance_pct;
      else if (ym === histMonths[1].year * 100 + histMonths[1].month) entry.m2 = row.performance_pct;
      else if (ym === histMonths[2].year * 100 + histMonths[2].month) entry.m1 = row.performance_pct;
    }

    const result: ArticlePerformance[] = articles.map((a) => {
      const perf = perfMap.get(a.article_id);
      const hist = histMap.get(a.article_id);
      const forecast = forecastMap.get(a.article_id) ?? 0;
      const stock = stockMap.get(a.article_id) ?? 0;
      const overstock = Math.max(0, stock - forecast);

      return {
        article_id: a.article_id,
        article_name: a.article_name,
        category: a.category || "",
        current_month_pct: perf?.performance_pct ?? null,
        // Use actual historical monthly_performance rows; fallback to sheet M-3/M-2/M-1
        performance_m3: hist?.m3 || perf?.performance_m3 || 0,
        performance_m2: hist?.m2 || perf?.performance_m2 || 0,
        performance_m1: hist?.m1 || perf?.performance_m1 || 0,
        trend_3m: (perf?.trend_3m as TrendStatus) || "",
        forecast_units: forecast,
        actual_units: perf?.actual_units_sold ?? 0,
        current_stock: stock,
        overstock_units: overstock,
      };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
