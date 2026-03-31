import { NextResponse } from "next/server";
import { syncFromGoogleSheets } from "@/lib/sync-service";
import { getDb } from "@/lib/db";

export async function POST() {
  const result = await syncFromGoogleSheets();

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      articles: result.articlesCount,
      forecasts: result.forecastsCount,
      plans: result.plansCount,
      stock_levels: result.stockLevelsCount,
      performance: result.performanceCount,
      seasonality: result.seasonalityCount,
      suppliers: result.suppliersCount,
      payments: result.paymentsCount,
      stockouts: result.stockoutsCount,
      delay_by_month: result.delayByMonthCount,
    },
  });
}

export async function GET() {
  const db = await getDb();
  const lastSync = db
    .prepare("SELECT * FROM sync_log ORDER BY id DESC LIMIT 1")
    .get();

  return NextResponse.json({ success: true, data: lastSync || null });
}
