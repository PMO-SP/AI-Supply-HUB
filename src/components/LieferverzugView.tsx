"use client";

import { useMemo } from "react";
import { useStockouts } from "@/hooks/useStockouts";
import { useDelayByMonth } from "@/hooks/useDelayByMonth";
import type { StockoutWithUrgency, DelayByMonth } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const MONTH_NAMES_DE = [
  "", "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dez",
];

function formatDateDE(dateStr: string): string {
  if (!dateStr) return "—";
  const raw = dateStr.trim().toLowerCase();
  if (raw === "offline" || raw === "n/a" || raw === "-") return "—";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateShortDE(dateStr: string): string {
  if (!dateStr) return "—";
  const raw = dateStr.trim().toLowerCase();
  if (raw === "offline" || raw === "n/a" || raw === "-") return "—";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function delayRateColor(pct: number): string {
  if (pct <= 5) return "#22C55E";
  if (pct <= 15) return "#F59E0B";
  return "#E30613";
}

function delayRatePillClass(pct: number): string {
  if (pct <= 5) return "bg-[#dcfce7] text-[#166534]";
  if (pct <= 15) return "bg-[#fef3c7] text-[#92400e]";
  return "bg-[#fee2e2] text-[#991b1b]";
}

function urgencyDotClass(urgency: string): string {
  if (urgency === "soon") return "bg-[#378ADD]";
  if (urgency === "medium") return "bg-[#F59E0B]";
  if (urgency === "offline") return "bg-[#6B7280]";
  return "bg-[#E30613]";
}

function urgencyBadgeClass(urgency: string): string {
  if (urgency === "soon") return "bg-[#dcfce7] text-[#166534]";
  if (urgency === "medium") return "bg-[#fef3c7] text-[#92400e]";
  if (urgency === "offline") return "bg-gray-200 text-gray-700";
  return "bg-[#fee2e2] text-[#991b1b]";
}

function statusPill(stockout: StockoutWithUrgency): { label: string; cls: string } {
  if (stockout.status === "resolved") {
    return { label: "Resolved", cls: "bg-[#dcfce7] text-[#166534]" };
  }
  if (stockout.urgency === "offline") {
    return { label: "Offline", cls: "bg-gray-200 text-gray-700" };
  }
  if (stockout.days_until_available <= 7) {
    return { label: "Lieferung nah", cls: "bg-[#e0f2fe] text-[#0369a1]" };
  }
  if (stockout.days_until_available <= 21) {
    return { label: "OOS bald frei", cls: "bg-[#fef3c7] text-[#92400e]" };
  }
  return { label: "OOS aktiv", cls: "bg-[#fee2e2] text-[#991b1b]" };
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function LieferverzugView() {
  const { stockouts, isLoading: stockoutsLoading } = useStockouts();
  const { delays, isLoading: delaysLoading } = useDelayByMonth();

  // Active stockouts (with a date-based availability)
  const activeStockouts = useMemo(
    () => stockouts.filter((s) => s.status === "active" && s.urgency !== "offline"),
    [stockouts]
  );

  // Offline articles (available_from_date = "offline")
  const offlineArticles = useMemo(
    () => stockouts.filter((s) => s.status === "active" && s.urgency === "offline"),
    [stockouts]
  );

  // All active (including offline)
  const allActive = useMemo(
    () => stockouts.filter((s) => s.status === "active"),
    [stockouts]
  );

  // Resolved this week
  const resolvedThisWeek = useMemo(() => {
    return stockouts.filter((s) => s.status === "resolved").length;
  }, [stockouts]);

  // Get last 7 months of aggregate delay data for bar chart
  const monthlyDelayRates = useMemo(() => {
    const monthMap = new Map<string, { total: number; delayed: number; year: number; month: number }>();
    for (const d of delays) {
      const key = `${d.year}-${d.month}`;
      const existing = monthMap.get(key);
      if (existing) {
        existing.total += d.total_orders;
        existing.delayed += d.delayed_orders;
      } else {
        monthMap.set(key, { total: d.total_orders, delayed: d.delayed_orders, year: d.year, month: d.month });
      }
    }

    const sorted = Array.from(monthMap.values())
      .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);

    return sorted.slice(-7).map((m) => ({
      year: m.year,
      month: m.month,
      label: MONTH_NAMES_DE[m.month] || `M${m.month}`,
      rate: m.total > 0 ? Math.round((m.delayed / m.total) * 100) : 0,
    }));
  }, [delays]);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Average delay rate for last 3 months
  const avg3MonthRate = useMemo(() => {
    const last3 = monthlyDelayRates.slice(-3);
    if (last3.length === 0) return 0;
    return Math.round(last3.reduce((s, m) => s + m.rate, 0) / last3.length);
  }, [monthlyDelayRates]);

  // Current month rate for topbar badge
  const currentMonthRate = useMemo(() => {
    const cur = monthlyDelayRates.find((m) => m.year === currentYear && m.month === currentMonth);
    return cur?.rate ?? 0;
  }, [monthlyDelayRates, currentMonth, currentYear]);

  // Longest current delay
  const longestDelay = useMemo(() => {
    if (allActive.length === 0) return null;
    return allActive.reduce((max, s) => s.delay_days > max.delay_days ? s : max, allActive[0]);
  }, [allActive]);

  // Max rate for bar chart scaling
  const maxBarRate = useMemo(() => {
    const maxRate = Math.max(...monthlyDelayRates.map((m) => m.rate), 5);
    return Math.ceil(maxRate / 5) * 5; // round up to nearest 5
  }, [monthlyDelayRates]);

  // Per-article delay data for detail table (last 4 months)
  const last4Months = useMemo(() => {
    const sorted = monthlyDelayRates.slice(-4);
    return sorted.map((m) => ({ year: m.year, month: m.month, label: m.label }));
  }, [monthlyDelayRates]);

  // Map article delays for detail table
  const articleDelayMap = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const d of delays) {
      const artKey = d.article_id;
      if (!map.has(artKey)) map.set(artKey, new Map());
      map.get(artKey)!.set(`${d.year}-${d.month}`, d.delay_rate_pct);
    }
    return map;
  }, [delays]);

  if (stockoutsLoading || delaysLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-gray-400">Lade Lieferverzugdaten...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[14px]">
      {/* ---- KPI Cards ---- */}
      <div className="grid grid-cols-4 gap-[10px]">
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-[11px] text-gray-500 uppercase tracking-[0.5px] mb-1">
            Aktuelle Stockouts
          </div>
          <div className={`text-[20px] font-medium ${allActive.length > 0 ? "text-[#E30613]" : "text-gray-900"}`}>
            {allActive.length}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">Artikel derzeit OOS</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-[11px] text-gray-500 uppercase tracking-[0.5px] mb-1">
            Ø Verzugsquote
          </div>
          <div className="text-[20px] font-medium" style={{ color: delayRateColor(avg3MonthRate) }}>
            {avg3MonthRate}<span className="text-[14px]">%</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">letzte 3 Monate</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-[11px] text-gray-500 uppercase tracking-[0.5px] mb-1">
            Längster Verzug
          </div>
          <div className="text-[20px] font-medium text-[#E30613]">
            {longestDelay ? `${longestDelay.delay_days} Tage` : "—"}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5 truncate">
            {longestDelay ? longestDelay.article_name : "Kein Verzug"}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-[11px] text-gray-500 uppercase tracking-[0.5px] mb-1">
            Wieder verfügbar
          </div>
          <div className="text-[20px] font-medium text-gray-900">
            {resolvedThisWeek}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">Artikel diese Woche</div>
        </div>
      </div>

      {/* ---- Offline Articles Alert ---- */}
      {offlineArticles.length > 0 && (
        <div className="bg-gray-50 rounded-lg border border-gray-300 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-500" />
            <span className="text-[12px] font-medium text-gray-700 uppercase tracking-[0.5px]">
              Offline-Artikel — kein Verfügbarkeitsdatum ({offlineArticles.length})
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {offlineArticles.map((s) => (
              <div key={s.article_id} className="flex items-center gap-2 py-1">
                <span className="inline-block w-[6px] h-[6px] rounded-full bg-gray-400 flex-shrink-0" />
                <span className="text-[12px] font-medium text-gray-900 truncate flex-1">{s.article_name}</span>
                <span className="text-[11px] text-gray-500 flex-shrink-0">seit {formatDateShortDE(s.oos_since_date)}</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 flex-shrink-0">
                  {s.affected_orders} Bestellungen
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Two-column section ---- */}
      <div className="grid grid-cols-2 gap-3">
        {/* Left: Bar chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-[12px] font-medium text-gray-500 uppercase tracking-[0.5px] mb-2">
            Lieferverzugsquote pro Monat
          </div>

          {/* Legend */}
          <div className="flex gap-3 mb-2">
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              <span className="inline-block w-[10px] h-[10px] bg-[#E30613] rounded-sm" />
              Verzugsquote
            </span>
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              <span className="inline-block w-[10px] h-[10px] bg-gray-100 border border-gray-300 rounded-sm" />
              Ziel &le; 5%
            </span>
          </div>

          {/* Bars */}
          <div className="flex items-end gap-1.5 h-[90px] mt-2">
            {monthlyDelayRates.map((m) => {
              const isCurrent = m.year === currentYear && m.month === currentMonth;
              const barHeight = Math.max(3, (m.rate / maxBarRate) * 100);
              const color = delayRateColor(m.rate);
              return (
                <div key={`${m.year}-${m.month}`} className="flex flex-col items-center gap-[3px] flex-1">
                  <div className="text-[10px] font-medium" style={{ color }}>
                    {m.rate}%
                  </div>
                  <div className="flex flex-col justify-end w-full h-[60px]">
                    <div
                      className="w-full rounded-t-sm"
                      style={{
                        height: `${barHeight}%`,
                        background: color,
                        border: isCurrent ? `2px solid ${color}` : "none",
                      }}
                    />
                  </div>
                  <div
                    className={`text-[10px] ${isCurrent ? "font-medium" : ""}`}
                    style={{ color: isCurrent ? color : undefined }}
                  >
                    {m.label}{isCurrent ? " \u25CF" : ""}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer stats */}
          <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex justify-between text-[11px] text-gray-500">
            <span>
              Zielwert: <span className="text-[#22C55E] font-medium">&le; 5%</span>
            </span>
            <span>
              Ø letzte 3 Monate:{" "}
              <span className="font-medium" style={{ color: delayRateColor(avg3MonthRate) }}>
                {avg3MonthRate}%
              </span>
            </span>
          </div>
        </div>

        {/* Right: Stockout list with availability */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-[12px] font-medium text-gray-500 uppercase tracking-[0.5px] mb-2">
            Aktuelle Stockouts — Wiederverfügbarkeit
          </div>

          <div className="flex flex-col">
            {activeStockouts.length === 0 && offlineArticles.length === 0 ? (
              <div className="py-6 text-center text-[12px] text-gray-400">
                Keine aktiven Stockouts
              </div>
            ) : (
              <>
                {activeStockouts
                  .sort((a, b) => a.available_from_date.localeCompare(b.available_from_date))
                  .map((s) => (
                    <div
                      key={`${s.article_id}-${s.oos_since_date}`}
                      className="flex items-center gap-2 py-[7px] border-b border-gray-100 last:border-b-0"
                    >
                      <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${urgencyDotClass(s.urgency)}`} />
                      <span className="text-[12px] font-medium text-gray-900 flex-1 min-w-0 truncate">
                        {s.article_name}
                      </span>
                      <span className="text-[11px] text-gray-500 flex-shrink-0 mr-1.5">
                        seit {formatDateShortDE(s.oos_since_date)}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${urgencyBadgeClass(s.urgency)}`}>
                        verfügbar ab {formatDateShortDE(s.available_from_date)}
                      </span>
                    </div>
                  ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ---- Detail Table ---- */}
      <div>
        <div className="text-[12px] font-medium text-gray-500 uppercase tracking-[0.5px] mb-2">
          Lieferverzüge je Artikel & Monat
        </div>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-[0.4px] border-b border-gray-200">
                    Artikel
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-[0.4px] border-b border-gray-200">
                    OOS seit
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-[0.4px] border-b border-gray-200 min-w-[140px]">
                    Verzug (Tage)
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-[0.4px] border-b border-gray-200">
                    Verfügbar ab
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-[0.4px] border-b border-gray-200">
                    Betroffene Bestellungen
                  </th>
                  {last4Months.map((m) => (
                    <th
                      key={`${m.year}-${m.month}`}
                      className="px-3 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-[0.4px] border-b border-gray-200"
                    >
                      {m.label}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-[0.4px] border-b border-gray-200">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {stockouts.length === 0 ? (
                  <tr>
                    <td colSpan={6 + last4Months.length} className="px-3 py-8 text-center text-gray-400">
                      Keine Lieferverzüge vorhanden
                    </td>
                  </tr>
                ) : (
                  stockouts
                    .filter((s) => s.status === "active")
                    .sort((a, b) => b.delay_days - a.delay_days)
                    .map((s) => {
                      const sp = statusPill(s);
                      const maxDelay = Math.max(...stockouts.map((x) => x.delay_days), 1);
                      const barPct = Math.round((s.delay_days / maxDelay) * 100);
                      const barColor = s.delay_days > 30 ? "#E30613" : s.delay_days > 14 ? "#F59E0B" : "#378ADD";
                      const isOffline = s.urgency === "offline";
                      const dateColor = isOffline ? "#6B7280" : s.days_until_available > 21 ? "#E30613" : s.days_until_available > 7 ? "#F59E0B" : "#378ADD";
                      const artDelays = articleDelayMap.get(s.article_id);

                      return (
                        <tr key={`${s.article_id}-${s.oos_since_date}`} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50">
                          <td className="px-3 py-2.5 font-medium text-gray-900">
                            {s.article_name}
                          </td>
                          <td className="px-3 py-2.5 text-gray-700">
                            {formatDateDE(s.oos_since_date)}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 h-[5px] bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${barPct}%`, background: barColor }}
                                />
                              </div>
                              <span className="text-[11px] font-medium flex-shrink-0" style={{ color: barColor }}>
                                {s.delay_days}T
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 font-medium" style={{ color: dateColor }}>
                            {isOffline ? "Offline" : formatDateDE(s.available_from_date)}
                          </td>
                          <td className="px-3 py-2.5 text-gray-700">
                            {s.affected_orders} Bestellungen
                          </td>
                          {last4Months.map((m) => {
                            const rate = artDelays?.get(`${m.year}-${m.month}`) ?? 0;
                            return (
                              <td key={`${m.year}-${m.month}`} className="px-3 py-2.5">
                                <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${delayRatePillClass(rate)}`}>
                                  {Math.round(rate)}%
                                </span>
                              </td>
                            );
                          })}
                          <td className="px-3 py-2.5">
                            <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${sp.cls}`}>
                              {sp.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
