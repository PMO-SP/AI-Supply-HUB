"use client";

import { useState, useCallback, useMemo } from "react";
import { usePlans } from "@/hooks/usePlans";
import { useWarnings } from "@/hooks/useWarnings";
import { usePayments } from "@/hooks/usePayments";
import { useStockouts } from "@/hooks/useStockouts";
import { useDelayByMonth } from "@/hooks/useDelayByMonth";
import { useSalesActions } from "@/hooks/useSalesActions";
import { usePerformance } from "@/hooks/usePerformance";
import { useInboundOrders } from "@/hooks/useInboundOrders";
import SyncButton from "./SyncButton";
import ArticleFilter from "./ArticleFilter";
import TableView from "./TableView";
import TimelineView from "./TimelineView";
import WarningsPanel from "./WarningsPanel";
import OverrideModal from "./OverrideModal";
import HerstellerView from "./HerstellerView";
import LieferverzugView from "./LieferverzugView";
import SalesPushBrakeView from "./SalesPushBrakeView";
import ForecastView from "./ForecastView";
import InboundCurrentView from "./InboundCurrentView";
import GoodsOnTheWayView from "./GoodsOnTheWayView";
import InProductionView from "./InProductionView";
import { useGoodsOnTheWay } from "@/hooks/useGoodsOnTheWay";
import { useInProduction } from "@/hooks/useInProduction";
import { useSuppliers } from "@/hooks/useSuppliers";
import type { ShipmentPlan, StockoutWithUrgency, DelayByMonth, MahnStufe } from "@/lib/types";

type Tab = "dashboard" | "inbound-current" | "container-plan" | "in-production" | "goods-on-the-way" | "forecast" | "sales-push" | "safety-stock" | "hersteller" | "lieferverzug" | "articles";

