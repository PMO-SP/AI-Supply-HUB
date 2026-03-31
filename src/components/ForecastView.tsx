"use client";

import { useMemo } from "react";
import { usePerformance } from "@/hooks/usePerformance";
import { useStockouts } from "@/hooks/useStockouts";
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
    default: return { bg: "bg-gray-200", text: "text-gray-400", short: "—", label: "" };
  }
}

/* ------------------------------------------------------------------ */
/* Top 10 Card                                                         */
/* ------------------------------------------------------------------ */
function Top10Card({
  title, subtitle, items, colorAccent, isOfflineSet, forceColor,
}: {
  title: string; subtitle: string; items: ArticlePerformance[]; colorAccent: "red" | "green"; isOfflineSet: Set<string>; forceColor?: boolean;
}) {
  const accent = colorAccent === "green"
    ? { header: "bg-status-green/8 border-status-green/15", rank: "text-status-green" }
    : { header: "bg-brand-red/8 border-brand-red/15", rank: "text-brand-red" };

  return (
    <div className="bg-white rounded border border-gray-100 overflow-hidden">
      <div className={`px-3 py-2 border-b ${accent.header}`}>
        <div className="text-[10px] font-medium text-gray-600 uppercase tracking-[0.3px]">{title}</div>
        <div className="text-[8px] text-gray-400 mt-0.5">{subtitle}</div>
      </div>
      <div className="divide-y divide-gray-50">
        {items.length === 0 && <div className="px-3 py-3 text-[10px] text-gray-400 text-center">Keine Daten</div>}
        {items.map((item, idx) => {
          const pct = item.current_month_pct ?? 0;
          const barWidth = Math.min(100, Math.max(3, pct));
          const isOffline = isOfflineSet.has(item.article_id);
          const barColor = forceColor && colorAccent === "green" ? "bg-status-green" : forceColor && colorAccent === "red" ? "bg-brand-red" : perfBg(pct);
          const pctColor = forceColor && colorAccent === "green" ? "text-status-green" : forceColor && colorAccent === "red" ? "text-brand-red" : perfColor(item.current_month_pct);
          return (
            <div key={item.article_id} className="px-3 py-[4px] hover:bg-gray-50/50 flex items-center gap-2">
              <span className={`text-[9px] font-mono w-4 text-right flex-shrink-0 ${accent.rank}`}>{idx + 1}.</span>
              <span className="text-[10px] font-medium text-gray-800 truncate min-w-0 flex-1" title={item.article_name}>
                {item.article_name}
              </span>
              {isOffline && <span className="text-[7px] px-1 py-[0px] rounded bg-gray-800 text-white font-medium flex-shrink-0">OFFLINE</span>}
              <div className="w-[60px] bg-gray-100 rounded-full h-[4px] overflow-hidden flex-shrink-0">
                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${barWidth}%` }} />
              </div>
              <span className={`text-[10px] font-mono font-medium w-10 text-right flex-shrink-0 ${pctColor}`}>
                {colorAccent === "green" ? "+" : ""}{pct.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Category Performance                                                 */
/* ------------------------------------------------------------------ */
const HIDDEN_CATEGORIES = new Set(["Waage", "Display", "Towels", "Massage Gun", "Wasserflasche"]);

/** Month names for headers — use day 1 to avoid month-overflow bugs */
function monthLabel(offset: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  return d.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
}

/** Compact sparkline with labeled endpoints */
function MiniTrendLine({ values, size = 48 }: { values: number[]; size?: number }) {
  const valid = values.filter((v) => v > 0);
  if (valid.length < 2) return <span className="text-gray-200 text-[8px]">—</span>;
  const min = Math.min(...valid) - 10;
  const max = Math.max(...valid) + 10;
  const range = max - min || 1;
  const h = 16;
  const pad = 2;
  const w = size;
  const pts = valid.map((v, i) => `${pad + (i / Math.max(1, valid.length - 1)) * (w - pad * 2)},${pad + (h - pad * 2) - ((v - min) / range) * (h - pad * 2)}`).join(" ");
  const first = valid[0];
  const last = valid[valid.length - 1];
  const trending = last > first ? "up" : last < first ? "down" : "flat";
  const col = trending === "up" ? "#22c55e" : trending === "down" ? "#ef4444" : "#9ca3af";
  return (
    <span className="inline-flex items-center gap-1">
      <svg width={w} height={h} className="inline-block align-middle">
        <polyline points={pts} fill="none" stroke={col} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {valid.map((v, i) => {
          const cx = pad + (i / Math.max(1, valid.length - 1)) * (w - pad * 2);
          const cy = pad + (h - pad * 2) - ((v - min) / range) * (h - pad * 2);
          return <circle key={i} cx={cx} cy={cy} r="1.5" fill={col} />;
        })}
      </svg>
      <span className={`text-[8px] font-medium ${trending === "up" ? "text-status-green" : trending === "down" ? "text-brand-red" : "text-gray-400"}`}>
        {trending === "up" ? "↑" : trending === "down" ? "↓" : "→"}
      </span>
    </span>
  );
}

/** Colored cell for % des Forecast erreicht */
function PctCell({ val }: { val: number }) {
  if (val <= 0) return <span className="text-gray-200 text-[8px]">k.D.</span>;
  const bg = val >= 90 ? (val > 110 ? "bg-status-amber/15" : "bg-status-green/15") : "bg-brand-red/10";
  const text = val >= 90 ? (val > 110 ? "text-status-amber" : "text-status-green") : "text-brand-red";
  return (
    <span className={`inline-block px-1.5 py-[1px] rounded text-[8px] font-mono font-medium ${bg} ${text}`}>
      {val}%
    </span>
  );
}

function CategoryPerformance({ items, offlineSet }: { items: ArticlePerformance[]; offlineSet: Set<string> }) {
  const categories = useMemo(() => {
    const map = new Map<string, {
      total: number; sum: number; count: number;
      underCount: number; overCount: number; onTrackCount: number;
      sumM3: number; countM3: number; sumM2: number; countM2: number; sumM1: number; countM1: number;
    }>();
    for (const item of items) {
      const cat = item.category || "Ohne Kategorie";
      if (offlineSet.has(item.article_id) || HIDDEN_CATEGORIES.has(cat)) continue;
      const pct = item.current_month_pct ?? 0;
      if (!map.has(cat)) map.set(cat, { total: 0, sum: 0, count: 0, underCount: 0, overCount: 0, onTrackCount: 0, sumM3: 0, countM3: 0, sumM2: 0, countM2: 0, sumM1: 0, countM1: 0 });
      const e = map.get(cat)!;
      e.total++; e.sum += pct; e.count++;
      if (pct < 90) e.underCount++;
      else if (pct > 110) e.overCount++;
      else e.onTrackCount++;
      if (item.performance_m3 > 0) { e.sumM3 += item.performance_m3; e.countM3++; }
      if (item.performance_m2 > 0) { e.sumM2 += item.performance_m2; e.countM2++; }
      if (item.performance_m1 > 0) { e.sumM1 += item.performance_m1; e.countM1++; }
    }
    return [...map.entries()]
      .map(([name, d]) => ({
        name,
        avgPct: d.count > 0 ? Math.round(d.sum / d.count) : 0,
        articleCount: d.total,
        underCount: d.underCount,
        overCount: d.overCount,
        onTrackCount: d.onTrackCount,
        avgM3: d.countM3 > 0 ? Math.round(d.sumM3 / d.countM3) : 0,
        avgM2: d.countM2 > 0 ? Math.round(d.sumM2 / d.countM2) : 0,
        avgM1: d.countM1 > 0 ? Math.round(d.sumM1 / d.countM1) : 0,
      }))
      .sort((a, b) => b.avgPct - a.avgPct);
  }, [items, offlineSet]);

  if (categories.length === 0) return null;

  // Month labels — M-3, M-2, M-1 + aktueller Monat
  const m3Label = monthLabel(3);
  const m2Label = monthLabel(2);
  const m1Label = monthLabel(1);
  const curLabel = monthLabel(0);

  return (
    <div className="bg-white rounded border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-2.5 py-1.5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <div>
          <span className="text-[9px] font-medium text-gray-500 uppercase tracking-[0.4px]">
            Forecast-Erreichung nach Produktkategorie
          </span>
          <span className="text-[8px] text-gray-400 ml-2">— Ø % des Forecasts erreicht (100% = Ziel)</span>
        </div>
        <div className="flex items-center gap-2.5 text-[8px]">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm bg-brand-red/15 border border-brand-red/30" /><span className="text-gray-500">&lt;90%</span></span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm bg-status-green/15 border border-status-green/30" /><span className="text-gray-500">90–110%</span></span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm bg-status-amber/15 border border-status-amber/30" /><span className="text-gray-500">&gt;110%</span></span>
        </div>
      </div>
      <table className="w-full text-[9px]">
        <thead>
          <tr className="bg-gray-50/30">
            <th className="text-left py-1 px-2 font-medium text-gray-400 text-[8px] uppercase tracking-[0.3px] border-b border-gray-100" rowSpan={2}>Kategorie</th>
            <th className="text-center py-1 px-1 font-medium text-gray-400 text-[8px] uppercase tracking-[0.3px] border-b border-gray-100 w-5" rowSpan={2}>#</th>
            <th className="text-center py-0.5 px-1 font-medium text-gray-400 text-[8px] uppercase tracking-[0.3px] border-b border-gray-50" colSpan={4}>Ø % des Forecasts erreicht</th>
            <th className="text-center py-1 px-1 font-medium text-gray-400 text-[8px] uppercase tracking-[0.3px] border-b border-gray-100" rowSpan={2}>Trend</th>
            <th className="text-center py-1 px-1 font-medium text-gray-400 text-[8px] uppercase tracking-[0.3px] border-b border-gray-100 w-[120px]" rowSpan={2}>Ø aktuell + Abw.</th>
            <th className="text-center py-0.5 px-1 font-medium text-gray-400 text-[8px] uppercase tracking-[0.3px] border-b border-gray-50" colSpan={3}>Artikel-Verteilung</th>
          </tr>
          <tr className="bg-gray-50/20">
            <th className="text-center py-0.5 px-1 font-medium text-gray-400 text-[7px] border-b border-gray-100">{m3Label}</th>
            <th className="text-center py-0.5 px-1 font-medium text-gray-400 text-[7px] border-b border-gray-100">{m2Label}</th>
            <th className="text-center py-0.5 px-1 font-medium text-gray-400 text-[7px] border-b border-gray-100">{m1Label}</th>
            <th className="text-center py-0.5 px-1 font-medium text-gray-400 text-[7px] border-b border-gray-100">{curLabel}</th>
            <th className="text-center py-0.5 px-1 text-[7px] border-b border-gray-100"><span className="text-brand-red font-medium">&lt;90%</span></th>
            <th className="text-center py-0.5 px-1 text-[7px] border-b border-gray-100"><span className="text-status-green font-medium">On Track</span></th>
            <th className="text-center py-0.5 px-1 text-[7px] border-b border-gray-100"><span className="text-status-amber font-medium">&gt;110%</span></th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => {
            const dev = cat.avgPct - 100;
            return (
              <tr key={cat.name} className="border-b border-gray-50 hover:bg-gray-50/30">
                <td className="py-[3px] px-2 font-medium text-gray-800 text-[9px]">{cat.name}</td>
                <td className="py-[3px] px-1 text-center text-gray-400">{cat.articleCount}</td>
                {/* M-3 / M-2 / M-1 / Current as colored badges */}
                <td className="py-[3px] px-1 text-center"><PctCell val={cat.avgM3} /></td>
                <td className="py-[3px] px-1 text-center"><PctCell val={cat.avgM2} /></td>
                <td className="py-[3px] px-1 text-center"><PctCell val={cat.avgM1} /></td>
                <td className="py-[3px] px-1 text-center"><PctCell val={cat.avgPct} /></td>
                {/* Sparkline */}
                <td className="py-[3px] px-1 text-center">
                  <MiniTrendLine values={[cat.avgM3, cat.avgM2, cat.avgM1, cat.avgPct]} />
                </td>
                {/* Current + deviation bar */}
                <td className="py-[3px] px-1">
                  <div className="flex items-center gap-1">
                    <div className="relative flex-1 bg-gray-100 rounded-full h-[4px]">
                      <div className="absolute top-0 bottom-0 w-[1px] bg-gray-400 z-10" style={{ left: `${(100 / 150) * 100}%` }} title="100% Ziel" />
                      <div
                        className={`absolute top-0 bottom-0 rounded-full ${perfBg(cat.avgPct)}`}
                        style={{ left: 0, width: `${Math.min(100, (cat.avgPct / 150) * 100)}%` }}
                      />
                    </div>
                    <span className={`font-mono font-medium text-[8px] w-8 text-right ${dev >= 0 ? "text-status-green" : "text-brand-red"}`}>
                      {dev >= 0 ? "+" : ""}{dev}%
                    </span>
                  </div>
                </td>
                {/* Distribution */}
                <td className="py-[3px] px-1 text-center">
                  {cat.underCount > 0 ? <span className="font-mono font-medium text-brand-red text-[9px]">{cat.underCount}</span> : <span className="text-gray-200">—</span>}
                </td>
                <td className="py-[3px] px-1 text-center">
                  {cat.onTrackCount > 0 ? <span className="font-mono font-medium text-status-green text-[9px]">{cat.onTrackCount}</span> : <span className="text-gray-200">—</span>}
                </td>
                <td className="py-[3px] px-1 text-center">
                  {cat.overCount > 0 ? <span className="font-mono font-medium text-status-amber text-[9px]">{cat.overCount}</span> : <span className="text-gray-200">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ================================================================== */
/* MAIN COMPONENT                                                      */
/* ================================================================== */
export default function ForecastView() {
  const { performance, isLoading } = usePerformance();
  const { stockouts } = useStockouts();

  // Set of article_ids that are offline (active + available_from_date = "offline")
  const offlineSet = useMemo(() => {
    const set = new Set<string>();
    for (const s of stockouts) {
      if (s.status === "active" && (s.available_from_date === "offline" || s.available_from_date === "")) {
        set.add(s.article_id);
      }
    }
    return set;
  }, [stockouts]);

  // Active OOS set (any active stockout)
  const activeOosSet = useMemo(() => {
    const set = new Set<string>();
    for (const s of stockouts) {
      if (s.status === "active") set.add(s.article_id);
    }
    return set;
  }, [stockouts]);

  // Articles with performance data
  const withPct = useMemo(() =>
    performance.filter((a) => a.current_month_pct !== null),
  [performance]);

  // Top 10 overperformers (best performance descending)
  const top10Over = useMemo(() =>
    [...withPct]
      .sort((a, b) => (b.current_month_pct ?? 0) - (a.current_month_pct ?? 0))
      .slice(0, 10),
  [withPct]);

  // Top 10 underperformers: excluding offline AND only with stock > 0
  const top10Under = useMemo(() =>
    [...withPct]
      .filter((a) => !offlineSet.has(a.article_id) && a.current_stock > 0)
      .sort((a, b) => (a.current_month_pct ?? 0) - (b.current_month_pct ?? 0))
      .slice(0, 10),
  [withPct, offlineSet]);

  // KPIs
  const stats = useMemo(() => {
    const total = performance.length;
    const avgPerf = withPct.length > 0
      ? Math.round(withPct.reduce((s, a) => s + (a.current_month_pct ?? 0), 0) / withPct.length)
      : 0;
    const underCount = withPct.filter((a) => (a.current_month_pct ?? 0) < 90 && !offlineSet.has(a.article_id)).length;
    const overCount = withPct.filter((a) => (a.current_month_pct ?? 0) > 110).length;
    const offlineCount = offlineSet.size;
    const trendUnder = performance.filter((a) => a.trend_3m === "Unterperformance").length;
    return { total, avgPerf, underCount, overCount, offlineCount, trendUnder };
  }, [performance, withPct, offlineSet]);

  if (isLoading) return <div className="text-center py-8 text-gray-400 text-[11px]">Lade Forecast-Daten...</div>;
  if (performance.length === 0) return <div className="text-center py-8 text-gray-400 text-[11px]">Keine Daten. &quot;Google Sheets sync&quot; klicken.</div>;

  return (
    <div className="space-y-2.5">
      {/* ============ KPI CARDS ============ */}
      <div className="grid grid-cols-5 gap-2">
        <div className="bg-white rounded border border-gray-100 px-3 py-2">
          <div className="text-[9px] text-gray-500 uppercase tracking-[0.4px] mb-0.5">Artikel</div>
          <div className="text-[16px] font-medium text-gray-900">{stats.total}</div>
          <div className="text-[9px] text-gray-400">aktueller Monat</div>
        </div>
        <div className="bg-white rounded border border-gray-100 px-3 py-2">
          <div className="text-[9px] text-gray-500 uppercase tracking-[0.4px] mb-0.5">Ø Performance</div>
          <div className={`text-[16px] font-medium ${perfColor(stats.avgPerf)}`}>{stats.avgPerf}%</div>
          <div className="text-[9px] text-gray-400">vs. Forecast</div>
        </div>
        <div className="bg-white rounded border border-gray-100 px-3 py-2">
          <div className="text-[9px] text-gray-500 uppercase tracking-[0.4px] mb-0.5">Unterperformer</div>
          <div className="text-[16px] font-medium text-brand-red">{stats.underCount}</div>
          <div className="text-[9px] text-gray-400">unter 90%</div>
        </div>
        <div className="bg-white rounded border border-gray-100 px-3 py-2">
          <div className="text-[9px] text-gray-500 uppercase tracking-[0.4px] mb-0.5">Uberperformer</div>
          <div className="text-[16px] font-medium text-status-green">{stats.overCount}</div>
          <div className="text-[9px] text-gray-400">uber 110%</div>
        </div>
        <div className="bg-white rounded border border-gray-100 px-3 py-2">
          <div className="text-[9px] text-gray-500 uppercase tracking-[0.4px] mb-0.5">Offline</div>
          <div className="text-[16px] font-medium text-gray-600">{stats.offlineCount}</div>
          <div className="text-[9px] text-gray-400">nicht lieferbar</div>
        </div>
      </div>

      {/* ============ TOP 10 CARDS ============ */}
      <div className="flex items-start gap-4">
        <div className="bg-brand-red/8 border border-brand-red/15 rounded px-2.5 py-1.5 flex-shrink-0">
          <div className="text-[9px] text-gray-500 uppercase tracking-[0.3px]">Analysezeitraum</div>
          <div className="text-[12px] font-medium text-gray-800">
            {(() => {
              const now = new Date();
              const m3 = new Date(now.getFullYear(), now.getMonth() - 3, 1);
              const m1 = new Date(now.getFullYear(), now.getMonth() - 1, 1);
              const fmt = (d: Date) => d.toLocaleDateString("de-DE", { month: "short", year: "numeric" });
              return `${fmt(m3)} — ${fmt(m1)}`;
            })()}
          </div>
          <div className="text-[8px] text-gray-400 mt-0.5">Performance vs. Forecast (3 Monate)</div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-gray-700 mb-1.5">Notwendige Forecast Anpassungen</div>
          <div className="flex items-start gap-2 bg-status-amber/8 border border-status-amber/20 rounded px-3 py-2 mb-1">
            <span className="text-[14px] flex-shrink-0 mt-[-1px]">💡</span>
            <span className="text-[10px] text-gray-700">Folgende Artikel ubertreffen die Ziele, oder im Gegenteil erreichen sie die nicht seit uber 3 Monaten. Eine Forecast-Anpassung wird empfohlen.</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Top10Card
          title="Top 10 Uberperformer"
          subtitle="Beste Performance vs. Forecast (absteigend)"
          items={top10Over}
          colorAccent="green"
          isOfflineSet={offlineSet}
          forceColor={true}
        />
        <Top10Card
          title="Top 10 Unterperformer"
          subtitle="Schlechteste Performance (ohne Offline, nur mit Bestand)"
          items={top10Under}
          colorAccent="red"
          isOfflineSet={offlineSet}
          forceColor={true}
        />
      </div>

      {/* ============ CATEGORY PERFORMANCE ============ */}
      <CategoryPerformance items={withPct} offlineSet={offlineSet} />

      {/* ============ FULL ARTICLE TABLE ============ */}
      <div className="bg-white rounded border border-gray-100 overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/50">
          <span className="text-[9px] font-medium text-gray-500 uppercase tracking-[0.4px]">
            Alle Artikel — Forecast Performance aktueller Monat
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="text-left py-1.5 px-2 font-medium text-gray-400 text-[9px] uppercase tracking-[0.3px] border-b border-gray-100">Artikel</th>
                <th className="text-right py-1.5 px-2 font-medium text-gray-400 text-[9px] uppercase tracking-[0.3px] border-b border-gray-100">Forecast</th>
                <th className="text-right py-1.5 px-2 font-medium text-gray-400 text-[9px] uppercase tracking-[0.3px] border-b border-gray-100">Ist</th>
                <th className="text-center py-1.5 px-2 font-medium text-gray-400 text-[9px] uppercase tracking-[0.3px] border-b border-gray-100 w-[100px]">Performance</th>
                <th className="text-center py-1.5 px-2 font-medium text-gray-400 text-[9px] uppercase tracking-[0.3px] border-b border-gray-100">M-3</th>
                <th className="text-center py-1.5 px-2 font-medium text-gray-400 text-[9px] uppercase tracking-[0.3px] border-b border-gray-100">M-2</th>
                <th className="text-center py-1.5 px-2 font-medium text-gray-400 text-[9px] uppercase tracking-[0.3px] border-b border-gray-100">M-1</th>
                <th className="text-center py-1.5 px-2 font-medium text-gray-400 text-[9px] uppercase tracking-[0.3px] border-b border-gray-100">3M Trend</th>
                <th className="text-right py-1.5 px-2 font-medium text-gray-400 text-[9px] uppercase tracking-[0.3px] border-b border-gray-100">Overstock</th>
              </tr>
            </thead>
            <tbody>
              {performance.map((item) => {
                const pct = item.current_month_pct ?? 0;
                const barWidth = Math.min(100, Math.max(3, pct));
                const isOffline = offlineSet.has(item.article_id);
                const isOos = activeOosSet.has(item.article_id);
                const tc = trendConfig(item.trend_3m);

                return (
                  <tr key={item.article_id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${isOffline ? "opacity-60" : ""}`}>
                    {/* Artikel + badges */}
                    <td className="py-[5px] px-2">
                      <div className="flex items-center gap-1">
                        {/* Performance badge */}
                        {item.current_month_pct !== null && !isOffline && (
                          <span className={`inline-block text-[8px] px-1 py-[0px] rounded font-mono font-medium ${perfColor(item.current_month_pct)}`}>
                            {item.current_month_pct.toFixed(0)}%
                          </span>
                        )}
                        {/* Offline badge */}
                        {isOffline && (
                          <span className="text-[7px] px-1.5 py-[1px] rounded bg-gray-800 text-white font-medium">OFFLINE</span>
                        )}
                        {/* OOS badge (not offline but active OOS) */}
                        {isOos && !isOffline && (
                          <span className="text-[7px] px-1.5 py-[1px] rounded bg-brand-red/10 text-brand-red font-medium">OOS</span>
                        )}
                        <span className="font-medium text-gray-800">{item.article_name}</span>
                        <span className="text-[8px] text-gray-400">{item.article_id}</span>
                      </div>
                    </td>
                    <td className="py-[5px] px-2 text-right font-mono text-gray-600">{formatNum(item.forecast_units)}</td>
                    <td className="py-[5px] px-2 text-right font-mono text-gray-800 font-medium">{formatNum(item.actual_units)}</td>
                    {/* Performance bar */}
                    <td className="py-[5px] px-2">
                      {isOffline ? (
                        <span className="text-[9px] text-gray-400">—</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <div className="flex-1 bg-gray-100 rounded-full h-[5px] overflow-hidden">
                            <div className={`h-full rounded-full ${perfBg(pct)}`} style={{ width: `${barWidth}%` }} />
                          </div>
                          <span className={`text-[9px] font-mono font-medium w-7 text-right ${perfColor(item.current_month_pct)}`}>
                            {item.current_month_pct !== null ? `${pct.toFixed(0)}%` : "—"}
                          </span>
                        </div>
                      )}
                    </td>
                    {/* M-3, M-2, M-1 */}
                    {[item.performance_m3, item.performance_m2, item.performance_m1].map((val, i) => (
                      <td key={i} className="py-[5px] px-2 text-center">
                        {val > 0 ? (
                          <span className={`text-[9px] font-mono font-medium ${perfColor(val)}`}>{val.toFixed(0)}%</span>
                        ) : (
                          <span className="text-gray-200">—</span>
                        )}
                      </td>
                    ))}
                    {/* 3M Trend */}
                    <td className="py-[5px] px-2 text-center">
                      {isOffline ? (
                        <span className="text-[7px] px-1.5 py-[1px] rounded bg-gray-800 text-white font-medium">OFFLINE</span>
                      ) : item.trend_3m ? (
                        <span className="group relative inline-flex items-center gap-1">
                          <span className={`inline-block w-[6px] h-[6px] rounded-full ${tc.bg}`} />
                          <span className={`text-[8px] font-medium ${tc.text}`}>{tc.short}</span>
                          <span className="hidden group-hover:block absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-brand-black text-white text-[8px] rounded whitespace-nowrap shadow-lg">
                            {tc.label}
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-200">—</span>
                      )}
                    </td>
                    {/* Overstock */}
                    <td className="py-[5px] px-2 text-right">
                      {item.overstock_units > 0 ? (
                        <span className="font-mono text-status-amber font-medium">+{formatNum(item.overstock_units)}</span>
                      ) : <span className="text-gray-200">&mdash;</span>}
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
