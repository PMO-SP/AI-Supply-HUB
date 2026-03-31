import { getDb } from "./db";
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
  const db = await getDb();

  try {
    // Fetch all data from Google Sheets in parallel
    const [articles, forecasts, stockLevels, performance, seasonality, suppliers, payments, stockouts, delayByMonth, salesActions, inboundOrders, goodsOnTheWay, inProduction] =
      await Promise.all([
        fetchArticles(),
        fetchForecasts(),
        fetchStockLevels(),
        fetchMonthlyPerformance(),
        fetchSeasonality(),
        fetchSuppliers(),
        fetchPayments(),
        fetchStockouts(),
        fetchDelayByMonth(),
        fetchSalesActions(),
        fetchInboundOrders(),
        fetchGoodsOnTheWay(),
        fetchInProduction(),
      ]);

    // Get existing overrides (these survive sync)
    const overrides = db
      .prepare("SELECT * FROM overrides")
      .all() as Override[];

    // Compute shipment plans with all new data
    const plans = computeShipmentPlans({
      articles,
      forecasts,
      overrides,
      stockLevels,
      performance,
      seasonality,
    });

    // Run everything in a transaction
    const syncTransaction = db.transaction(() => {
      // Clear and re-insert articles
      db.prepare("DELETE FROM articles").run();
      const insertArticle = db.prepare(
        "INSERT OR REPLACE INTO articles (article_id, article_name, category, units_per_container, production_lead_time_days, transit_lead_time_days) VALUES (?, ?, ?, ?, ?, ?)"
      );
      for (const a of articles) {
        insertArticle.run(a.article_id, a.article_name, a.category, a.units_per_container, a.production_lead_time_days, a.transit_lead_time_days);
      }

      // Clear and re-insert forecasts
      db.prepare("DELETE FROM forecasts").run();
      const insertForecast = db.prepare(
        "INSERT OR REPLACE INTO forecasts (article_id, year, month, target_units) VALUES (?, ?, ?, ?)"
      );
      for (const f of forecasts) {
        insertForecast.run(f.article_id, f.year, f.month, f.target_units);
      }

      // Clear and re-insert stock levels
      db.prepare("DELETE FROM stock_levels").run();
      const insertStock = db.prepare(
        "INSERT OR REPLACE INTO stock_levels (article_id, current_stock_units, last_updated) VALUES (?, ?, ?)"
      );
      for (const s of stockLevels) {
        insertStock.run(s.article_id, s.current_stock_units, s.last_updated);
      }

      // Clear and re-insert monthly performance
      db.prepare("DELETE FROM monthly_performance").run();
      const insertPerf = db.prepare(
        "INSERT OR REPLACE INTO monthly_performance (article_id, year, month, actual_units_sold, performance_pct, performance_m3, performance_m2, performance_m1, trend_3m) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      for (const p of performance) {
        insertPerf.run(p.article_id, p.year, p.month, p.actual_units_sold, p.performance_pct, p.performance_m3, p.performance_m2, p.performance_m1, p.trend_3m);
      }

      // Clear and re-insert seasonality
      db.prepare("DELETE FROM seasonality").run();
      const insertSeason = db.prepare(
        "INSERT OR REPLACE INTO seasonality (article_id, month, seasonality_coefficient) VALUES (?, ?, ?)"
      );
      for (const s of seasonality) {
        insertSeason.run(s.article_id, s.month, s.seasonality_coefficient);
      }

      // Clear and re-insert suppliers
      db.prepare("DELETE FROM suppliers").run();
      const insertSupplier = db.prepare(
        "INSERT OR REPLACE INTO suppliers (supplier_id, supplier_name, country, contact_email, payment_terms_days, deposit_pct) VALUES (?, ?, ?, ?, ?, ?)"
      );
      for (const s of suppliers) {
        insertSupplier.run(s.supplier_id, s.supplier_name, s.country, s.contact_email, s.payment_terms_days, s.deposit_pct);
      }

      // Clear and re-insert payments
      db.prepare("DELETE FROM payments").run();
      const insertPayment = db.prepare(
        "INSERT OR REPLACE INTO payments (payment_id, supplier_id, supplier_name, payment_type, payment_method, amount_eur, due_date, paid_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      for (const p of payments) {
        insertPayment.run(p.payment_id, p.supplier_id, p.supplier_name, p.payment_type, p.payment_method, p.amount_eur, p.due_date, p.paid_date, p.status);
      }

      // Clear and re-insert stockouts
      db.prepare("DELETE FROM stockouts").run();
      const insertStockout = db.prepare(
        "INSERT OR REPLACE INTO stockouts (article_id, article_name, oos_since_date, available_from_date, affected_orders, delay_days, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
      );
      for (const s of stockouts) {
        insertStockout.run(s.article_id, s.article_name, s.oos_since_date, s.available_from_date, s.affected_orders, s.delay_days, s.status);
      }

      // Clear and re-insert delay_by_month
      db.prepare("DELETE FROM delay_by_month").run();
      const insertDelay = db.prepare(
        "INSERT OR REPLACE INTO delay_by_month (article_id, year, month, total_orders, delayed_orders, delay_rate_pct) VALUES (?, ?, ?, ?, ?, ?)"
      );
      for (const d of delayByMonth) {
        insertDelay.run(d.article_id, d.year, d.month, d.total_orders, d.delayed_orders, d.delay_rate_pct);
      }

      // Clear and re-insert sales_actions
      db.prepare("DELETE FROM sales_actions").run();
      const insertSalesAction = db.prepare(
        "INSERT OR REPLACE INTO sales_actions (article_id, article_name, forecast_units, actual_units, performance_pct, overstock_units, action) VALUES (?, ?, ?, ?, ?, ?, ?)"
      );
      for (const sa of salesActions) {
        insertSalesAction.run(sa.article_id, sa.article_name, sa.forecast_units, sa.actual_units, sa.performance_pct, sa.overstock_units, sa.action);
      }

      // Clear and re-insert inbound_orders
      db.prepare("DELETE FROM inbound_orders").run();
      const insertInbound = db.prepare(
        "INSERT OR REPLACE INTO inbound_orders (order_id, article_id, supplier_id, order_quantity, mix_or_single, etd_shipping_plan, etd_forwarder, etd_status, eta, warehouse_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      for (const o of inboundOrders) {
        insertInbound.run(o.order_id, o.article_id, o.supplier_id, o.order_quantity, o.mix_or_single, o.etd_shipping_plan, o.etd_forwarder, o.etd_status, o.eta, o.warehouse_date);
      }

      // Clear and re-insert goods_on_the_way
      db.prepare("DELETE FROM goods_on_the_way").run();
      const insertGoods = db.prepare(
        "INSERT OR REPLACE INTO goods_on_the_way (order_id, supplier_id, supplier_name, article_id, article_name, order_quantity, etd_forwarder, eta, warehouse_date, order_volume_eur, deposit_value_paid_eur, balance_unpaid_eur) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      for (const g of goodsOnTheWay) {
        insertGoods.run(g.order_id, g.supplier_id, g.supplier_name, g.article_id, g.article_name, g.order_quantity, g.etd_forwarder, g.eta, g.warehouse_date, g.order_volume_eur, g.deposit_value_paid_eur, g.balance_unpaid_eur);
      }

      // Clear and re-insert in_production
      db.prepare("DELETE FROM in_production").run();
      const insertInProd = db.prepare(
        "INSERT OR REPLACE INTO in_production (order_id, article_id, article_name, supplier_id, supplier_name, order_quantity, deposit_paid_eur, etd_shipping_plan, etd_forwarder, etd_status, eta, warehouse_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      for (const p of inProduction) {
        insertInProd.run(p.order_id, p.article_id, p.article_name, p.supplier_id, p.supplier_name, p.order_quantity, p.deposit_paid_eur, p.etd_shipping_plan, p.etd_forwarder, p.etd_status, p.eta, p.warehouse_date);
      }

      // Clear and re-insert shipment plans
      db.prepare("DELETE FROM shipment_plans").run();
      const insertPlan = db.prepare(
        `INSERT OR REPLACE INTO shipment_plans
         (article_id, year, month, target_units, containers_needed, arrival_date, ship_date, production_start,
          warning_type, warning_message, is_overridden,
          current_stock_units, units_needed_after_stock, safety_stock_units, total_units_needed,
          stock_coverage_months, status_color, safety_stock_breakdown, performance_info)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const p of plans) {
        insertPlan.run(
          p.article_id, p.year, p.month, p.target_units, p.containers_needed,
          p.arrival_date, p.ship_date, p.production_start,
          p.warning_type, p.warning_message, p.is_overridden ? 1 : 0,
          p.current_stock_units, p.units_needed_after_stock, p.safety_stock_units,
          p.total_units_needed, p.stock_coverage_months, p.status_color,
          p.safety_stock_breakdown, p.performance_info
        );
      }

      // Log sync
      db.prepare(
        "INSERT INTO sync_log (status, articles_count, forecasts_count, plans_count, started_at) VALUES (?, ?, ?, ?, ?)"
      ).run("success", articles.length, forecasts.length, plans.length, startedAt);
    });

    syncTransaction();

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

    try {
      db.prepare(
        "INSERT INTO sync_log (status, error_message, started_at) VALUES (?, ?, ?)"
      ).run("error", errorMessage, startedAt);
    } catch {
      // Ignore logging errors
    }

    return {
      success: false,
      articlesCount: 0,
      forecastsCount: 0,
      plansCount: 0,
      stockLevelsCount: 0,
      performanceCount: 0,
      seasonalityCount: 0,
      suppliersCount: 0,
      paymentsCount: 0,
      stockoutsCount: 0,
      delayByMonthCount: 0,
      salesActionsCount: 0,
      inboundOrdersCount: 0,
      goodsOnTheWayCount: 0,
      inProductionCount: 0,
      error: errorMessage,
    };
  }
}
