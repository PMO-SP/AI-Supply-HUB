"use client";

import { useState, Fragment, useMemo } from "react";
import { usePerformance } from "@/hooks/usePerformance";
import { useStockouts } from "@/hooks/useStockouts";
import type { ArticlePerformance } from "@/hooks/usePerformance";
import type { ShipmentPlan, SafetyStockBreakdown, PerformanceInfo } from "@/lib/types";

interface TableViewProps {
  plans: ShipmentPlan[];
  onOverride: (plan: ShipmentPlan) => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function parseSafetyBreakdown(plan: ShipmentPlan): SafetyStockBreakdown | null {
  if (!plan.safety_stock_breakdown) return null;
  try {
    return typeof plan.safety_stock_breakdown === "string"
      ? JSON.parse(plan.safety_stock_breakdown)
      : plan.safety_stock_breakdown;
  } catch { return null; }
}

function parsePerformanceInfo(plan: ShipmentPlan): PerformanceInfo | null {
  if (!plan.performance_info) return null;
  try {
    return typeof plan.performance_info === "string"
      ? JSON.parse(plan.performance_info)
      : plan.performance_info;
  } catch { return null; }
}

/* ------------------------------------------------------------------ */
/* Performance Badge (reusable)                                        */
/* ------------------------------------------------------------------ */
function PerformanceBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const color = pct >= 90 ? "bg-status-green/10 text-status-green" :
                pct >= 70 ? "bg-status-amber/10 text-status-amber" :
                "bg-brand-red/10 text-brand-red";
  return (
    <span className={`inline-block text-[8px] px-1.5 py-[1px] rounded font-mono font-medium ${color}`}>
      {pct.toFixed(0)}%
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* 3-Month Trend Indicator                                             */
/* ------------------------------------------------------------------ */
function TrendIndicator({ perf, isOffline }: { perf: ArticlePerformance | undefined; isOffline: boolean }) {
  if (isOffline) {
    return <span className="ml-1.5 text-[7px] px-1.5 py-[1px] rounded bg-gray-800 text-white font-medium">OFFLINE</span>;
  }
  if (!perf || !perf.trend_3m) return null;

  const config: Record<string, { dot: string; text: string; short: string; label: string }> = {
    "Unterperformance": { dot: "bg-brand-red", text: "text-brand-red", short: "3M ↓", label: "Forecast prufen, 3 Monate Unterperformance" },
    "Uberperformance": { dot: "bg-status-amber", text: "text-status-amber", short: "3M ↑", label: "Forecast prufen, 3 Monate Uberperformance" },
    "OK": { dot: "bg-status-green", text: "text-status-green", short: "OK", label: "OK" },
  };
  const c = config[perf.trend_3m];
  if (!c) return null;

  return (
    <span className="group relative inline-flex items-center gap-1 ml-1.5">
      <span className={`inline-block w-[6px] h-[6px] rounded-full ${c.dot}`} />
      {perf.trend_3m !== "OK" && (
        <span className={`text-[8px] font-medium ${c.text}`}>{c.short}</span>
      )}
      <span className="hidden group-hover:block absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-brand-black text-white text-[8px] rounded whitespace-nowrap shadow-lg">
        {c.label}
        <br />M-3: {perf.performance_m3.toFixed(0)}% | M-2: {perf.performance_m2.toFixed(0)}% | M-1: {perf.performance_m1.toFixed(0)}%
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Status dot                                                          */
/* ------------------------------------------------------------------ */
function StatusDot({ color }: { color: string }) {
  const dotColor =
    color === "green" ? "bg-status-green" :
    color === "yellow" ? "bg-status-amber" :
    "bg-brand-red";
  return <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${dotColor}`} />;
}

/* ------------------------------------------------------------------ */
/* Stock progress bar                                                  */
/* ------------------------------------------------------------------ */
function StockBar({ coverage }: { coverage: number }) {
  const pct = Math.min(100, Math.max(0, (coverage / 3) * 100));
  const barColor =
    coverage >= 2 ? "bg-status-green" :
    coverage >= 1 ? "bg-status-amber" :
    "bg-brand-red";
  return (
    <div className="w-[80px] bg-gray-100 rounded h-[5px] overflow-hidden inline-block align-middle mr-1.5">
      <div className={`h-full rounded ${barColor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Container pill                                                      */
/* ------------------------------------------------------------------ */
function ContainerPill({ count, status }: { count: number; status: string }) {
  const pillClass =
    status === "green" ? "bg-status-green-light text-status-green-dark" :
    status === "yellow" ? "bg-status-amber-light text-status-amber-dark" :
    "bg-status-red-light text-status-red-dark";
  return (
    <span className={`inline-block text-[10px] px-2 py-[2px] rounded-full font-medium ${pillClass}`}>
      {count} Container
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Safety stock tooltip                                                */
/* ------------------------------------------------------------------ */
function SafetyStockTooltip({ breakdown }: { breakdown: SafetyStockBreakdown }) {
  return (
    <div className="absolute z-50 bg-brand-black text-white text-[11px] rounded-lg p-3 shadow-xl w-60 left-0 top-full mt-1">
      <div className="font-medium mb-2 text-gray-300 uppercase tracking-[0.3px] text-[10px]">
        Safety Stock Breakdown
      </div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-400">Avg daily sales</span>
          <span className="font-mono">{breakdown.avg_daily_sales}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Transit days</span>
          <span className="font-mono">{breakdown.transit_days}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Uncertainty (&sigma;)</span>
          <span className="font-mono">{breakdown.uncertainty_factor}x</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Sell-through</span>
          <span className="font-mono">{breakdown.sell_through_multiplier}x ({breakdown.sell_through_tier})</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Seasonality</span>
          <span className="font-mono">{breakdown.seasonality_coefficient}x</span>
        </div>
        <div className="border-t border-brand-gray-900 mt-1.5 pt-1.5 flex justify-between font-medium">
          <span>Result</span>
          <span className="font-mono">{breakdown.safety_stock_units} St.</span>
        </div>
      </div>
      <div className="absolute -top-1 left-6 w-2 h-2 bg-brand-black rotate-45" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Expanded detail row                                                 */
/* ------------------------------------------------------------------ */
function ExpandedRow({ plan }: { plan: ShipmentPlan }) {
  const breakdown = parseSafetyBreakdown(plan);
  const perf = parsePerformanceInfo(plan);

  return (
    <tr>
      <td colSpan={8} className="px-3 py-3 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
          {/* Stock info card */}
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="font-medium text-gray-700 mb-2 text-[10px] uppercase tracking-[0.3px]">
              Bestandsstatus
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Aktueller Bestand</span>
                <span className="font-mono font-medium">{plan.current_stock_units.toLocaleString()} St.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Deckung</span>
                <span className="font-mono font-medium">{plan.stock_coverage_months} Monate</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Nach Abzug Bestand</span>
                <span className="font-mono">{plan.units_needed_after_stock.toLocaleString()} St.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">+ Safety Stock</span>
                <span className="font-mono">{plan.safety_stock_units.toLocaleString()} St.</span>
              </div>
              <div className="border-t border-gray-200 pt-1 flex justify-between font-medium">
                <span className="text-gray-700">Gesamtbedarf</span>
                <span className="font-mono">{plan.total_units_needed.toLocaleString()} St.</span>
              </div>
            </div>
          </div>

          {/* Safety stock card */}
          {breakdown && (
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="font-medium text-gray-700 mb-2 text-[10px] uppercase tracking-[0.3px]">
                Safety Stock Formel
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Avg Tagesverkauf</span>
                  <span className="font-mono">{breakdown.avg_daily_sales}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Transittage</span>
                  <span className="font-mono">{breakdown.transit_days}d</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Unsicherheit (&sigma;)</span>
                  <span className="font-mono">{breakdown.uncertainty_factor}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sell-through</span>
                  <span className="font-mono">{breakdown.sell_through_multiplier}x
                    <span className={`ml-1 inline-block px-1 rounded text-[9px] ${
                      breakdown.sell_through_tier === "fast" ? "bg-brand-red/10 text-brand-red" :
                      breakdown.sell_through_tier === "medium" ? "bg-gray-100 text-gray-600" :
                      "bg-status-amber-light text-status-amber-dark"
                    }`}>{breakdown.sell_through_tier}</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Saisonalitat</span>
                  <span className="font-mono">{breakdown.seasonality_coefficient}x</span>
                </div>
                <div className="border-t border-gray-200 pt-1 flex justify-between font-medium">
                  <span className="text-gray-700">Ergebnis</span>
                  <span className="font-mono">{breakdown.safety_stock_units} St.</span>
                </div>
              </div>
            </div>
          )}

          {/* Performance card */}
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="font-medium text-gray-700 mb-2 text-[10px] uppercase tracking-[0.3px]">
              Performance
            </div>
            {perf ? (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Forecast</span>
                  <span className="font-mono">{perf.forecast_target.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tatsachlich</span>
                  <span className="font-mono">{perf.actual_units_sold.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Abweichung</span>
                  <span className={`font-mono font-medium ${
                    Math.abs(perf.variance_pct) > 25 ? "text-brand-red" :
                    Math.abs(perf.variance_pct) > 10 ? "text-status-amber" :
                    "text-status-green"
                  }`}>
                    {perf.variance_pct > 0 ? "+" : ""}{perf.variance_pct}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Aktion</span>
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-medium ${
                    perf.flag === "accelerate" ? "bg-brand-red/10 text-brand-red" :
                    perf.flag === "delay" ? "bg-blue-50 text-blue-700" :
                    "bg-status-green-light text-status-green-dark"
                  }`}>
                    {perf.flag === "accelerate" ? "BESCHLEUNIGEN" :
                     perf.flag === "delay" ? "VERZOGERN" : "PLANMASSIG"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 italic">Nur fur aktuellen Monat verfugbar</p>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

/* ================================================================== */
/* MAIN TABLE COMPONENT                                                */
/* ================================================================== */
export default function TableView({ plans, onOverride }: TableViewProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [hoveredSafety, setHoveredSafety] = useState<string | null>(null);
  const { performance } = usePerformance();
  const { stockouts } = useStockouts();

  // Build lookup map for performance data
  const perfMap = new Map<string, ArticlePerformance>();
  for (const p of performance) {
    perfMap.set(p.article_id, p);
  }

  // Offline articles set
  const offlineSet = useMemo(() => {
    const set = new Set<string>();
    for (const s of stockouts) {
      if (s.status === "active" && (s.available_from_date === "offline" || s.available_from_date === "")) {
        set.add(s.article_id);
      }
    }
    return set;
  }, [stockouts]);

  const toggleRow = (key: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (plans.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-[12px]">
        Keine Plandaten vorhanden. &quot;Google Sheets sync&quot; klicken.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left py-[9px] px-3 font-medium text-gray-500 text-[11px] uppercase tracking-[0.4px] border-b border-gray-200">
              Status
            </th>
            <th className="text-left py-[9px] px-3 font-medium text-gray-500 text-[11px] uppercase tracking-[0.4px] border-b border-gray-200">
              Artikel
            </th>
            <th className="text-left py-[9px] px-3 font-medium text-gray-500 text-[11px] uppercase tracking-[0.4px] border-b border-gray-200">
              Lagerbestand
            </th>
            <th className="text-left py-[9px] px-3 font-medium text-gray-500 text-[11px] uppercase tracking-[0.4px] border-b border-gray-200">
              Safety Stock
            </th>
            <th className="text-left py-[9px] px-3 font-medium text-gray-500 text-[11px] uppercase tracking-[0.4px] border-b border-gray-200">
              Nachster Versand
            </th>
            <th className="text-left py-[9px] px-3 font-medium text-gray-500 text-[11px] uppercase tracking-[0.4px] border-b border-gray-200">
              Container
            </th>
            <th className="text-left py-[9px] px-3 font-medium text-gray-500 text-[11px] uppercase tracking-[0.4px] border-b border-gray-200">
              Performance
            </th>
            <th className="w-8 border-b border-gray-200"></th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => {
            const rowKey = `${plan.article_id}-${plan.year}-${plan.month}`;
            const isExpanded = expandedRows.has(rowKey);
            const breakdown = parseSafetyBreakdown(plan);
            const perf = parsePerformanceInfo(plan);
            const statusColor = plan.status_color || "green";
            const isOverdue = plan.warning_type?.includes("past");

            // Get monthly_performance data for this article
            const articlePerf = perfMap.get(plan.article_id);

            return (
              <Fragment key={rowKey}>
                <tr
                  className="border-b border-gray-100 table-row-hover cursor-pointer transition-colors"
                  onClick={() => toggleRow(rowKey)}
                >
                  {/* Status dot */}
                  <td className="py-[10px] px-3">
                    <StatusDot color={statusColor} />
                  </td>

                  {/* Article name + performance badge + trend */}
                  <td className="py-[10px] px-3">
                    <div className="flex items-center gap-1">
                      {!offlineSet.has(plan.article_id) && <PerformanceBadge pct={articlePerf?.current_month_pct ?? null} />}
                      <span className="font-medium text-gray-900">{plan.article_name}</span>
                      {plan.is_overridden && (
                        <span className="text-[9px] text-brand-red font-normal">*</span>
                      )}
                      <TrendIndicator perf={articlePerf} isOffline={offlineSet.has(plan.article_id)} />
                    </div>
                  </td>

                  {/* Stock with progress bar */}
                  <td className="py-[10px] px-3">
                    <div className="flex items-center">
                      <StockBar coverage={plan.stock_coverage_months} />
                      <span className="text-gray-700">{plan.current_stock_units.toLocaleString()} St.</span>
                    </div>
                  </td>

                  {/* Safety stock with tooltip */}
                  <td className="py-[10px] px-3 relative">
                    <div
                      className="inline-block cursor-help"
                      onMouseEnter={(e) => { e.stopPropagation(); setHoveredSafety(rowKey); }}
                      onMouseLeave={() => setHoveredSafety(null)}
                    >
                      <span className="text-gray-700">
                        {plan.safety_stock_units.toLocaleString()} St.
                      </span>
                      {breakdown && (
                        <span className="ml-1 text-gray-400 text-[10px]">
                          &sigma;{"\u00D7"}{breakdown.uncertainty_factor} S{"\u00D7"}{breakdown.seasonality_coefficient}
                        </span>
                      )}
                      {hoveredSafety === rowKey && breakdown && (
                        <SafetyStockTooltip breakdown={breakdown} />
                      )}
                    </div>
                  </td>

                  {/* Next ship date */}
                  <td className="py-[10px] px-3">
                    {isOverdue ? (
                      <span className="text-brand-red font-medium">UBERFALLIG</span>
                    ) : (
                      <span className="text-gray-700">{formatDate(plan.ship_date)}</span>
                    )}
                  </td>

                  {/* Container pill */}
                  <td className="py-[10px] px-3">
                    <ContainerPill count={plan.containers_needed} status={statusColor} />
                  </td>

                  {/* Performance variance */}
                  <td className="py-[10px] px-3">
                    {perf ? (
                      <span className={`text-[11px] font-medium ${
                        Math.abs(perf.variance_pct) > 25 ? "text-brand-red" :
                        Math.abs(perf.variance_pct) > 10 ? "text-status-amber" :
                        "text-status-green"
                      }`}>
                        {perf.variance_pct > 0 ? "+" : ""}{perf.variance_pct}% vs. Plan
                      </span>
                    ) : (
                      <span className="text-gray-300">&mdash;</span>
                    )}
                  </td>

                  {/* Edit button */}
                  <td className="py-[10px] px-3 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); onOverride(plan); }}
                      className="text-brand-red hover:text-brand-red-dark text-[10px] font-medium"
                    >
                      Edit
                    </button>
                  </td>
                </tr>

                {isExpanded && <ExpandedRow key={`${rowKey}-exp`} plan={plan} />}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
