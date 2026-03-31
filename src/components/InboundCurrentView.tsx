"use client";

import { useInboundOrders } from "@/hooks/useInboundOrders";

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}.${m[2]}.${m[1]}`;
  return iso;
}

export default function InboundCurrentView() {
  const { orders, isLoading } = useInboundOrders();

  return (
    <div className="p-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded bg-blue-50 flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
            <path d="M1 13.5c2 2 5 2 8 0s6-2 8 0" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M4 13V8l5-3.5L14 8v5" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 4.5V2" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <h2 className="text-[13px] font-semibold text-gray-900 leading-tight">Inbound Plan — Aktuelle Bestellungen</h2>
          <p className="text-[9px] text-gray-500">Übersicht aller laufenden Bestellungen mit ETD, ETA und Warehouse-Datum</p>
        </div>
        {orders.length > 0 && (
          <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
            {orders.length} Bestellungen
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400 text-[11px]">Daten werden geladen...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[11px] text-gray-400 font-medium">Keine Bestellungen vorhanden</p>
          <p className="text-[10px] text-gray-400 mt-1">
            Bitte <span className="font-medium">&quot;inbound_orders&quot;</span> im Google Sheet befüllen.
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
                <th className="text-center px-2 py-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[8px]">Mix/Single</th>
                <th className="text-center px-2 py-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[8px]">ETD Plan</th>
                <th className="text-center px-2 py-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[8px]">ETD Fwd.</th>
                <th className="text-center px-2 py-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[8px]">ETD Status</th>
                <th className="text-center px-2 py-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[8px]">ETA</th>
                <th className="text-center px-2 py-1.5 font-semibold text-gray-500 uppercase tracking-wider text-[8px]">Warehouse</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.order_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-2 py-1 font-medium text-gray-800">{o.order_id}</td>
                  <td className="px-2 py-1 text-gray-600">{o.article_id}</td>
                  <td className="px-2 py-1 text-gray-600">{o.supplier_id}</td>
                  <td className="px-2 py-1 text-right font-medium text-gray-800">{o.order_quantity.toLocaleString("de-DE")}</td>
                  <td className="px-2 py-1 text-center">
                    <span className={`px-1 py-0.5 rounded text-[8px] font-medium ${
                      o.mix_or_single?.toLowerCase() === "mix"
                        ? "bg-purple-50 text-purple-700"
                        : "bg-blue-50 text-blue-700"
                    }`}>
                      {o.mix_or_single || "—"}
                    </span>
                  </td>
                  <td className="px-2 py-1 text-center text-gray-500">{fmtDate(o.etd_shipping_plan)}</td>
                  <td className="px-2 py-1 text-center text-gray-500">{fmtDate(o.etd_forwarder)}</td>
                  <td className="px-2 py-1 text-center">
                    {o.etd_status ? (
                      <span className={`px-1 py-0.5 rounded text-[8px] font-medium ${
                        o.etd_status === "confirmed" ? "bg-green-50 text-green-700"
                          : o.etd_status === "delayed" ? "bg-red-50 text-red-700"
                          : "bg-yellow-50 text-yellow-700"
                      }`}>
                        {o.etd_status}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-2 py-1 text-center text-gray-500">{fmtDate(o.eta)}</td>
                  <td className="px-2 py-1 text-center text-gray-500">{fmtDate(o.warehouse_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
