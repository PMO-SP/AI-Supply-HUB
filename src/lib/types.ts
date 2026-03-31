// Mirrors Google Sheet "articles"
export interface Article {
  article_id: string;
  article_name: string;
  category: string;
  units_per_container: number;
  production_lead_time_days: number;
  transit_lead_time_days: number;
}

// Mirrors Google Sheet "forecast"
export interface Forecast {
  article_id: string;
  year: number;
  month: number; // 1-12
  target_units: number;
}

// Mirrors Google Sheet "stock_levels"
export interface StockLevel {
  article_id: string;
  current_stock_units: number;
  last_updated: string;
}

// Mirrors Google Sheet "monthly_performance"
export type TrendStatus = "Unterperformance" | "Uberperformance" | "OK" | "";

export interface MonthlyPerformance {
  article_id: string;
  year: number;
  month: number;
  actual_units_sold: number;
  performance_pct: number; // projected % vs forecast (e.g. 85 = 85% of forecast)
  performance_m3: number;  // performance M-3
  performance_m2: number;  // performance M-2
  performance_m1: number;  // performance M-1
  trend_3m: TrendStatus;   // 3M Trend from Google Sheet
}

// Mirrors Google Sheet "seasonality"
export interface SeasonalityEntry {
  article_id: string;
  month: number; // 1-12
  seasonality_coefficient: number;
}

// Safety stock breakdown for transparency
export interface SafetyStockBreakdown {
  safety_stock_units: number;
  avg_daily_sales: number;
  transit_days: number;
  uncertainty_factor: number;
  sell_through_multiplier: number;
  sell_through_tier: "fast" | "medium" | "slow";
  seasonality_coefficient: number;
  historical_deviation: number;
  months_of_history: number;
}

// Performance adjustment info
export interface PerformanceInfo {
  actual_units_sold: number;
  forecast_target: number;
  variance_pct: number; // positive = selling faster, negative = slower
  flag: "accelerate" | "delay" | "on_track";
}

// Warning types for shipment plans
export type WarningType =
  | "production_start_in_past"
  | "ship_date_in_past"
  | "high_container_count"
  | "stock_running_low"
  | "urgent_reorder";

// Status color for UI
export type StatusColor = "green" | "yellow" | "red";

// Computed by planning algorithm
export interface ShipmentPlan {
  id?: number;
  article_id: string;
  article_name?: string;
  year: number;
  month: number;
  target_units: number;
  containers_needed: number;
  arrival_date: string; // ISO date string YYYY-MM-DD
  ship_date: string;
  production_start: string;
  warning_type: WarningType | null;
  warning_message: string | null;
  is_overridden: boolean;
  computed_at: string;
  // New fields
  current_stock_units: number;
  units_needed_after_stock: number;
  safety_stock_units: number;
  total_units_needed: number;
  stock_coverage_months: number;
  status_color: StatusColor;
  safety_stock_breakdown: string | null; // JSON stringified SafetyStockBreakdown
  performance_info: string | null; // JSON stringified PerformanceInfo
}

// Manual user overrides
export interface Override {
  id?: number;
  article_id: string;
  year: number;
  month: number;
  field: "containers_needed" | "ship_date" | "production_start" | "target_units";
  original_value: string;
  override_value: string;
  reason: string;
  created_at: string;
  updated_at: string;
}

// Sync log entry
export interface SyncLogEntry {
  id?: number;
  status: "success" | "error";
  articles_count: number | null;
  forecasts_count: number | null;
  plans_count: number | null;
  error_message: string | null;
  started_at: string;
  completed_at: string;
}

// Mirrors Google Sheet "suppliers"
export interface Supplier {
  supplier_id: string;
  supplier_name: string;
  country: string;
  contact_email: string;
  payment_terms_days: number;
  deposit_pct: number; // e.g. 30 = 30% Anzahlung, 70% Restzahlung
}

export type PaymentMethod = "Vorkasse" | "Kreditlinie";

// Mirrors Google Sheet "payments"
export type PaymentType = "Anzahlung" | "Restzahlung";
export type PaymentStatus = "open" | "paid" | "overdue";

export interface Payment {
  payment_id: string;
  supplier_id: string;
  supplier_name: string;
  payment_type: PaymentType;
  payment_method: PaymentMethod; // Vorkasse or Kreditlinie per payment
  amount_eur: number;
  due_date: string; // YYYY-MM-DD
  paid_date: string | null;
  status: PaymentStatus;
}

// Computed dunning level
export type MahnStufe = 0 | 1 | 2 | 3;

export interface PaymentWithDunning extends Payment {
  days_overdue: number;
  mahn_stufe: MahnStufe;
}

// Mirrors Google Sheet "stockouts"
export type StockoutStatus = "active" | "resolved";

export interface Stockout {
  article_id: string;
  article_name: string;
  oos_since_date: string; // YYYY-MM-DD
  available_from_date: string; // YYYY-MM-DD
  affected_orders: number;
  delay_days: number;
  status: StockoutStatus;
}

// Computed urgency for availability badge
export type AvailabilityUrgency = "soon" | "medium" | "far" | "offline";

export interface StockoutWithUrgency extends Stockout {
  days_until_available: number; // -1 for offline
  urgency: AvailabilityUrgency;
}

// Mirrors Google Sheet "delay_by_month"
export interface DelayByMonth {
  article_id: string;
  year: number;
  month: number;
  total_orders: number;
  delayed_orders: number;
  delay_rate_pct: number;
}

// Sales action categories
export type SalesActionType = "Sales puschen" | "Sales bremsen" | "Keine Aktion notwendig";

// Mirrors Google Sheet "sales_actions"
export interface SalesAction {
  article_id: string;
  article_name: string;
  forecast_units: number;
  actual_units: number;
  performance_pct: number; // actual/forecast * 100
  overstock_units: number;
  action: SalesActionType;
}

// Mirrors Google Sheet "inbound_orders"
export type ETDStatus = "confirmed" | "pending" | "delayed" | "";

export interface InboundOrder {
  order_id: string;
  article_id: string;
  supplier_id: string;
  order_quantity: number;
  mix_or_single: string;
  etd_shipping_plan: string;
  etd_forwarder: string;
  etd_status: ETDStatus;
  eta: string;
  warehouse_date: string;
}

// Mirrors Google Sheet "goods_on_the_way"
export interface GoodsOnTheWay {
  order_id: string;
  supplier_id: string;
  supplier_name: string;
  article_id: string;
  article_name: string;
  order_quantity: number;
  etd_forwarder: string;
  eta: string;
  warehouse_date: string;
  order_volume_eur: number;
  deposit_value_paid_eur: number;
  balance_unpaid_eur: number;
}

// Mirrors Google Sheet "in_production"
export interface InProduction {
  order_id: string;
  article_id: string;
  article_name: string;
  supplier_id: string;
  supplier_name: string;
  order_quantity: number;
  deposit_paid_eur: number;
  etd_shipping_plan: string;
  etd_forwarder: string;
  etd_status: string;
  eta: string;
  warehouse_date: string;
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
