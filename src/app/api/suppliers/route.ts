import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Supplier } from "@/lib/types";

export async function GET() {
  const db = await getDb();

  const suppliers = db
    .prepare("SELECT * FROM suppliers ORDER BY supplier_name ASC")
    .all() as Supplier[];

  return NextResponse.json({ success: true, data: suppliers });
}
