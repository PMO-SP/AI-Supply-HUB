import { getDb } from "./db";
import type { InValue } from "@libsql/client";
import {
  fetchArticles,
  fetchForecasts,
  fetchStockLevels,
  fetchMonthlyPerformance,
  fetchSeasonality,
  fetchSuppliers,
  fetchPayments,
  fetchStockouts,
  fetchDelayByMonth,
  fetchSalesActions,
  fetchInboundOrders,
  fetchGoodsOnTheWay,
  fetchInProduction,
} from "./google-sheets";
import { computeShipmentPlans } from "./planner";
import type { Override } from "./types";

export interface SyncResult {
  success: boolean;
  articlesCount: number;
  forecastsCount: number;
  plansCount: number;
  stockLevelsCount: number;
  performanceCount: number;
  seasonalityCount: number;
  suppliersCount: number;
  paymentsCount: number;
  stockoutsCount: number;
  delayByMonthCount: number;
  salesActionsCount: number;
  inboundOrdersCount: number;
  goodsOnTheWayCount: number;
  inProductionCount: number;
  error?: string;
}

export async function syncFromGoogleSheets(): Promise<SyncResult> {
  const startedAt = new Date().toISOString();

  try {
    console.log("[sync] Start");
    const db = await getDb();
    const [
      articles, forecasts, stockLevels, performance, seasonality,
      suppliers, payments, stockouts, delayByMonth, salesActions,
      inboundOrders, goodsOnTheWay, inProduction,
    ] = await Promise.all([
      fetchArticles(), fetchForecasts(), fetchStockLevels(),
      fetchMonthlyPerformance(), fetchSeasonality(), fetchSuppliers(),
      fetchPayments(), fetchStockouts(), fetchDelayByMonth(),
      fetchSalesActions(), fetchInboundOrders(), fetchGoodsOnTheWay(),
      fetchInProduction(),
    ]);

    console.log("[sync] Sheets geladen:", {
      articles: articles.length, forecasts: forecasts.length,
      stockLevels: stockLevels.length, performance: performance.length,
      seasonality: seasonality.length, suppliers: suppliers.length,
      payments: payments.length, stockouts: stockouts.length,
      delayByMonth: delayByMonth.length, salesActions: salesActions.length,
      inboundOrders: inboundOrders.length, goodsOnTheWay: goodsOnTheWay.length,
      inProduction: inProduction.length,
    });

    const overrides = (await db.prepare("SELECT * FROM overrides").all()) as unknown as Override[];

    const plans = computeShipmentPlans({
      articles, forecasts, overrides, stockLevels, performance, seasonality,
    });

    const statements: { sql: string; args?: InValue[] }[] = [];

    // Articles
    statements.push({ sql: "DELETE FROM articles" });
    for (const a of articles) {
      statements.push({
        sql: "INSERT OR REPLACE INTO articles (article_id, article_name, category, units_per_container, production_lead_time_days, transit_lead_time_days) VALUES (?, ?, ?, ?, ?, ?)",
        args: [a.article_id, a.article_name, a.category, a.units_per_container, a.production_lead_time_days, a.transit_lead_time_days],
      });
    }

    // Forecasts
    statements.push({ sql: "DELETE FROM forecasts" });
    for (const f of forecasts) {
      statements.push({
        sql: "INSERT OR REPLACE INTO forecasts (article_id, year, month, target_units) VALUES (?, ?, ?, ?)",
        args: [f.article_id, f.year, f.month, f.target_units],
      });
    }

    // Stock levels
    statements.push({ sql: "DELETE FROM stock_levels" });
    for (const s of stockLevels) {
      statements.push({
        sql: "INSERT OR REPLACE INTO stock_levels (article_id, current_stock_units, last_updated) VALUES (?, ?, ?)",
        args: [s.article_id, s.current_stock_units, s.last_updated],
      });
    }

    // Monthly performance
    statements.push({ sql: "DELETE FROM monthly_performance" });
    for (const p of performance) {
      statements.push({
        sql: "INSERT OR REPLACE INTO monthly_performance (article_id, year, month, actual_units_sold, performance_pct, performance_m3, performance_m2, performance_m1, trend_3m) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [p.article_id, p.year, p.month, p.actual_units_sold, p.performance_pct, p.performance_m3, p.performance_m2, p.performance_m1, p.trend_3m],
      });
    }

    // Seasonality
    statements.push({ sql: "DELETE FROM seasonality" });
    for (const s of seasonality) {
      statements.push({
        sql: "INSERT OR REPLACE INTO seasonality (article_id, month, seasonality_coefficient) VALUES (?, ?, ?)",
        args: [s.article_id, s.month, s.seasonality_coefficient],
      });
    }

    // Suppliers
    statements.push({ sql: "DELETE FROM suppliers" });
    for (const s of suppliers) {
      statements.push({
        sql: "INSERT OR REPLACE INTO suppliers (supplier_id, supplier_name, country, contact_email, payment_terms_days, deposit_pct) VALUES (?, ?, ?, ?, ?, ?)",
        args: [s.supplier_id, s.supplier_name, s.country, s.contact_email, s.payment_terms_days, s.deposit_pct],
      });
    }

    // Payments
    statements.push({ sql: "DELETE FROM payments" });
    for (const p of payments) {
      statements.push({
        sql: "INSERT OR REPLACE INTO payments (payment_id, supplier_id, supplier_name, payment_type, payment_method, amount_eur, due_date, paid_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [p.payment_id, p.supplier_id, p.supplier_name, p.payment_type, p.payment_method, p.amount_eur, p.due_date, p.paid_date, p.status],
      });
    }

    // Stockouts
    statements.push({ sql: "DELETE FROM stockouts" });
    for (const s of stockouts) {
      statements.push({
        sql: "INSERT OR REPLACE INTO stockouts (article_id, article_name, oos_since_date, available_from_date, affected_orders, delay_days, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [s.article_id, s.article_name, s.oos_since_date, s.available_from_date, s.affected_orders, s.delay_days, s.status],
      });
    }

    // Delay by month
    statements.push({ sql: "DELETE FROM delay_by_month" });
    for (const d of delayByMonth) {
      statements.push({
        sql: "INSERT OR REPLACE INTO delay_by_month (article_id, year, month, total_orders, delayed_orders, delay_rate_pct) VALUES (?, ?, ?, ?, ?, ?)",
        args: [d.article_id, d.year, d.month, d.total_orders, d.delayed_orders, d.delay_rate_pct],
      });
    }

    // Sales actions
    statements.push({ sql: "DELETE FROM sales_actions" });
    for (const sa of salesActions) {
      statements.push({
        sql: "INSERT OR REPLACE INTO sales_actions (article_id, article_name, forecast_units, actual_units, performance_pct, overstock_units, action) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [sa.article_id, sa.article_name, sa.forecast_units, sa.actual_units, sa.performance_pct, sa.overstock_units, sa.action],
      });
    }

    // Inbound orders
    statements.push({ sql: "DELETE FROM inbound_orders" });
    for (const o of inboundOrders) {
      statements.push({
        sql: "INSERT OR REPLACE INTO inbound_orders (order_id, article_id, supplier_id, order_quantity, mix_or_single, etd_shipping_plan, etd_forwarder, etd_status, eta, warehouse_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [o.order_id, o.article_id, o.supplier_id, o.order_quantity, o.mix_or_single, o.etd_shipping_plan, o.etd_forwarder, o.etd_status, o.eta, o.warehouse_date],
      });
    }

    // Goods on the way
    statements.push({ sql: "DELETE FROM goods_on_the_way" });
    for (const g of goodsOnTheWay) {
      statements.push({
        sql: "INSERT OR REPLACE INTO goods_on_the_way (order_id, supplier_id, supplier_name, article_id, article_name, order_quantity, etd_forwarder, eta, warehouse_date, order_volume_eur, deposit_value_paid_eur, balance_unpaid_eur) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [g.order_id, g.supplier_id, g.supplier_name, g.article_id, g.article_name, g.order_quantity, g.etd_forwarder, g.eta, g.warehouse_date, g.order_volume_eur, g.deposit_value_paid_eur, g.balance_unpaid_eur],
      });
    }

    // In production
    statements.push({ sql: "DELETE FROM in_production" });
    for (const p of inProduction) {
      statements.push({
        sql: "INSERT OR REPLACE INTO in_production (order_id, article_id, article_name, supplier_id, supplier_name, order_quantity, deposit_paid_eur, etd_shipping_plan, etd_forwarder, etd_status, eta, warehouse_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [p.order_id, p.article_id, p.article_name, p.supplier_id, p.supplier_name, p.order_quantity, p.deposit_paid_eur, p.etd_shipping_plan, p.etd_forwarder, p.etd_status, p.eta, p.warehouse_date],
      });
    }

    // Shipment plans
    statements.push({ sql: "DELETE FROM shipment_plans" });
    for (const p of plans) {
      statements.push({
        sql: `INSERT OR REPLACE INTO shipment_plans
          (article_id, year, month, target_units, containers_needed, arrival_date, ship_date, production_start,
           warning_type, warning_message, is_overridden,
           current_stock_units, units_needed_after_stock, safety_stock_units, total_units_needed,
           stock_coverage_months, status_color, safety_stock_breakdown, performance_info)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          p.article_id, p.year, p.month, p.target_units, p.containers_needed,
          p.arrival_date, p.ship_date, p.production_start,
          p.warning_type, p.warning_message, p.is_overridden ? 1 : 0,
          p.current_stock_units, p.units_needed_after_stock, p.safety_stock_units,
          p.total_units_needed, p.stock_coverage_months, p.status_color,
          p.safety_stock_breakdown, p.performance_info,
        ],
      });
    }

    // Sync log
    statements.push({
      sql: "INSERT INTO sync_log (status, articles_count, forecasts_count, plans_count, started_at) VALUES (?, ?, ?, ?, ?)",
      args: ["success", articles.length, forecasts.length, plans.length, startedAt],
    });

    await db.batch(statements);

    return {
      success: true,
      articlesCount: articles.length,
      forecastsCount: forecasts.length,
      plansCount: plans.length,
      stockLevelsCount: stockLevels.length,
      performanceCount: performance.length,
      seasonalityCount: seasonality.length,
      suppliersCount: suppliers.length,
      paymentsCount: payments.length,
      stockoutsCount: stockouts.length,
      delayByMonthCount: delayByMonth.length,
      salesActionsCount: salesActions.length,
      inboundOrdersCount: inboundOrders.length,
      goodsOnTheWayCount: goodsOnTheWay.length,
      inProductionCount: inProduction.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[sync] Fehler:", errorMessage);
    try {
      const db = await getDb();
      await db.prepare(
        "INSERT INTO sync_log (status, error_message, started_at) VALUES (?, ?, ?)"
      ).run("error", errorMessage, startedAt);
    } catch { /* ignore */ }

    return {
      success: false,
      articlesCount: 0, forecastsCount: 0, plansCount: 0,
      stockLevelsCount: 0, performanceCount: 0, seasonalityCount: 0,
      suppliersCount: 0, paymentsCount: 0, stockoutsCount: 0,
      delayByMonthCount: 0, salesActionsCount: 0, inboundOrdersCount: 0,
      goodsOnTheWayCount: 0, inProductionCount: 0,
      error: errorMessage,
    };
  }
}
