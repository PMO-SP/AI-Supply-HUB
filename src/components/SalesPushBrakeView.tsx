"use client";

import { useMemo, useState } from "react";
import { usePerformance } from "@/hooks/usePerformance";
import type { ArticlePerformance } from "@/hooks/usePerformance";

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */
function formatNum(n: number): string {
  return n.toLocaleString("de-DE");
}

function perfColor(pct: number | null): string {
  if (pct === null) return "text-gray-400";
  if (pct >= 90) return "text-status-green";
  if (pct >= 70) return "text-status-amber";
  return "text-brand-red";
}

function perfBg(pct: number): string {
  if (pct >= 90) return "bg-status-green";
  if (pct >= 70) return "bg-status-amber";
  return "bg-brand-red";
}

function trendConfig(trend: string): { bg: string; text: string; short: string; label: string } {
  switch (trend) {
    case "Unterperformance": return { bg: "bg-brand-red", text: "text-brand-red", short: "3M ↓", label: "Forecast prufen, 3 Monate Unterperformance" };
    case "Uberperformance": return { bg: "bg-status-amber", text: "text-status-amber", short: "3M ↑", label: "Forecast prufen, 3 Monate Uberperformance" };
    case "OK": return { bg: "bg-status-green", text: "text-status-green", short: "OK", label: "OK" };
    default: return { bg: "bg-gray-200", text: "text-gray-400", short: "—", label: "Keine Daten" };
  }
}

type FilterType = "all" | "Sales puschen" | "Sales bremsen" | "Keine Aktion notwendig";

function deriveAction(item: ArticlePerformance): FilterType {
  if (item.current_month_pct === null) return "Keine Aktion notwendig";
  if (item.current_month_pct < 90) return "Sales puschen";
  if (item.current_month_pct > 110 || item.overstock_units > 0) return "Sales bremsen";
  return "Keine Aktion notwendig";
}

function actionBadge(action: FilterType) {
  switch (action) {
    case "Sales puschen": return { bg: "bg-brand-red/10 text-brand-red border-brand-red/20", icon: "▲" };
    case "Sales bremsen": return { bg: "bg-blue-50 text-blue-600 border-blue-200", icon: "▼" };
    default: return { bg: "bg-gray-50 text-gray-500 border-gray-200", icon: "—" };
  }
}

