import { google } from "googleapis";
import path from "path";
import type { Article, Forecast, StockLevel, MonthlyPerformance, SeasonalityEntry, Supplier, Payment, PaymentType, PaymentMethod, PaymentStatus, Stockout, StockoutStatus, DelayByMonth, SalesAction, SalesActionType, InboundOrder, ETDStatus, GoodsOnTheWay, InProduction } from "./types";

function getAuth() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  if (!keyPath) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY_PATH is not set in .env.local");
  }

  return new google.auth.GoogleAuth({
    keyFile: path.resolve(keyPath),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

function getSheetId(): string {
  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!id) {
    throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID is not set in .env.local");
  }
  return id;
}

/**
 * Parse a date string that may be in dd.mm.yyyy (German) or yyyy-mm-dd (ISO) format.
 * Returns ISO yyyy-mm-dd for DB storage. Returns empty string if unparseable.
 */
function parseDateToISO(val: unknown): string {
  const s = String(val || "").trim();
  if (!s) return "";
  // Check for German format: dd.mm.yyyy or d.m.yyyy
  const deMatch = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (deMatch) {
    const day = deMatch[1].padStart(2, "0");
    const month = deMatch[2].padStart(2, "0");
    const year = deMatch[3];
    return `${year}-${month}-${day}`;
  }
  // Check for ISO format: yyyy-mm-dd
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) return s;
  // Return as-is (e.g. "offline", "n/a")
  return s;
}

export async function fetchArticles(): Promise<Article[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getSheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "articles!A:F",
  });

  const rows = response.data.values;
  if (!rows || rows.length <= 1) return [];

  // Skip header row
  return rows.slice(1).map((row) => ({
    article_id: String(row[0] || "").trim(),
    article_name: String(row[1] || "").trim(),
    category: String(row[2] || "").trim(),
    units_per_container: parseInt(row[3], 10) || 0,
    production_lead_time_days: parseInt(row[4], 10) || 0,
    transit_lead_time_days: parseInt(row[5], 10) || 0,
  })).filter((a) => a.article_id !== "");
}

export async function fetchForecasts(): Promise<Forecast[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getSheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "forecasts!A:D",
  });

  const rows = response.data.values;
  if (!rows || rows.length <= 1) return [];

  // Skip header row
  return rows.slice(1).map((row) => ({
    article_id: String(row[0] || "").trim(),
    year: parseInt(row[1], 10) || 0,
    month: parseInt(row[2], 10) || 0,
    target_units: parseInt(row[3], 10) || 0,
  })).filter((f) => f.article_id !== "" && f.year > 0 && f.month > 0);
}

export async function fetchStockLevels(): Promise<StockLevel[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getSheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "stock_levels!A:C",
  });

  const rows = response.data.values;
  if (!rows || rows.length <= 1) return [];

  return rows.slice(1).map((row) => ({
    article_id: String(row[0] || "").trim(),
    current_stock_units: parseInt(row[1], 10) || 0,
    last_updated: String(row[2] || new Date().toISOString()).trim(),
  })).filter((s) => s.article_id !== "");
}

export async function fetchMonthlyPerformance(): Promise<MonthlyPerformance[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getSheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "monthly_performance!A:I",
  });

  const rows = response.data.values;
  if (!rows || rows.length <= 1) return [];

  return rows.slice(1).map((row) => ({
    article_id: String(row[0] || "").trim(),
    year: parseInt(row[1], 10) || 0,
    month: parseInt(row[2], 10) || 0,
    actual_units_sold: parseInt(row[3], 10) || 0,
    performance_pct: parseFloat(String(row[4] || "0").replace("%", "").trim().replace(",", ".")) || 0,
    performance_m3: parseFloat(String(row[5] || "0").replace("%", "").trim().replace(",", ".")) || 0,
    performance_m2: parseFloat(String(row[6] || "0").replace("%", "").trim().replace(",", ".")) || 0,
    performance_m1: parseFloat(String(row[7] || "0").replace("%", "").trim().replace(",", ".")) || 0,
    trend_3m: (["Unterperformance", "Uberperformance", "OK"].includes(String(row[8] || "").trim())
      ? String(row[8] || "").trim()
      : "") as import("./types").TrendStatus,
  })).filter((p) => p.article_id !== "" && p.year > 0 && p.month > 0);
}

