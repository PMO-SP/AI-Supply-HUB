"use client";

import { useMemo, useState } from "react";
import { useInProduction } from "@/hooks/useInProduction";

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

export default function InProductionView() {
  const { orders, isLoading } = useInProduction();
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [selectedArticle, setSelectedArticle] = useState<string>("all");

  const supplierList = useMemo(() => {
    const seen = new Map<string, string>();
    for (const o of orders) {
      if (!seen.has(o.supplier_id)) seen.set(o.supplier_id, o.supplier_name || o.supplier_id);
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [orders]);

  const articleList = useMemo(() => {
    const base = selectedSupplier === "all" ? orders : orders.filter((o) => o.supplier_id === selectedSupplier);
    const seen = new Map<string, string>();
    for (const o of base) {
      if (!seen.has(o.article_id)) seen.set(o.article_id, o.article_name || o.article_id);
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [orders, selectedSupplier]);

  const filtered = useMemo(() => {
    let result = orders;
    if (selectedSupplier !== "all") result = result.filter((o) => o.supplier_id === selectedSupplier);
    if (selectedArticle !== "all") result = result.filter((o) => o.article_id === selectedArticle);
    return result;
  }, [orders, selectedSupplier, selectedArticle]);

  const stats = useMemo(() => {
    const totalOrders = filtered.length;
    const totalUnits = filtered.reduce((s, o) => s + o.order_quantity, 0);
    const totalDeposit = filtered.reduce((s, o) => s + o.deposit_paid_eur, 0);
    const uniqueSuppliers = new Set(filtered.map((o) => o.supplier_id)).size;
    const uniqueArticles = new Set(filtered.map((o) => o.article_id)).size;
    return { totalOrders, totalUnits, totalDeposit, uniqueSuppliers, uniqueArticles };
  }, [filtered]);

  const statusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === "confirmed") return "bg-emerald-50 text-emerald-700";
    if (s === "delayed") return "bg-red-50 text-red-700";
    if (s === "pending") return "bg-amber-50 text-amber-700";
    return "bg-gray-50 text-gray-600";
  };

  return (
    <div className="p-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded bg-violet-50 flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 12V6l3-2v2l3-2v2l3-2v6" stroke="#7c3aed" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M1 12h12V4l-3 2V4" stroke="#7c3aed" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="4" y="9" width="2" height="3" fill="#7c3aed" opacity="0.4" />
            <rect x="8" y="9" width="2" height="3" fill="#7c3aed" opacity="0.4" />
          </svg>
        </div>
        <div>
          <h2 className="text-[13px] font-semibold text-gray-900 leading-tight">In Production</h2>
          <p className="text-[9px] text-gray-500">Offene Bestellungen in Produktion — Anzahlung geleistet, noch nicht verschifft</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-2">
          <label className="text-[9px] font-medium text-gray-500 uppercase tracking-[0.4px]">Hersteller</label>
          <select
            value={selectedSupplier}
            onChange={(e) => { setSelectedSupplier(e.target.value); setSelectedArticle("all"); }}
            className="text-[10px] border border-gray-200 rounded px-2 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400/30"
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
            className="text-[10px] border border-gray-200 rounded px-2 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400/30"
          >
            <option value="all">Alle Artikel</option>
            {articleList.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        {(selectedSupplier !== "all" || selectedArticle !== "all") && (
          <button onClick={() => { setSelectedSupplier("all"); setSelectedArticle("all"); }} className="text-[9px] text-violet-600 hover:underline">Filter entfernen</button>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-5 gap-2 mb-3">
        <div className="bg-white rounded border border-gray-200 px-2.5 py-2">
          <div className="text-[8px] text-gray-500 uppercase tracking-wider">Bestellungen</div>
          <div className="text-[16px] font-semibold text-gray-900 leading-tight">{stats.totalOrders}</div>
          <div className="text-[8px] text-gray-400">{stats.totalUnits.toLocaleString("de-DE")} Stk.</div>
        </div>
        <div className="bg-white rounded border border-gray-200 px-2.5 py-2">
          <div className="text-[8px] text-gray-500 uppercase tracking-wider">Hersteller</div>
          <div className="text-[16px] font-semibold text-gray-900 leading-tight">{stats.uniqueSuppliers}</div>
        </div>
        <div className="bg-white rounded border border-gray-200 px-2.5 py-2">
          <div className="text-[8px] text-gray-500 uppercase tracking-wider">Artikel</div>
          <div className="text-[16px] font-semibold text-gray-900 leading-tight">{stats.uniqueArticles}</div>
        </div>
        <div className="bg-white rounded border border-gray-200 px-2.5 py-2">
          <div className="text-[8px] text-gray-500 uppercase tracking-wider">Anzahlungen geleistet</div>
          <div className="text-[14px] font-semibold text-emerald-600 leading-tight">{fmtEur(stats.totalDeposit)}</div>
        </div>
        <div className="bg-white rounded border border-gray-200 px-2.5 py-2">
          <div className="text-[8px] text-gray-500 uppercase tracking-wider">Gepl. Versand</div>
          <div className="text-[14px] font-semibold text-violet-600 leading-tight">
            {filtered.filter((o) => o.etd_shipping_plan).length} / {filtered.length}
          </div>
          <div className="text-[8px] text-gray-400">mit ETD</div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400 text-[11px]">Daten werden geladen...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[11px] text-gray-400 font-medium">
            {selectedSupplier !== "all" || selectedArticle !== "all" ? "Keine Bestellungen für diese Auswahl" : "Keine Bestellungen in Produktion"}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            Bitte <span className="font-medium">&quot;in_production&quot;</span> im Google Sheet befüllen.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-2 py-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[8px]">Order ID</th>
                <th className="text-left px-2 py-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[8px]">Artikel</th>
                <th className="text-left px-2 py-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[8px]">Lieferant</th>
                <th className="text-right px-2 py-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[8px]">Menge</th>
                <th className="text-right px-2 py-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[8px]">Anzahlung</th>
                <th className="text-center px-2 py-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[8px]">ETD Plan</th>
                <th className="text-center px-2 py-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[8px]">ETD Fwd.</th>
                <th className="text-center px-2 py-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[8px]">ETA</th>
                <th className="text-center px-2 py-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[8px]">Warehouse</th>
                <th className="text-center px-2 py-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[8px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.order_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-2 py-1 font-medium text-gray-800">{o.order_id}</td>
                  <td className="px-2 py-1 text-gray-600">{o.article_name || o.article_id}</td>
                  <td className="px-2 py-1 text-gray-600">{o.supplier_name || o.supplier_id}</td>
                  <td className="px-2 py-1 text-right font-medium text-gray-800">{o.order_quantity.toLocaleString("de-DE")}</td>
                  <td className="px-2 py-1 text-right text-emerald-700">{fmtEurFull(o.deposit_paid_eur)}</td>
                  <td className="px-2 py-1 text-center text-gray-500">{fmtDate(o.etd_shipping_plan)}</td>
                  <td className="px-2 py-1 text-center text-gray-500">{fmtDate(o.etd_forwarder)}</td>
                  <td className="px-2 py-1 text-center text-gray-500">{fmtDate(o.eta)}</td>
                  <td className="px-2 py-1 text-center text-gray-500">{fmtDate(o.warehouse_date)}</td>
                  <td className="px-2 py-1 text-center">
                    {o.etd_status ? (
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-medium ${statusColor(o.etd_status)}`}>
                        {o.etd_status}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