/* ------------------------------------------------------------------ */
/* Top 5 Card                                                          */
/* ------------------------------------------------------------------ */
function Top5Card({
  title, subtitle, items, colorAccent, emptyText, valueLabel,
}: {
  title: string; subtitle: string; items: ArticlePerformance[]; colorAccent: "red" | "green" | "amber"; emptyText: string; valueLabel: (item: ArticlePerformance) => string;
}) {
  const accentColors = {
    red: { header: "bg-brand-red/8 border-brand-red/15", dot: "bg-brand-red", text: "text-brand-red" },
    green: { header: "bg-status-green/8 border-status-green/15", dot: "bg-status-green", text: "text-status-green" },
    amber: { header: "bg-status-amber/8 border-status-amber/15", dot: "bg-status-amber", text: "text-status-amber" },
  };
  const c = accentColors[colorAccent];

  return (
    <div className="bg-white rounded border border-gray-100 overflow-hidden">
      <div className={`px-3 py-2 border-b ${c.header}`}>
        <div className="text-[10px] font-medium text-gray-600 uppercase tracking-[0.3px]">{title}</div>
        <div className="text-[8px] text-gray-400 mt-0.5">{subtitle}</div>
      </div>
      <div className="divide-y divide-gray-50">
        {items.length === 0 && <div className="px-3 py-4 text-[10px] text-gray-400 text-center">{emptyText}</div>}
        {items.map((item, idx) => {
          const pct = item.current_month_pct ?? 0;
          const barWidth = Math.min(100, Math.max(3, pct));
          return (
            <div key={item.article_id} className="px-3 py-1.5 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-center justify-between mb-0.5">
                <span className="flex items-center gap-1.5">
                  <span className={`text-[9px] font-mono w-3 text-right ${c.text}`}>{idx + 1}.</span>
                  <span className="text-[10px] font-medium text-gray-800 truncate max-w-[140px]" title={item.article_name}>{item.article_name}</span>
                </span>
                <span className={`text-[10px] font-mono font-medium ${perfColor(item.current_month_pct)}`}>
                  {valueLabel(item)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 ml-[18px]">
                <div className="flex-1 bg-gray-100 rounded-full h-[5px] overflow-hidden">
                  <div className={`h-full rounded-full ${perfBg(pct)}`} style={{ width: `${barWidth}%` }} />
                </div>
              </div>
              <div className="flex items-center justify-between mt-0.5 ml-[18px]">
                <span className="text-[8px] text-gray-400">
                  {formatNum(item.actual_units)} / {formatNum(item.forecast_units)} Stk
                </span>
                {item.overstock_units > 0 && (
                  <span className="text-[8px] px-1 py-[0px] rounded-full bg-status-amber/10 text-status-amber font-medium">
                    +{formatNum(item.overstock_units)} Overstock
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/* MAIN COMPONENT                                                      */
/* ================================================================== */
export default function SalesPushBrakeView() {
  const { performance, isLoading } = usePerformance();
  const [filter, setFilter] = useState<FilterType>("all");

  const withAction = useMemo(() =>
    performance.map((p) => ({ ...p, action: deriveAction(p) })),
  [performance]);

  const filtered = useMemo(() => {
    if (filter === "all") return withAction;
    return withAction.filter((a) => a.action === filter);
  }, [withAction, filter]);

  /* ---------- Top 5 ---------- */
  const top5LowPerformance = useMemo(() =>
    [...withAction].filter((a) => a.current_month_pct !== null)
      .sort((a, b) => (a.current_month_pct ?? 0) - (b.current_month_pct ?? 0))
      .slice(0, 5),
  [withAction]);

  const top5TopSellers = useMemo(() =>
    [...withAction].filter((a) => a.current_month_pct !== null)
      .sort((a, b) => (b.current_month_pct ?? 0) - (a.current_month_pct ?? 0))
      .slice(0, 5),
  [withAction]);

  const top5Overstock = useMemo(() =>
    [...withAction].filter((a) => a.overstock_units > 0)
      .sort((a, b) => b.overstock_units - a.overstock_units)
      .slice(0, 5),
  [withAction]);

  /* ---------- KPIs ---------- */
  const stats = useMemo(() => {
    const withPct = withAction.filter((a) => a.current_month_pct !== null);
    const avgPerf = withPct.length > 0
      ? Math.round(withPct.reduce((s, a) => s + (a.current_month_pct ?? 0), 0) / withPct.length)
      : 0;
    const pushCount = withAction.filter((a) => a.action === "Sales puschen").length;
    const brakeCount = withAction.filter((a) => a.action === "Sales bremsen").length;
    const totalOverstock = withAction.reduce((s, a) => s + a.overstock_units, 0);
    return { total: withAction.length, avgPerf, pushCount, brakeCount, noAction: withAction.length - pushCount - brakeCount, totalOverstock };
  }, [withAction]);

  if (isLoading) return <div className="text-center py-8 text-gray-400 text-[11px]">Lade Performance-Daten...</div>;
  if (performance.length === 0) return <div className="text-center py-8 text-gray-400 text-[11px]">Keine Performance-Daten vorhanden. &quot;Google Sheets sync&quot; klicken.</div>;

  return (
    <div className="space-y-2.5">
      {/* ============ KPI CARDS ============ */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-white rounded border border-gray-100 px-3 py-2">
          <div className="text-[9px] text-gray-500 uppercase tracking-[0.4px] mb-0.5">Artikel gesamt</div>
          <div className="text-[16px] font-medium text-gray-900">{stats.total}</div>
          <div className="text-[9px] text-gray-400">aktueller Monat</div>
        </div>
        <div className="bg-white rounded border border-gray-100 px-3 py-2">
          <div className="text-[9px] text-gray-500 uppercase tracking-[0.4px] mb-0.5">Ø Performance</div>
          <div className={`text-[16px] font-medium ${perfColor(stats.avgPerf)}`}>{stats.avgPerf}%</div>
          <div className="text-[9px] text-gray-400">vs. Forecast</div>
        </div>
        <div className="bg-white rounded border border-gray-100 px-3 py-2">
          <div className="text-[9px] text-gray-500 uppercase tracking-[0.4px] mb-0.5">Sales puschen</div>
          <div className="text-[16px] font-medium text-brand-red">{stats.pushCount}</div>
          <div className="text-[9px] text-gray-400">Artikel unter 90%</div>
        </div>
        <div className="bg-white rounded border border-gray-100 px-3 py-2">
          <div className="text-[9px] text-gray-500 uppercase tracking-[0.4px] mb-0.5">Overstock gesamt</div>
          <div className="text-[16px] font-medium text-status-amber">{formatNum(stats.totalOverstock)}</div>
          <div className="text-[9px] text-gray-400">Stuck</div>
        </div>
      </div>

      {/* ============ TOP 5 CARDS ============ */}
      <div className="grid grid-cols-3 gap-2">
        <Top5Card
          title="Low Performance" subtitle="Schlechteste Performance vs. Forecast"
          items={top5LowPerformance} colorAccent="red" emptyText="Keine Daten"
          valueLabel={(i) => `${(i.current_month_pct ?? 0).toFixed(0)}%`}
        />
        <Top5Card
          title="Top Seller" subtitle="Beste Performance vs. Forecast"
          items={top5TopSellers} colorAccent="green" emptyText="Keine Daten"
          valueLabel={(i) => `${(i.current_month_pct ?? 0).toFixed(0)}%`}
        />
        <Top5Card
          title="Overstock" subtitle="Hochster Uberbestand"
          items={top5Overstock} colorAccent="amber" emptyText="Kein Overstock"
          valueLabel={(i) => `+${formatNum(i.overstock_units)} Stk`}
        />
      </div>

      {/* ============ DETAIL TABLE ============ */}
      <div className="bg-white rounded border border-gray-100 overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <span className="text-[9px] font-medium text-gray-500 uppercase tracking-[0.4px]">
            Alle Artikel — Performance aktueller Monat
          </span>
          <div className="flex items-center gap-1.5">
            {(["all", "Sales puschen", "Sales bremsen", "Keine Aktion notwendig"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setFilter(opt)}
                className={`text-[9px] px-2 py-[3px] rounded-full border transition-colors ${
                  filter === opt ? "bg-brand-red text-white border-brand-red" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                }`}
              >
                {opt === "all" ? `Alle (${stats.total})` :
                 opt === "Sales puschen" ? `Sales puschen (${stats.pushCount})` :
                 opt === "Sales bremsen" ? `Sales bremsen (${stats.brakeCount})` :
                 `Keine Aktion (${stats.noAction})`}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="text-left py-1.5 px-2 font-medium text-gray-400 text-[9px] uppercase tracking-[0.3px] border-b border-gray-100">Artikel</th>
                <th className="text-right py-1.5 px-2 font-medium text-gray-400 text-[9px] uppercase tracking-[0.3px] border-b border-gray-100">Forecast</th>
                <th className="text-right py-1.5 px-2 font-medium text-gray-400 text-[9px] uppercase tracking-[0.3px] border-b border-gray-100">Ist</th>
                <th className="text-center py-1.5 px-2 font-medium text-gray-400 text-[9px] uppercase tracking-[0.3px] border-b border-gray-100 w-[120px]">Performance</th>
                <th className="text-right py-1.5 px-2 font-medium text-gray-400 text-[9px] uppercase tracking-[0.3px] border-b border-gray-100">Overstock</th>
                <th className="text-center py-1.5 px-2 font-medium text-gray-400 text-[9px] uppercase tracking-[0.3px] border-b border-gray-100">3M Trend</th>
                <th className="text-center py-1.5 px-2 font-medium text-gray-400 text-[9px] uppercase tracking-[0.3px] border-b border-gray-100">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const badge = actionBadge(item.action);
                const pct = item.current_month_pct ?? 0;
                const barWidth = Math.min(100, Math.max(3, pct));
                const ti = trendConfig(item.trend_3m);
                return (
                  <tr key={item.article_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-[5px] px-2">
                      <div className="flex items-center gap-1.5">
                        {/* Performance badge next to article */}
                        {item.current_month_pct !== null && (
                          <span className={`inline-block text-[8px] px-1 py-[0px] rounded font-mono font-medium ${perfColor(item.current_month_pct)}`}>
                            {item.current_month_pct.toFixed(0)}%
                          </span>
                        )}
                        <span className="font-medium text-gray-800">{item.article_name}</span>
                        <span className="text-[8px] text-gray-400">{item.article_id}</span>
                      </div>
                    </td>
                    <td className="py-[5px] px-2 text-right font-mono text-gray-600">{formatNum(item.forecast_units)}</td>
                    <td className="py-[5px] px-2 text-right font-mono text-gray-800 font-medium">{formatNum(item.actual_units)}</td>
                    <td className="py-[5px] px-2">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 bg-gray-100 rounded-full h-[5px] overflow-hidden">
                          <div className={`h-full rounded-full ${perfBg(pct)}`} style={{ width: `${barWidth}%` }} />
                        </div>
                        <span className={`text-[9px] font-mono font-medium w-8 text-right ${perfColor(item.current_month_pct)}`}>
                          {item.current_month_pct !== null ? `${item.current_month_pct.toFixed(0)}%` : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="py-[5px] px-2 text-right">
                      {item.overstock_units > 0 ? (
                        <span className="font-mono text-status-amber font-medium">+{formatNum(item.overstock_units)}</span>
                      ) : <span className="text-gray-200">&mdash;</span>}
                    </td>
                    <td className="py-[5px] px-2 text-center">
                      {item.trend_3m ? (() => {
                        const tc = trendConfig(item.trend_3m);
                        return (
                          <span className="group relative inline-flex items-center gap-1">
                            <span className={`inline-block w-[6px] h-[6px] rounded-full ${tc.bg}`} />
                            <span className={`text-[8px] font-medium ${tc.text}`}>{tc.short}</span>
                            <span className="hidden group-hover:block absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-brand-black text-white text-[8px] rounded whitespace-nowrap shadow-lg">
                              {tc.label}
                              <br />M-3: {item.performance_m3.toFixed(0)}% | M-2: {item.performance_m2.toFixed(0)}% | M-1: {item.performance_m1.toFixed(0)}%
                            </span>
                          </span>
                        );
                      })() : <span className="text-gray-200">&mdash;</span>}
                    </td>
                    <td className="py-[5px] px-2 text-center">
                      <span className={`inline-flex items-center gap-0.5 text-[8px] px-1.5 py-[2px] rounded-full font-medium border ${badge.bg}`}>
                        <span className="text-[7px]">{badge.icon}</span>
                        {item.action}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-4 text-center text-gray-400 text-[10px]">Keine Artikel in dieser Kategorie</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