export async function fetchSeasonality(): Promise<SeasonalityEntry[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getSheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "seasonality!A:C",
  });

  const rows = response.data.values;
  if (!rows || rows.length <= 1) return [];

  return rows.slice(1).map((row) => ({
    article_id: String(row[0] || "").trim(),
    month: parseInt(row[1], 10) || 0,
    seasonality_coefficient: parseFloat(row[2]) || 1.0,
  })).filter((s) => s.article_id !== "" && s.month >= 1 && s.month <= 12);
}

export async function fetchSuppliers(): Promise<Supplier[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getSheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "suppliers!A:F",
  });

  const rows = response.data.values;
  if (!rows || rows.length <= 1) return [];

  return rows.slice(1).map((row) => ({
    supplier_id: String(row[0] || "").trim(),
    supplier_name: String(row[1] || "").trim(),
    country: String(row[2] || "").trim(),
    contact_email: String(row[3] || "").trim(),
    payment_terms_days: parseInt(row[4], 10) || 30,
    deposit_pct: parseFloat(row[5]) || 30,
  })).filter((s) => s.supplier_id !== "");
}

export async function fetchPayments(): Promise<Payment[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getSheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "payments!A:I",
  });

  const rows = response.data.values;
  if (!rows || rows.length <= 1) return [];

  const validTypes: PaymentType[] = ["Anzahlung", "Restzahlung"];
  const validStatuses: PaymentStatus[] = ["open", "paid", "overdue"];

  const validMethods: PaymentMethod[] = ["Vorkasse", "Kreditlinie"];

  return rows.slice(1).map((row) => {
    const paymentType = String(row[3] || "").trim() as PaymentType;
    const paymentMethod = String(row[4] || "Vorkasse").trim() as PaymentMethod;
    const status = String(row[8] || "open").trim() as PaymentStatus;
    return {
      payment_id: String(row[0] || "").trim(),
      supplier_id: String(row[1] || "").trim(),
      supplier_name: String(row[2] || "").trim(),
      payment_type: validTypes.includes(paymentType) ? paymentType : "Anzahlung",
      payment_method: validMethods.includes(paymentMethod) ? paymentMethod : "Vorkasse",
      amount_eur: parseFloat(String(row[5] || "0").replace(/\./g, "").replace(",", ".")) || 0,
      due_date: parseDateToISO(row[6]),
      paid_date: row[7] ? parseDateToISO(row[7]) : null,
      status: validStatuses.includes(status) ? status : "open",
    };
  }).filter((p) => p.payment_id !== "" && p.supplier_id !== "");
}

export async function fetchStockouts(): Promise<Stockout[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getSheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "stockouts!A:G",
  });

  const rows = response.data.values;
  if (!rows || rows.length <= 1) return [];

  const validStatuses: StockoutStatus[] = ["active", "resolved"];

  return rows.slice(1).map((row) => {
    const status = String(row[6] || "active").trim() as StockoutStatus;
    return {
      article_id: String(row[0] || "").trim(),
      article_name: String(row[1] || "").trim(),
      oos_since_date: parseDateToISO(row[2]),
      available_from_date: parseDateToISO(row[3]),
      affected_orders: parseInt(row[4], 10) || 0,
      delay_days: parseInt(row[5], 10) || 0,
      status: validStatuses.includes(status) ? status : "active",
    };
  }).filter((s) => s.article_id !== "" && s.oos_since_date !== "");
}

export async function fetchDelayByMonth(): Promise<DelayByMonth[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getSheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "delay_by_month!A:F",
  });

  const rows = response.data.values;
  if (!rows || rows.length <= 1) return [];

  return rows.slice(1).map((row) => ({
    article_id: String(row[0] || "").trim(),
    year: parseInt(row[1], 10) || 0,
    month: parseInt(row[2], 10) || 0,
    total_orders: parseInt(row[3], 10) || 0,
    delayed_orders: parseInt(row[4], 10) || 0,
    delay_rate_pct: parseFloat(row[5]) || 0,
  })).filter((d) => d.article_id !== "" && d.year > 0 && d.month > 0);
}

