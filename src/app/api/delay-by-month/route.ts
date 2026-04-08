import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { DelayByMonth } from "@/lib/types";

export async function GET() {
  const db = await getDb();
  const delays = (await db
    .prepare("SELECT * FROM delay_by_month ORDER BY year ASC, month ASC")
    .all()) as unknown as DelayByMonth[];
  return NextResponse.json({ success: true, data: delays });
}
