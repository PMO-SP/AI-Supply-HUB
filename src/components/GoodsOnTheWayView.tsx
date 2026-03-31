"use client";

import { useMemo, useState } from "react";
import { useGoodsOnTheWay } from "@/hooks/useGoodsOnTheWay";

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}.${m[2]}.${m[1]}`;
  return iso;
}

function fmtEur(val: number): string {
  if (!val) return "—";
  return val.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " \u20AC";
}

function fmtEurFull(val: number): string {
  if (!val) return "—";
  return val.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " \u20AC";
}

function daysUntil(iso: string): number | null {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const target = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function GoodsOnTheWayView() {
  const { goods, isLoading } = useGoodsOnTheWay();
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [selectedArticle, setSelectedArticle] = useState<string>("all");

  // Supplier list for filter
  const supplierList = useMemo(() => {
    const seen = new Map<string, string>();
    for (const g of goods) {
      if (!seen.has(g.supplier_id)) seen.set(g.supplier_id, g.supplier_name || g.supplier_id);
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [goods]);

  // Article list for filter (based on supplier filter)
  const articleList = useMemo(() => {
    const base = selectedSupplier === "all" ? goods : goods.filter((g) => g.supplier_id === selectedSupplier);
    const seen = new Map<string, string>();
    for (const g of base) {
      if (!seen.has(g.article_id)) seen.set(g.article_id, g.article_name || g.article_id);
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [goods, selectedSupplier]);

  // Filtered goods
  const filtered = useMemo(() => {
    let result = goods;
    if (selectedSupplier !== "all") result = result.filter((g) => g.supplier_id === selectedSupplier);
    if (selectedArticle !== "all") result = result.filter((g) => g.article_id === selectedArticle);
    return result;
  }, [goods, selectedSupplier, selectedArticle]);

  const stats = useMemo(() => {
    const totalContainers = filtered.length;
    const totalVolume = filtered.reduce((s, g) => s + g.order_volume_eur, 0);
    const totalDeposit = filtered.reduce((s, g) => s + g.deposit_value_paid_eur, 0);
    const totalUnits = filtered.reduce((s, g) => s + g.order_quantity, 0);
    const balanceUnpaid = filtered.reduce((s, g) => s + g.balance_unpaid_eur, 0);
    let arrivingSoon = 0, delayed = 0;
    for (const g of filtered) {
      const d = daysUntil(g.eta);
      if (d !== null) {
        if (d < 0) delayed++;
        else if (d <= 14) arrivingSoon++;
      }
    }
    return { totalContainers, totalVolume, totalDeposit, totalUnits, balanceUnpaid, arrivingSoon, delayed };
  }, [filtered]);

  return (
    <div className="p-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
            <path d="M1 13.5c2 2 5 2 8 0s6-2 8 0" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M4 13V8l5-3.5L14 8v5" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 4.5V2" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <h2 className="text-[13px] font-semibold text-gray-900 leading-tight">Goods on the Way</h2>
          <p className="text-[9px] text-gray-500">Ware unterwegs — ETD, ETA, Warenwert & Anzahlungen</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-2">
          <label className="text-[9px] font-medium text-gray-500 uppercase tracking-[0.4px]">Hersteller</label>
          <select
            value={selectedSupplier}
            onChange={(e) => { setSelectedSupplier(e.target.value); setSelectedArticle("all"); }}
            className="text-[10px] border border-gray-200 rounded px-2 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400/30"
          >
            <option value="all">Alle Hersteller</option>
            {supplierList.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[9px] font-medium text-gray-500 uppercase tracking-[0.4px]">Artikel</label>
          <select
            value={selectedArticle}
            onChange={(e) => setSelectedArticle(e.target.value)}
            className="text-[10px] border border-gray-200 rounded px-2 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400/30"
          >
            <option value="all">Alle Artikel</option>
            {articleList.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        {(selectedSupplier !== "all" || selectedArticle !== "all") && (
          <button onClick={() => { setSelectedSupplier("all"); setSelectedArticle("all"); }} className="text-[9px] text-emerald-600 hover:underline">Filter entfernen</button>
        )}
      </div>

      {/* Compact KPI Row */}
      <div className="grid grid-cols-6 gap-2 mb-3">
        <div className="bg-white rounded border border-gray-200 px-2.5 py-2">
          <div className="text-[8px] text-gray-500 uppercase tracking-wider">Container</div>
          <div className="text-[16px] font-semibold text-gray-900 leading-tight">{stats.totalContainers}</div>
          <div className="text-[8px] text-gray-400">{stats.totalUnits.toLocaleString("de-DE")} Stk.</div>
        </div>
        <div className="bg-white rounded border border-gray-200 px-2.5 py-2">
          <div className="text-[8px] text-gray-500 uppercase tracking-wider">Warenwert</div>
          <div className="text-[14px] font-semibold text-gray-900 leading-tight">{fmtEur(stats.totalVolume)}</div>
        </div>
        <div className="bg-white rounded border border-gray-200 px-2.5 py-2">
          <div className="text-[8px] text-gray-500 uppercase tracking-wider">Anzahlungen</div>
          <div className="text-[14px] font-semibold text-emerald-600 leading-tight">{fmtEur(stats.totalDeposit)}</div>
        </div>
        <div className="bg-white rounded border border-gray-200 px-2.5 py-2">
          <div className="text-[8px] text-gray-500 uppercase tracking-wider">Offene Restzahlungen</div>
          <div className="text-[14px] font-semibold text-amber-600 leading-tight">{fmtEur(stats.balanceUnpaid)}</div>
        </div>
        <div className="bg-white rounded border border-gray-200 px-2.5 py-2">
          <div className="text-[8px] text-gray-500 uppercase tracking-wider">Bald da ≤14d</div>
          <div className="text-[16px] font-semibold text-blue-600 leading-tight">{stats.arrivingSoon}</div>
        </div>
        <div className="bg-white rounded border border-gray-200 px-2.5 py-2">
          <div className="text-[8px] text-gray-500 uppercase tracking-wider">Verzögert</div>
          <div className={`text-[16px] font-semibold leading-tight ${stats.delayed > 0 ? "text-red-600" : "text-gray-400"}`}>{stats.delayed}</div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400 text-[11px]">Daten werden geladen...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[11px] text-gray-400 font-medium">
            {selectedSupplier !== "all" || selectedArticle !== "all" ? "Keine Ware für diese Auswahl" : "Keine Ware unterwegs"}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            Bitte <span className="font-medium">&quot;goods_on_the_way&quot;</span> im Google Sheet befüllen.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-2 py-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[8px]">Order ID</th>
                <th className="text-left px-2 py-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[8px]">Lieferant</th>
                <th className="text-left px-2 py-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[8px]">Artikel</th>
                <th className="text-right px-2 py-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[8px]">Menge</th>
                <th className="text-center px-2 py-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[8px]">ETD Fwd.</th>
                <th className="text-center px-2 py-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[8px]">ETA</th>
                <th className="text-center px-2 py-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[8px]">Warehouse</th>
                <th className="text-right px-2 py-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[8px]">Warenwert</th>
                <th className="text-right px-2 py-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[8px]">Anzahlung</th>
                <th className="text-center px-2 py-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[8px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => {
                const d = daysUntil(g.eta);
                let statusLabel = "Transit";
                let statusClass = "bg-blue-50 text-blue-700";
                if (d !== null) {
                  if (d < 0) { statusLabel = `${Math.abs(d)}d verz.`; statusClass = "bg-red-50 text-red-700"; }
                  else if (d <= 14) { statusLabel = `${d}d`; statusClass = "bg-emerald-50 text-emerald-700"; }
                  else { statusLabel = `${d}d`; statusClass = "bg-blue-50 text-blue-700"; }
                }
                const restBetrag = g.order_volume_eur - g.deposit_value_paid_eur;

                return (
                  <tr key={g.order_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-2 py-1 font-medium text-gray-800">{g.order_id}</td>
                    <td className="px-2 py-1 text-gray-600">{g.supplier_name || g.supplier_id}</td>
                    <td className="px-2 py-1 text-gray-600">{g.article_name || g.article_id}</td>
                    <td className="px-2 py-1 text-right font-medium text-gray-800">{g.order_quantity.toLocaleString("de-DE")}</td>
                    <td className="px-2 py-1 text-center text-gray-500">{fmtDate(g.etd_forwarder)}</td>
                    <td className="px-2 py-1 text-center text-gray-500">{fmtDate(g.eta)}</td>
                    <td className="px-2 py-1 text-center text-gray-500">{fmtDate(g.warehouse_date)}</td>
                    <td className="px-2 py-1 text-right text-gray-700">{fmtEurFull(g.order_volume_eur)}</td>
                    <td className="px-2 py-1 text-right">
                      <span className="text-emerald-700">{fmtEurFull(g.deposit_value_paid_eur)}</span>
                      {restBetrag > 0 && (
                        <div className="text-[8px] text-amber-600 leading-tight">Rest: {fmtEurFull(restBetrag)}</div>
                      )}
                    </td>
                    <td className="px-2 py-1 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-medium ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
