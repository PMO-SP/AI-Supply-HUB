import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { SalesAction } from "@/lib/types";

export async function GET() {
  try {
    const db = await getDb();
    const rows = db
      .prepare("SELECT * FROM sales_actions ORDER BY performance_pct ASC")
      .all() as SalesAction[];

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
