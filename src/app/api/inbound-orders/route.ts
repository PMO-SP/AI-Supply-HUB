import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { InboundOrder } from "@/lib/types";

export async function GET() {
  try {
    const db = await getDb();
    const rows = (await db
      .prepare("SELECT * FROM inbound_orders ORDER BY eta ASC")
      .all()) as InboundOrder[];
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
