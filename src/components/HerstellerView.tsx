"use client";

import { useMemo, useState } from "react";
import { usePayments } from "@/hooks/usePayments";
import { useSuppliers } from "@/hooks/useSuppliers";
import type { PaymentWithDunning, MahnStufe, Supplier } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */
function formatEur(n: number): string {
  return n.toLocaleString("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(d: Date): string {
  return d.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
}

/* ------------------------------------------------------------------ */
/* Mahnstufe badge                                                     */
/* ------------------------------------------------------------------ */
function MahnStufeBadge({ stufe }: { stufe: MahnStufe }) {
  const styles: Record<MahnStufe, string> = {
    0: "bg-status-green-light text-status-green-dark",
    1: "bg-status-amber-light text-status-amber-dark",
    2: "bg-status-red-light text-status-red-dark",
    3: "bg-brand-red text-white",
  };
  return (
    <span className={`inline-block text-[9px] px-1.5 py-[1px] rounded-full font-medium ${styles[stufe]}`}>
      Stufe {stufe}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Status dot                                                          */
/* ------------------------------------------------------------------ */
function PaymentStatusDot({ payment }: { payment: PaymentWithDunning }) {
  if (payment.status === "paid") return <span className="inline-block w-1.5 h-1.5 rounded-full bg-status-green mr-1" />;
  if (payment.days_overdue > 0) return <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-red mr-1" />;
  const dueDate = new Date(payment.due_date + "T00:00:00");
  const now = new Date();
  const daysToDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysToDue <= 14) return <span className="inline-block w-1.5 h-1.5 rounded-full bg-status-amber mr-1" />;
  return <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 mr-1" />;
}

/* ================================================================== */
/* MAIN COMPONENT                                                      */
/* ================================================================== */
export default function HerstellerView() {
  const { payments, isLoading } = usePayments();
  const { suppliers } = useSuppliers();
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");

  const supplierMap = useMemo(() => {
    const map = new Map<string, Supplier>();
    for (const s of suppliers) map.set(s.supplier_id, s);
    return map;
  }, [suppliers]);

  const filteredPayments = useMemo(() => {
    if (selectedSupplier === "all") return payments;
    return payments.filter((p) => p.supplier_id === selectedSupplier);
  }, [payments, selectedSupplier]);

  const supplierList = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of payments) {
      if (!seen.has(p.supplier_id)) seen.set(p.supplier_id, p.supplier_name);
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [payments]);

  /* ---------- Computed stats ---------- */
  const stats = useMemo(() => {
    const open = filteredPayments.filter((p) => p.status !== "paid");
    const anzahlung = open.filter((p) => p.payment_type === "Anzahlung");
    const restzahlung = open.filter((p) => p.payment_type === "Restzahlung");
    const overdue = open.filter((p) => p.days_overdue > 0);
    const now = new Date();
    const thisMonth = getMonthKey(now);
    const dueThisMonth = open.filter((p) => {
      const d = new Date(p.due_date + "T00:00:00");
      return getMonthKey(d) === thisMonth;
    });
    return {
      anzahlungTotal: anzahlung.reduce((s, p) => s + p.amount_eur, 0),
      anzahlungCount: new Set(anzahlung.map((p) => p.supplier_id)).size,
      restzahlungTotal: restzahlung.reduce((s, p) => s + p.amount_eur, 0),
      restzahlungCount: new Set(restzahlung.map((p) => p.supplier_id)).size,
      dueThisMonthTotal: dueThisMonth.reduce((s, p) => s + p.amount_eur, 0),
      overdueTotal: overdue.reduce((s, p) => s + p.amount_eur, 0),
      overdueCount: overdue.length,
    };
  }, [filteredPayments]);

  /* ---------- Monthly breakdown ---------- */
  const monthlyBreakdown = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; anzahlung: number; restzahlungVorkasse: number; restzahlungKreditlinie: number; total: number; hasOverdue: boolean }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = getMonthKey(d);
      const mp = filteredPayments.filter((p) => {
        if (p.status === "paid") return false;
        const pd = new Date(p.due_date + "T00:00:00");
        return getMonthKey(pd) === key;
      });
      let a = 0, rv = 0, rk = 0;
      for (const p of mp) {
        if (p.payment_type === "Anzahlung") a += p.amount_eur;
        else if (p.payment_method === "Kreditlinie") rk += p.amount_eur;
        else rv += p.amount_eur;
      }
      months.push({ key, label: getMonthLabel(d), anzahlung: a, restzahlungVorkasse: rv, restzahlungKreditlinie: rk, total: a + rv + rk, hasOverdue: mp.some((p) => p.days_overdue > 0) });
    }
    return months;
  }, [filteredPayments]);

  /* ---------- Supplier bars ---------- */
  const supplierBars = useMemo(() => {
    const open = filteredPayments.filter((p) => p.status !== "paid");
    const map = new Map<string, { name: string; total: number; anzahlung: number; restzahlungVorkasse: number; restzahlungKreditlinie: number; maxOverdue: number; depositPct: number }>();
    for (const p of open) {
      if (!map.has(p.supplier_id)) {
        const supplier = supplierMap.get(p.supplier_id);
        map.set(p.supplier_id, { name: p.supplier_name, total: 0, anzahlung: 0, restzahlungVorkasse: 0, restzahlungKreditlinie: 0, maxOverdue: 0, depositPct: supplier?.deposit_pct ?? 30 });
      }
      const e = map.get(p.supplier_id)!;
      e.total += p.amount_eur;
      if (p.payment_type === "Anzahlung") e.anzahlung += p.amount_eur;
      else if (p.payment_method === "Kreditlinie") e.restzahlungKreditlinie += p.amount_eur;
      else e.restzahlungVorkasse += p.amount_eur;
      e.maxOverdue = Math.max(e.maxOverdue, p.days_overdue);
    }
    const arr = Array.from(map.entries()).map(([id, d]) => ({ id, ...d }));
    arr.sort((a, b) => b.total - a.total);
    return arr;
  }, [filteredPayments, supplierMap]);

  const maxBarAmount = supplierBars.length > 0 ? supplierBars[0].total : 1;

  /* ---------- Mahnstufen ---------- */
  const mahnStufen = useMemo(() => {
    const open = filteredPayments.filter((p) => p.status !== "paid");
    return ([0, 1, 2, 3] as MahnStufe[]).map((stufe) => {
      const items = open.filter((p) => p.mahn_stufe === stufe);
      return { stufe, count: items.length, total: items.reduce((s, p) => s + p.amount_eur, 0), supplierCount: new Set(items.map((p) => p.supplier_id)).size };
    });
  }, [filteredPayments]);

  const stufeStyles: Record<MahnStufe, string> = {
    0: "bg-status-green/8 border-status-green/20",
    1: "bg-status-amber/8 border-status-amber/20",
    2: "bg-brand-red/8 border-brand-red/20",
    3: "bg-brand-red/15 border-brand-red/40",
  };
  const stufeLabels: Record<MahnStufe, string> = {
    0: "Nicht fällig",
    1: "1–14 Tage",
    2: "15–30 Tage",
    3: "> 30 Tage",
  };

  if (isLoading) return <div className="text-center py-8 text-gray-400 text-[11px]">Lade Zahlungsdaten...</div>;
  if (payments.length === 0) return <div className="text-center py-8 text-gray-400 text-[11px]">Keine Zahlungsdaten vorhanden. &quot;Google Sheets sync&quot; klicken.</div>;

  return (
    <div className="space-y-2.5">
      {/* ============ FILTER ============ */}
      <div className="flex items-center gap-2">
        <label className="text-[10px] font-medium text-gray-500 uppercase tracking-[0.4px]">Hersteller</label>
        <select
          value={selectedSupplier}
          onChange={(e) => setSelectedSupplier(e.target.value)}
          className="text-[11px] border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-brand-red/30 focus:border-brand-red"
        >
          <option value="all">Alle Hersteller</option>
          {supplierList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {selectedSupplier !== "all" && (
          <button onClick={() => setSelectedSupplier("all")} className="text-[10px] text-brand-red hover:underline">Filter entfernen</button>
        )}
      </div>

      {/* ============ KPI CARDS ============ */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Offene Anzahlungen", value: formatEur(stats.anzahlungTotal), sub: `${stats.anzahlungCount} Lieferant${stats.anzahlungCount !== 1 ? "en" : ""}`, color: "text-gray-900" },
          { label: "Offene Restzahlungen", value: formatEur(stats.restzahlungTotal), sub: `${stats.restzahlungCount} Lieferant${stats.restzahlungCount !== 1 ? "en" : ""}`, color: "text-gray-900" },
          { label: "Fällig diesen Monat", value: formatEur(stats.dueThisMonthTotal), sub: new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" }), color: "text-gray-900" },
          { label: "Überfällig gesamt", value: formatEur(stats.overdueTotal), sub: `${stats.overdueCount} Zahlungen`, color: "text-brand-red" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded border border-gray-100 px-3 py-2">
            <div className="text-[9px] text-gray-500 uppercase tracking-[0.4px] mb-0.5">{card.label}</div>
            <div className={`text-[16px] font-medium ${card.color}`}>{card.value}</div>
            <div className="text-[9px] text-gray-400">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* ============ ROW 1: Cash Flow (left) + Mahnstufen (right) ============ */}
      <div className="grid grid-cols-[3fr_1fr] gap-2">
        {/* Cash Flow */}
        <div className="bg-white rounded border border-gray-100 p-3">
          <div className="text-[9px] font-medium text-gray-500 uppercase tracking-[0.4px] mb-2">Cash Flow — Monatsübersicht</div>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="text-left py-1 px-1.5 font-medium text-gray-400 border-b border-gray-100">Monat</th>
                <th className="text-right py-1 px-1.5 font-medium text-gray-400 border-b border-gray-100">Anzahlungen</th>
                <th className="text-right py-1 px-1.5 font-medium text-gray-400 border-b border-gray-100">
                  <span className="flex flex-col items-end leading-tight"><span>Restz.</span><span className="text-[8px] text-blue-500 font-normal">Vorkasse</span></span>
                </th>
                <th className="text-right py-1 px-1.5 font-medium text-gray-400 border-b border-gray-100">
                  <span className="flex flex-col items-end leading-tight"><span>Restz.</span><span className="text-[8px] text-purple-500 font-normal">Kreditlinie</span></span>
                </th>
                <th className="text-right py-1 px-1.5 font-medium text-gray-600 border-b border-gray-100">Gesamt</th>
              </tr>
            </thead>
            <tbody>
              {monthlyBreakdown.map((m, idx) => {
                const isCur = idx === 0;
                return (
                  <tr key={m.key} className={`border-b border-gray-50 ${isCur ? "bg-brand-red/5" : ""} ${m.hasOverdue && !isCur ? "bg-red-50/50" : ""}`}>
                    <td className={`py-[3px] px-1.5 ${isCur ? "text-brand-red font-medium" : "text-gray-600"}`}>
                      {m.label}{isCur && <span className="ml-0.5 text-[7px] text-brand-red">&#9679;</span>}
                    </td>
                    <td className="py-[3px] px-1.5 text-right font-mono text-gray-600">
                      {m.anzahlung > 0 ? formatEur(m.anzahlung) : <span className="text-gray-200">-</span>}
                    </td>
                    <td className="py-[3px] px-1.5 text-right font-mono text-blue-600">
                      {m.restzahlungVorkasse > 0 ? formatEur(m.restzahlungVorkasse) : <span className="text-gray-200">-</span>}
                    </td>
                    <td className="py-[3px] px-1.5 text-right font-mono text-purple-600">
                      {m.restzahlungKreditlinie > 0 ? formatEur(m.restzahlungKreditlinie) : <span className="text-gray-200">-</span>}
                    </td>
                    <td className={`py-[3px] px-1.5 text-right font-mono font-medium ${m.hasOverdue ? "text-brand-red" : m.total > 0 ? "text-gray-800" : "text-gray-200"}`}>
                      {m.total > 0 ? formatEur(m.total) : "-"}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-gray-50/80 font-medium border-t border-gray-200">
                <td className="py-[3px] px-1.5 text-gray-600">Gesamt</td>
                <td className="py-[3px] px-1.5 text-right font-mono text-gray-800">{formatEur(monthlyBreakdown.reduce((s, m) => s + m.anzahlung, 0))}</td>
                <td className="py-[3px] px-1.5 text-right font-mono text-blue-600">{formatEur(monthlyBreakdown.reduce((s, m) => s + m.restzahlungVorkasse, 0))}</td>
                <td className="py-[3px] px-1.5 text-right font-mono text-purple-600">{formatEur(monthlyBreakdown.reduce((s, m) => s + m.restzahlungKreditlinie, 0))}</td>
                <td className="py-[3px] px-1.5 text-right font-mono text-gray-800">{formatEur(monthlyBreakdown.reduce((s, m) => s + m.total, 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Mahnstufen */}
        <div className="bg-white rounded border border-gray-100 p-3">
          <div className="text-[9px] font-medium text-gray-500 uppercase tracking-[0.4px] mb-2">Mahnstufen</div>
          <div className="space-y-1.5">
            {mahnStufen.map((level) => (
              <div key={level.stufe} className={`rounded border px-2 py-1.5 ${stufeStyles[level.stufe]}`}>
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <MahnStufeBadge stufe={level.stufe} />
                    <span className="text-[9px] text-gray-500">{stufeLabels[level.stufe]}</span>
                  </div>
                  <div className={`text-[10px] font-mono font-medium ${level.stufe >= 2 ? "text-brand-red" : level.stufe === 1 ? "text-status-amber-dark" : "text-gray-600"}`}>
                    {formatEur(level.total)}
                  </div>
                </div>
                <div className="flex gap-2 text-[8px] text-gray-400">
                  <span>{level.count} Zahlung{level.count !== 1 ? "en" : ""}</span>
                  <span>·</span>
                  <span>{level.supplierCount} Lief.</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============ ROW 2: Top 10 Supplier bars ============ */}
      <div className="bg-white rounded border border-gray-100 p-3">
        <div className="text-[9px] font-medium text-gray-500 uppercase tracking-[0.4px] mb-2">
          Top 10 — Offene Beträge pro Lieferant
        </div>
        <div className="space-y-1.5">
          {supplierBars.slice(0, 10).map((s, idx) => {
            const barPct = Math.max(2, (s.total / maxBarAmount) * 100);
            let barColor = "bg-blue-400";
            if (s.maxOverdue > 0) barColor = "bg-brand-red";
            else {
              const hasDueSoon = filteredPayments.some(
                (p) => p.supplier_id === s.id && p.status !== "paid" && p.days_overdue === 0 &&
                (new Date(p.due_date + "T00:00:00").getTime() - Date.now()) / (1000*60*60*24) <= 14
              );
              if (hasDueSoon) barColor = "bg-status-amber";
            }
            return (
              <div
                key={s.id}
                className={`cursor-pointer rounded px-2 py-1 transition-colors ${selectedSupplier === s.id ? "bg-brand-red/5 ring-1 ring-brand-red/20" : "hover:bg-gray-50"}`}
                onClick={() => setSelectedSupplier(selectedSupplier === s.id ? "all" : s.id)}
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className="flex items-center gap-1">
                    <span className="text-[10px] font-mono text-gray-400 w-4 text-right">{idx + 1}.</span>
                    <span className="text-[10px] font-medium text-gray-800">{s.name}</span>
                    <span className="text-[8px] px-1 py-[0px] rounded-full bg-gray-100 text-gray-400">{s.depositPct}%/{100 - s.depositPct}%</span>
                    {s.restzahlungVorkasse > 0 && <span className="text-[8px] px-1 py-[0px] rounded-full bg-blue-50 text-blue-500">VK</span>}
                    {s.restzahlungKreditlinie > 0 && <span className="text-[8px] px-1 py-[0px] rounded-full bg-purple-50 text-purple-500">KL</span>}
                  </span>
                  <span className="text-[10px] font-mono text-gray-600">{formatEur(s.total)}</span>
                </div>
                <div className="flex items-center gap-1.5 ml-5">
                  <div className="flex-1 bg-gray-100 rounded h-[8px] overflow-hidden">
                    <div className={`h-full rounded ${barColor}`} style={{ width: `${barPct}%` }} />
                  </div>
                </div>
                <div className="flex gap-1.5 mt-0.5 ml-5">
                  {s.anzahlung > 0 && <span className="text-[8px] px-1 py-[0px] rounded-full bg-green-50 text-green-600">A: {formatEur(s.anzahlung)}</span>}
                  {s.restzahlungVorkasse > 0 && <span className="text-[8px] px-1 py-[0px] rounded-full bg-blue-50 text-blue-600">VK: {formatEur(s.restzahlungVorkasse)}</span>}
                  {s.restzahlungKreditlinie > 0 && <span className="text-[8px] px-1 py-[0px] rounded-full bg-purple-50 text-purple-600">KL: {formatEur(s.restzahlungKreditlinie)}</span>}
                </div>
              </div>
            );
          })}
          {supplierBars.length === 0 && <div className="text-[10px] text-gray-400 py-3 text-center">Keine offenen Betrage</div>}
          {supplierBars.length > 10 && <div className="text-[9px] text-gray-400 text-center pt-0.5">+ {supplierBars.length - 10} weitere Lieferanten</div>}
        </div>
      </div>

      {/* ============ DETAIL TABLE ============ */}
      <div className="bg-white rounded border border-gray-100 overflow-hidden">
        <div className="px-3 py-1.5 border-b border-gray-100 bg-gray-50/50">
          <span className="text-[9px] font-medium text-gray-500 uppercase tracking-[0.4px]">
            Zahlungsdetails
            {selectedSupplier !== "all" && <span className="ml-1.5 text-brand-red normal-case">- {supplierList.find((s) => s.id === selectedSupplier)?.name}</span>}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-gray-50/50">
                {["", "Lieferant", "Typ", "Zahlart", "Betrag", "Fällig am", "Verzug", "Mahnstufe", "Status"].map((h, i) => (
                  <th key={h || `h${i}`} className={`py-1.5 px-2 font-medium text-gray-400 text-[9px] uppercase tracking-[0.3px] border-b border-gray-100 ${i === 4 ? "text-right" : i === 6 ? "text-right" : "text-left"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p) => {
                const isPaid = p.status === "paid";
                const isOverdue = p.days_overdue > 0 && !isPaid;
                const dueDate = new Date(p.due_date + "T00:00:00");
                const daysToDue = Math.floor((dueDate.getTime() - Date.now()) / (1000*60*60*24));
                const isDueSoon = !isPaid && !isOverdue && daysToDue <= 14;
                const method = p.payment_method ?? "Vorkasse";
                return (
                  <tr key={p.payment_id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${isPaid ? "opacity-50" : ""}`}>
                    <td className="py-[5px] px-2"><PaymentStatusDot payment={p} /></td>
                    <td className="py-[5px] px-2 font-medium text-gray-800">{p.supplier_name}</td>
                    <td className="py-[5px] px-2">
                      <span className={`text-[8px] px-1.5 py-[1px] rounded-full font-medium ${p.payment_type === "Anzahlung" ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"}`}>
                        {p.payment_type}
                      </span>
                    </td>
                    <td className="py-[5px] px-2">
                      {p.payment_type === "Restzahlung" ? (
                        <span className={`text-[8px] px-1.5 py-[1px] rounded-full font-medium ${method === "Kreditlinie" ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"}`}>
                          {method}
                        </span>
                      ) : (
                        <span className="text-gray-200 text-[9px]">&mdash;</span>
                      )}
                    </td>
                    <td className="py-[5px] px-2 text-right font-mono font-medium text-gray-800">{formatEur(p.amount_eur)}</td>
                    <td className="py-[5px] px-2">
                      {isOverdue ? <span className="text-brand-red font-medium">{formatDate(p.due_date)}</span>
                        : isDueSoon ? <span className="text-status-amber font-medium">{formatDate(p.due_date)}</span>
                        : <span className="text-gray-600">{formatDate(p.due_date)}</span>}
                    </td>
                    <td className="py-[5px] px-2 text-right">
                      {isOverdue ? <span className="text-brand-red font-mono font-medium">{p.days_overdue}T</span> : <span className="text-gray-200">&mdash;</span>}
                    </td>
                    <td className="py-[5px] px-2">
                      {!isPaid ? <MahnStufeBadge stufe={p.mahn_stufe} /> : <span className="text-gray-200 text-[9px]">&mdash;</span>}
                    </td>
                    <td className="py-[5px] px-2">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-0.5 text-[8px] px-1.5 py-[1px] rounded-full font-medium bg-status-green-light text-status-green-dark">
                          <span className="w-1 h-1 rounded-full bg-status-green" />Bezahlt
                        </span>
                      ) : isOverdue ? (
                        <span className="inline-flex items-center gap-0.5 text-[8px] px-1.5 py-[1px] rounded-full font-medium bg-status-red-light text-status-red-dark">
                          <span className="w-1 h-1 rounded-full bg-brand-red" />Überfällig
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[8px] px-1.5 py-[1px] rounded-full font-medium bg-blue-50 text-blue-600">
                          <span className="w-1 h-1 rounded-full bg-blue-400" />Offen
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