export async function fetchSalesActions(): Promise<SalesAction[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getSheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "sales_actions!A:G",
  });

  const rows = response.data.values;
  if (!rows || rows.length <= 1) return [];

  const validActions: SalesActionType[] = ["Sales puschen", "Sales bremsen", "Keine Aktion notwendig"];

  return rows.slice(1).map((row) => {
    const action = String(row[6] || "Keine Aktion notwendig").trim() as SalesActionType;
    return {
      article_id: String(row[0] || "").trim(),
      article_name: String(row[1] || "").trim(),
      forecast_units: parseInt(String(row[2] || "0").replace(/\./g, "").replace(",", "."), 10) || 0,
      actual_units: parseInt(String(row[3] || "0").replace(/\./g, "").replace(",", "."), 10) || 0,
      performance_pct: parseFloat(String(row[4] || "0").replace("%", "").trim().replace(",", ".")) || 0,
      overstock_units: parseInt(String(row[5] || "0").replace(/\./g, "").replace(",", "."), 10) || 0,
      action: validActions.includes(action) ? action : "Keine Aktion notwendig",
    };
  }).filter((s) => s.article_id !== "");
}

export async function fetchInboundOrders(): Promise<InboundOrder[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getSheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "inbound_orders!A:J",
  });

  const rows = response.data.values;
  if (!rows || rows.length <= 1) return [];

  const validStatuses: ETDStatus[] = ["confirmed", "pending", "delayed", ""];

  return rows.slice(1).map((row) => {
    const status = String(row[7] || "").trim() as ETDStatus;
    return {
      order_id: String(row[0] || "").trim(),
      article_id: String(row[1] || "").trim(),
      supplier_id: String(row[2] || "").trim(),
      order_quantity: parseInt(String(row[3] || "0").replace(/\./g, "").replace(",", "."), 10) || 0,
      mix_or_single: String(row[4] || "").trim(),
      etd_shipping_plan: parseDateToISO(row[5]),
      etd_forwarder: parseDateToISO(row[6]),
      etd_status: validStatuses.includes(status) ? status : "",
      eta: parseDateToISO(row[8]),
      warehouse_date: parseDateToISO(row[9]),
    };
  }).filter((o) => o.order_id !== "");
}

export async function fetchGoodsOnTheWay(): Promise<GoodsOnTheWay[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getSheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "goods_on_the_way!A:L",
  });

  const rows = response.data.values;
  if (!rows || rows.length <= 1) return [];

  return rows.slice(1).map((row) => ({
    order_id: String(row[0] || "").trim(),
    supplier_id: String(row[1] || "").trim(),
    supplier_name: String(row[2] || "").trim(),
    article_id: String(row[3] || "").trim(),
    article_name: String(row[4] || "").trim(),
    order_quantity: parseInt(String(row[5] || "0").replace(/\./g, "").replace(",", "."), 10) || 0,
    etd_forwarder: parseDateToISO(row[6]),
    eta: parseDateToISO(row[7]),
    warehouse_date: parseDateToISO(row[8]),
    order_volume_eur: parseFloat(String(row[9] || "0").replace(/\./g, "").replace(",", ".")) || 0,
    deposit_value_paid_eur: parseFloat(String(row[10] || "0").replace(/\./g, "").replace(",", ".")) || 0,
    balance_unpaid_eur: parseFloat(String(row[11] || "0").replace(/\./g, "").replace(",", ".")) || 0,
  })).filter((g) => g.order_id !== "");
}

export async function fetchInProduction(): Promise<InProduction[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getSheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "in_production!A:L",
  });

  const rows = response.data.values;
  if (!rows || rows.length <= 1) return [];

  return rows.slice(1).map((row) => ({
    order_id: String(row[0] || "").trim(),
    article_id: String(row[1] || "").trim(),
    article_name: String(row[2] || "").trim(),
    supplier_id: String(row[3] || "").trim(),
    supplier_name: String(row[4] || "").trim(),
    order_quantity: parseInt(String(row[5] || "0").replace(/\./g, "").replace(",", "."), 10) || 0,
    deposit_paid_eur: parseFloat(String(row[6] || "0").replace(/\./g, "").replace(",", ".")) || 0,
    etd_shipping_plan: parseDateToISO(row[7]),
    etd_forwarder: parseDateToISO(row[8]),
    etd_status: String(row[9] || "").trim(),
    eta: parseDateToISO(row[10]),
    warehouse_date: parseDateToISO(row[11]),
  })).filter((o) => o.order_id !== "");
}