/* ---- Topbar badges for Lieferverzug tab ---- */
function LieferverzugBadges({ stockouts, delays }: { stockouts: StockoutWithUrgency[]; delays: DelayByMonth[] }) {
  const activeCount = stockouts.filter((s) => s.status === "active").length;

  // Current month delay rate
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();
  const monthMap = new Map<string, { total: number; delayed: number }>();
  for (const d of delays) {
    const key = `${d.year}-${d.month}`;
    const existing = monthMap.get(key);
    if (existing) {
      existing.total += d.total_orders;
      existing.delayed += d.delayed_orders;
    } else {
      monthMap.set(key, { total: d.total_orders, delayed: d.delayed_orders });
    }
  }
  const curData = monthMap.get(`${curYear}-${curMonth}`);
  const curRate = curData && curData.total > 0 ? Math.round((curData.delayed / curData.total) * 100) : 0;
  const MONTH_SHORT = ["", "Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

  return (
    <>
      {activeCount > 0 && (
        <span className="text-[11px] px-2.5 py-[3px] rounded-full font-medium bg-brand-red text-white">
          {activeCount} Artikel out of stock
        </span>
      )}
      {curRate > 5 && (
        <span className="text-[11px] px-2.5 py-[3px] rounded-full font-medium bg-status-amber text-white">
          Verzugsquote {MONTH_SHORT[curMonth]}: {curRate}%
        </span>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* SVG Nav Icons                                                       */
/* ------------------------------------------------------------------ */
function IconDashboard() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" />
      <rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor" />
      <rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor" />
      <rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 3V2M10 3V2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M1 6h12" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
function IconShip() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 10.5c1.5 1.5 3.5 1.5 6 0s4.5-1.5 6 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M3 10V6.5L7 4l4 2.5V10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 4V2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 11L4.5 6.5L7.5 9L10.5 4L13 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconSalesPush() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2v10M4 5l3-3 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 9h2M10 9h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 4v3.5l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function IconFactory() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 12V6l3-2v2l3-2v2l3-2v6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1 12h12V4l-3 2V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="4" y="9" width="2" height="3" fill="currentColor" opacity="0.5" />
      <rect x="8" y="9" width="2" height="3" fill="currentColor" opacity="0.5" />
    </svg>
  );
}
function IconAlarmClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 4.5V7.5L9 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M4 2L2 4M10 2L12 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function IconPackage() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1.5L12.5 4.5V9.5L7 12.5L1.5 9.5V4.5L7 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M7 12.5V7M7 7L1.5 4.5M7 7L12.5 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 12c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [articleFilter, setArticleFilter] = useState("");
  const [overridePlan, setOverridePlan] = useState<ShipmentPlan | null>(null);

  const { plans, mutate: mutatePlans } = usePlans(
    articleFilter || undefined
  );
  const { warnings, mutate: mutateWarnings } = useWarnings();
  const { payments, mutate: mutatePayments } = usePayments();
  const { suppliers } = useSuppliers();
  const [dashboardSupplierFilter, setDashboardSupplierFilter] = useState<string>("all");
  const { stockouts, mutate: mutateStockouts } = useStockouts();
  const { delays, mutate: mutateDelays } = useDelayByMonth();
  const { mutate: mutateSalesActions } = useSalesActions();
  const { mutate: mutatePerformance } = usePerformance();
  const { orders: inboundOrders, mutate: mutateInbound } = useInboundOrders();
  const { goods, mutate: mutateGoods } = useGoodsOnTheWay();
  const { orders: prodOrders, mutate: mutateInProd } = useInProduction();

  const refreshAll = useCallback(() => {
    mutatePlans();
    mutateWarnings();
    mutatePayments();
    mutateStockouts();
    mutateDelays();
    mutateSalesActions();
    mutatePerformance();
    mutateInbound();
    mutateGoods();
    mutateInProd();
  }, [mutatePlans, mutateWarnings, mutatePayments, mutateStockouts, mutateDelays, mutateSalesActions, mutatePerformance, mutateInbound, mutateGoods, mutateInProd]);

  // Compute summary statistics
  const stats = useMemo(() => {
    // 1 order_id = 1 container — count from inbound_orders
    const totalContainers = inboundOrders.length;
    const totalSafetyStock = plans.reduce((s, p) => s + (p.safety_stock_units || 0), 0);
    const redCount = plans.filter((p) => p.status_color === "red").length;
    const yellowCount = plans.filter((p) => p.status_color === "yellow").length;
    const greenCount = plans.filter((p) => p.status_color === "green").length;
    const avgCoverage = plans.length > 0
      ? Math.round(
          (plans.reduce((s, p) => s + (p.stock_coverage_months || 0), 0) / plans.length) * 10
        ) / 10
      : 0;
    // Forecast accuracy placeholder (from performance data if available)
    const withPerf = plans.filter((p) => p.performance_info);
    let forecastAccuracy = 0;
    if (withPerf.length > 0) {
      const totalAbsDev = withPerf.reduce((s, p) => {
        try {
          const perf = typeof p.performance_info === "string" ? JSON.parse(p.performance_info) : p.performance_info;
          return s + Math.abs(perf.variance_pct || 0);
        } catch { return s; }
      }, 0);
      forecastAccuracy = Math.round(100 - totalAbsDev / withPerf.length);
    }

    return { totalContainers, totalSafetyStock, redCount, yellowCount, greenCount, avgCoverage, forecastAccuracy };
  }, [plans, inboundOrders]);

  /* ---------- Dashboard: Hersteller Zahlungen + Goods stats ---------- */
  const fmtEur = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 });

  // Deduplicate by supplier_name so multi-ID suppliers (e.g. "397" + "397kredit") appear only once
  const dashSupplierList = useMemo(() => {
    const seen = new Set<string>();
    for (const p of payments) {
      if (p.supplier_name) seen.add(p.supplier_name);
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [payments]);

  // Payments only filterable by supplier (no article_id in payments)
  const dashFilteredPayments = useMemo(() => {
    if (dashboardSupplierFilter === "all") return payments;
    return payments.filter((p) => p.supplier_name === dashboardSupplierFilter);
  }, [payments, dashboardSupplierFilter]);

  const dashMahnStufen = useMemo(() => {
    const open = dashFilteredPayments.filter((p) => p.status !== "paid");
    return ([0, 1, 2, 3] as MahnStufe[]).map((stufe) => {
      const items = open.filter((p) => p.mahn_stufe === stufe);
      return { stufe, count: items.length, total: items.reduce((s, p) => s + p.amount_eur, 0), supplierCount: new Set(items.map((p) => p.supplier_id)).size };
    });
  }, [dashFilteredPayments]);

  const dashOverdueTotal = useMemo(() => {
    const overdue = dashFilteredPayments.filter((p) => p.status !== "paid" && p.days_overdue > 0);
    return { total: overdue.reduce((s, p) => s + p.amount_eur, 0), count: overdue.length };
  }, [dashFilteredPayments]);

  const filteredGoods = useMemo(() => {
    let filtered = goods;
    if (dashboardSupplierFilter !== "all") filtered = filtered.filter((g) => g.supplier_name === dashboardSupplierFilter);
    if (articleFilter) filtered = filtered.filter((g) => g.article_id === articleFilter);
    return filtered;
  }, [goods, dashboardSupplierFilter, articleFilter]);

  const goodsStats = useMemo(() => ({
    containerValue: filteredGoods.reduce((s, g) => s + g.order_volume_eur, 0),
    depositPaid: filteredGoods.reduce((s, g) => s + g.deposit_value_paid_eur, 0),
    containerCount: filteredGoods.length,
    balanceUnpaid: filteredGoods.reduce((s, g) => s + g.balance_unpaid_eur, 0),
  }), [filteredGoods]);

  // In Production stats (filtered by supplier + article)
  const filteredProd = useMemo(() => {
    let result = prodOrders;
    if (dashboardSupplierFilter !== "all") result = result.filter((o) => o.supplier_name === dashboardSupplierFilter);
    if (articleFilter) result = result.filter((o) => o.article_id === articleFilter);
    return result;
  }, [prodOrders, dashboardSupplierFilter, articleFilter]);

  const prodStats = useMemo(() => {
    const totalDeposit = filteredProd.reduce((s, o) => s + o.deposit_paid_eur, 0);
    const totalOrders = filteredProd.length;

    // Top 10 suppliers by deposit
    const supplierMap = new Map<string, { name: string; deposit: number }>();
    for (const o of filteredProd) {
      const key = o.supplier_id;
      const existing = supplierMap.get(key);
      if (existing) {
        existing.deposit += o.deposit_paid_eur;
      } else {
        supplierMap.set(key, { name: o.supplier_name || o.supplier_id, deposit: o.deposit_paid_eur });
      }
    }
    const top10Suppliers = Array.from(supplierMap.entries())
      .map(([id, v]) => ({ id, name: v.name, deposit: v.deposit }))
      .sort((a, b) => b.deposit - a.deposit)
      .slice(0, 10);
    const maxSupplierDeposit = top10Suppliers.length > 0 ? top10Suppliers[0].deposit : 1;

    // Orders by month (ETD plan)
    const MONTH_SHORT = ["", "Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
    const monthMap = new Map<string, number>();
    for (const o of filteredProd) {
      if (!o.etd_shipping_plan) continue;
      const m = o.etd_shipping_plan.match(/^(\d{4})-(\d{2})/);
      if (m) {
        const key = `${m[1]}-${m[2]}`;
        monthMap.set(key, (monthMap.get(key) || 0) + 1);
      }
    }
    const ordersByMonth = Array.from(monthMap.entries())
      .map(([key, count]) => {
        const [y, m] = key.split("-");
        return { key, label: `${MONTH_SHORT[parseInt(m)]} ${y.slice(2)}`, count };
      })
      .sort((a, b) => a.key.localeCompare(b.key));
    const maxMonthCount = ordersByMonth.length > 0 ? Math.max(...ordersByMonth.map((m) => m.count)) : 1;

    return { totalDeposit, totalOrders, top10Suppliers, maxSupplierDeposit, ordersByMonth, maxMonthCount };
  }, [filteredProd]);

  const stufeStyles: Record<MahnStufe, string> = {
    0: "bg-status-green/8 border-status-green/20",
    1: "bg-status-amber/8 border-status-amber/20",
    2: "bg-brand-red/8 border-brand-red/20",
    3: "bg-brand-red/15 border-brand-red/40",
  };
  const stufeLabels: Record<MahnStufe, string> = { 0: "Nicht fällig", 1: "1-14 Tage", 2: "15-30 Tage", 3: "> 30 Tage" };

  const navItems: { key: Tab; label: string; icon: React.ReactNode; className?: string }[] = [
    { key: "dashboard", label: "Dashboard", icon: <IconDashboard /> },
    { key: "forecast", label: "Forecast", icon: <IconChart /> },
    { key: "sales-push", label: "Sales Push / Brake", icon: <IconSalesPush /> },
    { key: "lieferverzug", label: "Lieferverzug", icon: <IconAlarmClock /> },
    { key: "inbound-current", label: "Inbound Plan current", icon: <IconShip /> },
    { key: "container-plan", label: "AI Inbound Plan", icon: <IconShip />, className: "text-brand-red" },
    { key: "in-production", label: "In Production", icon: <IconFactory /> },
    { key: "goods-on-the-way", label: "Goods on the Way", icon: <IconPackage /> },
    { key: "hersteller", label: "Hersteller Zahlungen", icon: <IconFactory /> },
    { key: "safety-stock", label: "Safety Stock", icon: <IconClock /> },
    { key: "articles", label: "Artikel", icon: <IconUser /> },
  ];

  // Map tabs to content views
  const renderContent = () => {
    switch (tab) {
      case "dashboard":
        return <TimelineView plans={plans} onOverride={setOverridePlan} />;
      case "inbound-current":
        return <InboundCurrentView />;
      case "in-production":
        return <InProductionView />;
      case "goods-on-the-way":
        return <GoodsOnTheWayView />;
      case "container-plan":
        return <TableView plans={plans} onOverride={setOverridePlan} />;
      case "forecast":
        return <ForecastView />;
      case "sales-push":
        return <SalesPushBrakeView />;
      case "safety-stock":
        return <TableView plans={plans} onOverride={setOverridePlan} />;
      case "hersteller":
        return <HerstellerView />;
      case "lieferverzug":
        return <LieferverzugView />;
      case "articles":
        return <TableView plans={plans} onOverride={setOverridePlan} />;
      default:
        return <TimelineView plans={plans} onOverride={setOverridePlan} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* ============== SIDEBAR ============== */}
      <aside className="w-[170px] bg-brand-black flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="px-3 pt-3 pb-2.5 border-b border-brand-gray-900">
          <div className="text-[13px] font-medium text-white tracking-[1.5px] uppercase">
            Sportstech
          </div>
          <div className="text-[10px] text-brand-red tracking-[0.5px] uppercase mt-0.5">
            AI Supply Hub
          </div>
        </div>

        {/* Navigation */}
        <nav className="py-2 flex-1 sidebar-scroll overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`w-full flex items-center gap-2 px-3 py-[7px] text-[11px] transition-colors ${
                tab === item.key
                  ? `${item.className || "text-white"} bg-brand-black-soft border-l-2 border-brand-red`
                  : `${item.className || "text-brand-gray-500"} hover:text-brand-gray-300 border-l-2 border-transparent`
              }`}
            >
              <span className="opacity-70">{item.icon}</span>
              {item.label}
              {item.key === "dashboard" && warnings.length > 0 && (
                <span className="ml-auto text-[9px] bg-brand-red text-white px-1.5 py-0.5 rounded-full">
                  {warnings.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar footer - last sync */}
        <div className="px-3 py-2 border-t border-brand-gray-900">
          <div className="text-[9px] text-brand-gray-700">Letzte Sync</div>
          <div className="text-[10px] text-brand-gray-500 mt-0.5">
            {new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}{" "}
            {new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </aside>

      {/* ============== MAIN CONTENT ============== */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 flex items-center justify-between h-[42px] flex-shrink-0">
          <h2 className="text-[13px] font-medium text-gray-900">
            {tab === "dashboard" ? "Container Dashboard" :
             tab === "container-plan" ? "AI Inbound Plan" :
             tab === "goods-on-the-way" ? "Goods on the Way" :
             tab === "in-production" ? "In Production" :
             tab === "forecast" ? "Forecast & Performance" :
             tab === "sales-push" ? "Sales Push / Sales Brake" :
             tab === "safety-stock" ? "Safety Stock" :
             tab === "hersteller" ? "Hersteller Zahlungen" :
             tab === "lieferverzug" ? "Lieferverzug & Stockouts" :
             "Artikel"}
          </h2>
          <div className="flex items-center gap-2">
            {tab === "lieferverzug" && (
              <LieferverzugBadges stockouts={stockouts} delays={delays} />
            )}
            {tab !== "hersteller" && tab !== "lieferverzug" && tab !== "sales-push" && tab !== "forecast" && tab !== "goods-on-the-way" && stats.redCount > 0 && (
              <span className="text-[9px] px-2 py-[2px] rounded-full font-medium bg-brand-red text-white">
                {stats.redCount} dringend
              </span>
            )}
            {tab !== "hersteller" && tab !== "lieferverzug" && tab !== "sales-push" && tab !== "forecast" && tab !== "goods-on-the-way" && stats.greenCount > 0 && (
              <span className="text-[9px] px-2 py-[2px] rounded-full font-medium bg-status-green text-white">
                {stats.greenCount} on track
              </span>
            )}
            {tab !== "hersteller" && tab !== "lieferverzug" && tab !== "sales-push" && tab !== "forecast" && tab !== "goods-on-the-way" && tab !== "dashboard" && (
              <ArticleFilter
                selectedArticleId={articleFilter}
                onSelect={setArticleFilter}
              />
            )}
            <SyncButton onSyncComplete={refreshAll} />
          </div>
        </header>

        {/* Scrollable content area */}
        <main className="flex-1 overflow-y-auto content-scroll p-2 flex flex-col gap-[8px]">
          {/* ---- Dashboard content ---- */}
          {tab === "dashboard" && (
            <>
              {/* Supplier Filter */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-[9px] font-medium text-gray-500 uppercase tracking-[0.4px]">Hersteller</label>
                  <select
                    value={dashboardSupplierFilter}
                    onChange={(e) => setDashboardSupplierFilter(e.target.value)}
                    className="text-[10px] border border-gray-200 rounded px-2 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-red/30"
                  >
                    <option value="all">Alle Hersteller</option>
                    {dashSupplierList.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                  {dashboardSupplierFilter !== "all" && (
                    <button onClick={() => setDashboardSupplierFilter("all")} className="text-[9px] text-brand-red hover:underline">Filter entfernen</button>
                  )}
                </div>
                <ArticleFilter
                  selectedArticleId={articleFilter}
                  onSelect={setArticleFilter}
                />
              </div>

              {/* KPI Row: Mahnstufen + Überfällig + Container Value + Deposit */}
              <div className="grid grid-cols-3 gap-1.5">
                {/* LEFT: Mahnstufen */}
                <div className="bg-white rounded border border-gray-100 p-2.5">
                  <div className="text-[10px] font-medium text-gray-500 uppercase tracking-[0.4px] mb-2">Mahnstufen — Übersicht</div>
                  <div className="space-y-1">
                    {dashMahnStufen.map((level) => (
                      <div key={level.stufe} className={`flex items-center justify-between rounded border px-2 py-1 ${stufeStyles[level.stufe]}`}>
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-block text-[9px] px-1.5 py-[1px] rounded-full font-medium ${
                            level.stufe === 0 ? "bg-status-green-light text-status-green-dark" :
                            level.stufe === 1 ? "bg-status-amber-light text-status-amber-dark" :
                            level.stufe === 2 ? "bg-status-red-light text-status-red-dark" :
                            "bg-brand-red text-white"
                          }`}>Stufe {level.stufe}</span>
                          <span className="text-[10px] text-gray-500">{stufeLabels[level.stufe]}</span>
                        </div>
                        <div className="text-right">
                          <div className={`text-[11px] font-mono font-medium ${level.stufe >= 2 ? "text-brand-red" : level.stufe === 1 ? "text-status-amber-dark" : "text-gray-600"}`}>
                            {fmtEur(level.total)}
                          </div>
                          <div className="text-[9px] text-gray-400">{level.count} Zahlungen / {level.supplierCount} Lief.</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Überfällig gesamt */}
                  <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-brand-red uppercase">Überfällig gesamt</span>
                    <div className="text-right">
                      <div className="text-[13px] font-semibold text-brand-red">{fmtEur(dashOverdueTotal.total)}</div>
                      <div className="text-[9px] text-gray-400">{dashOverdueTotal.count} Zahlungen</div>
                    </div>
                  </div>
                </div>

                {/* MIDDLE: Container Value - Shipped */}
                <div className="bg-white rounded border border-gray-100 p-2.5 flex flex-col">
                  <div className="text-[10px] font-medium text-gray-500 uppercase tracking-[0.4px] mb-1.5">Container Value — Shipped</div>
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="text-[9px] text-gray-400 mb-0.5">Warenwert aller verschifften Container</div>
                    <div className="text-[20px] font-bold text-gray-900">{fmtEur(goodsStats.containerValue)}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{goodsStats.containerCount} Container unterwegs</div>
                  </div>
                  <div className="mt-auto pt-1.5 border-t border-gray-100 flex items-center justify-between text-[10px]">
                    <span className="text-gray-400">Offener Restbetrag</span>
                    <span className="font-medium text-amber-600">{fmtEur(goodsStats.containerValue - goodsStats.depositPaid)}</span>
                  </div>
                </div>

                {/* RIGHT: Shipped - Deposit Value PAID */}
                <div className="bg-white rounded border border-gray-100 p-2.5 flex flex-col">
                  <div className="text-[10px] font-medium text-gray-500 uppercase tracking-[0.4px] mb-1.5">Shipped — Deposit Value PAID</div>
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="text-[9px] text-gray-400 mb-0.5">Geleistete Anzahlungen für verschiffte Ware</div>
                    <div className="text-[20px] font-bold text-emerald-600">{fmtEur(goodsStats.depositPaid)}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {goodsStats.containerValue > 0
                        ? `${Math.round((goodsStats.depositPaid / goodsStats.containerValue) * 100)}% des Warenwerts`
                        : "—"}
                    </div>
                  </div>
                  <div className="mt-auto pt-1.5 border-t border-gray-100 flex items-center justify-between text-[10px]">
                    <span className="text-gray-400">Warenwert gesamt</span>
                    <span className="font-medium text-gray-700">{fmtEur(goodsStats.containerValue)}</span>
                  </div>
                </div>
              </div>

              {/* In Production KPIs */}
              <div className="grid grid-cols-3 gap-1.5">
                {/* LEFT: Summary KPIs */}
                <div className="bg-white rounded border border-gray-100 p-2">
                  <div className="text-[8px] font-medium text-violet-600 uppercase tracking-[0.4px] mb-1.5">🏭 In Production — Übersicht</div>
                  <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                    <div className="rounded border border-violet-100 bg-violet-50/30 px-1.5 py-1">
                      <div className="text-[7px] text-gray-500 uppercase">Bestellungen</div>
                      <div className="text-[14px] font-semibold text-gray-900">{prodStats.totalOrders}</div>
                    </div>
                    <div className="rounded border border-emerald-100 bg-emerald-50/30 px-1.5 py-1">
                      <div className="text-[7px] text-gray-500 uppercase">Anzahlungen ges.</div>
                      <div className="text-[12px] font-semibold text-emerald-600">{fmtEur(prodStats.totalDeposit)}</div>
                    </div>
                  </div>
                  {/* Orders by month chart */}
                  <div className="text-[7px] font-medium text-gray-500 uppercase tracking-[0.3px] mb-1">Geplante Orders nach Monat (ETD Plan)</div>
                  {prodStats.ordersByMonth.length === 0 ? (
                    <div className="text-[9px] text-gray-300 py-2">Keine ETD-Daten</div>
                  ) : (
                    <div className="space-y-[3px]">
                      {prodStats.ordersByMonth.map((m) => (
                        <div key={m.key} className="flex items-center gap-1.5">
                          <span className="text-[8px] text-gray-500 w-[36px] text-right flex-shrink-0">{m.label}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-[6px] overflow-hidden">
                            <div
                              className="h-full bg-violet-400 rounded-full"
                              style={{ width: `${Math.max(4, (m.count / prodStats.maxMonthCount) * 100)}%` }}
                            />
                          </div>
                          <span className="text-[8px] font-medium text-gray-700 w-[18px]">{m.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* MIDDLE + RIGHT: Top 10 Suppliers */}
                <div className="col-span-2 bg-white rounded border border-gray-100 p-2">
                  <div className="text-[8px] font-medium text-gray-500 uppercase tracking-[0.4px] mb-1.5">Top 10 Hersteller — Geleistete Anzahlungen in Produktion</div>
                  {prodStats.top10Suppliers.length === 0 ? (
                    <div className="text-[9px] text-gray-300 py-4 text-center">Keine Daten</div>
                  ) : (
                    <div className="space-y-[3px]">
                      {prodStats.top10Suppliers.map((s, i) => (
                        <div key={s.id} className="flex items-center gap-2">
                          <span className="text-[8px] text-gray-400 w-[12px] text-right flex-shrink-0">{i + 1}.</span>
                          <span className="text-[9px] text-gray-700 w-[120px] truncate flex-shrink-0">{s.name}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-[7px] overflow-hidden">
                            <div
                              className="h-full bg-emerald-400 rounded-full"
                              style={{ width: `${Math.max(3, (s.deposit / prodStats.maxSupplierDeposit) * 100)}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-mono font-medium text-emerald-700 w-[80px] text-right flex-shrink-0">{fmtEur(s.deposit)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Warnings section (only if there are warnings) */}
              {warnings.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium text-brand-red uppercase tracking-[0.5px]">
                      Warnungen ({warnings.length})
                    </span>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <WarningsPanel warnings={warnings} onOverride={setOverridePlan} />
                  </div>
                </div>
              )}
            </>
          )}

          {tab !== "dashboard" && tab !== "lieferverzug" && tab !== "hersteller" && tab !== "sales-push" && tab !== "forecast" && tab !== "goods-on-the-way" && tab !== "in-production" && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {renderContent()}
            </div>
          )}
          {(tab === "lieferverzug" || tab === "hersteller" || tab === "sales-push" || tab === "forecast" || tab === "goods-on-the-way" || tab === "in-production") && renderContent()}
        </main>
      </div>

      {/* Override Modal */}
      {overridePlan && (
        <OverrideModal
          plan={overridePlan}
          onClose={() => setOverridePlan(null)}
          onSave={refreshAll}
        />
      )}
    </div>
  );
}
