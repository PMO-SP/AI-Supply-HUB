import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Payment, PaymentWithDunning, MahnStufe } from "@/lib/types";

function computeDunning(payment: Payment, today: Date): PaymentWithDunning {
  const dueDate = new Date(payment.due_date + "T00:00:00");
  const diffMs = today.getTime() - dueDate.getTime();
  const daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  let mahnStufe: MahnStufe = 0;
  if (payment.status === "paid") {
    return { ...payment, days_overdue: 0, mahn_stufe: 0 };
  }
  if (daysOverdue <= 0) mahnStufe = 0;
  else if (daysOverdue <= 14) mahnStufe = 1;
  else if (daysOverdue <= 30) mahnStufe = 2;
  else mahnStufe = 3;

  return { ...payment, days_overdue: daysOverdue, mahn_stufe: mahnStufe };
}

export async function GET() {
  const db = await getDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const payments = db
    .prepare("SELECT * FROM payments ORDER BY due_date ASC")
    .all() as Payment[];

  const withDunning = payments.map((p) => computeDunning(p, today));

  // Sort: overdue first (by days_overdue desc), then by due_date asc
  withDunning.sort((a, b) => {
    if (a.status === "paid" && b.status !== "paid") return 1;
    if (a.status !== "paid" && b.status === "paid") return -1;
    if (b.days_overdue !== a.days_overdue) return b.days_overdue - a.days_overdue;
    return a.due_date.localeCompare(b.due_date);
  });

  return NextResponse.json({ success: true, data: withDunning });
}
