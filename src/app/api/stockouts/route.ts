import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Stockout, StockoutWithUrgency, AvailabilityUrgency } from "@/lib/types";

function computeUrgency(stockout: Stockout, today: Date): StockoutWithUrgency {
  // Handle "offline" or non-date values
  const raw = (stockout.available_from_date || "").trim().toLowerCase();
  if (raw === "offline" || raw === "" || raw === "-" || raw === "n/a") {
    return { ...stockout, days_until_available: -1, urgency: "offline" };
  }

  const availDate = new Date(stockout.available_from_date + "T00:00:00");
  if (isNaN(availDate.getTime())) {
    return { ...stockout, days_until_available: -1, urgency: "offline" };
  }

  const diffMs = availDate.getTime() - today.getTime();
  const daysUntil = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  let urgency: AvailabilityUrgency = "far";
  if (daysUntil <= 7) urgency = "soon";
  else if (daysUntil <= 21) urgency = "medium";
  else urgency = "far";

  return { ...stockout, days_until_available: daysUntil, urgency };
}

export async function GET() {
  const db = await getDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stockouts = db
    .prepare("SELECT * FROM stockouts ORDER BY available_from_date ASC")
    .all() as Stockout[];

  const withUrgency = stockouts.map((s) => computeUrgency(s, today));

  return NextResponse.json({ success: true, data: withUrgency });
}
