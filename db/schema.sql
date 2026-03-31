CREATE TABLE IF NOT EXISTS articles (
  article_id TEXT PRIMARY KEY,
  article_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  units_per_container INTEGER NOT NULL,
  production_lead_time_days INTEGER NOT NULL,
  transit_lead_time_days INTEGER NOT NULL,
  synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS forecasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  target_units INTEGER NOT NULL,
  synced_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(article_id, year, month),
  FOREIGN KEY (article_id) REFERENCES articles(article_id)
);

CREATE TABLE IF NOT EXISTS stock_levels (
  article_id TEXT PRIMARY KEY,
  current_stock_units INTEGER NOT NULL DEFAULT 0,
  last_updated TEXT NOT NULL DEFAULT (datetime('now')),
  synced_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (article_id) REFERENCES articles(article_id)
);

CREATE TABLE IF NOT EXISTS monthly_performance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  actual_units_sold INTEGER NOT NULL DEFAULT 0,
  performance_pct REAL NOT NULL DEFAULT 0,
  performance_m3 REAL NOT NULL DEFAULT 0,
  performance_m2 REAL NOT NULL DEFAULT 0,
  performance_m1 REAL NOT NULL DEFAULT 0,
  trend_3m TEXT NOT NULL DEFAULT '',
  synced_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(article_id, year, month),
  FOREIGN KEY (article_id) REFERENCES articles(article_id)
);

CREATE TABLE IF NOT EXISTS seasonality (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id TEXT NOT NULL,
  month INTEGER NOT NULL CHECK(month >= 1 AND month <= 12),
  seasonality_coefficient REAL NOT NULL DEFAULT 1.0,
  synced_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(article_id, month),
  FOREIGN KEY (article_id) REFERENCES articles(article_id)
);

CREATE TABLE IF NOT EXISTS shipment_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  target_units INTEGER NOT NULL,
  containers_needed INTEGER NOT NULL,
  arrival_date TEXT NOT NULL,
  ship_date TEXT NOT NULL,
  production_start TEXT NOT NULL,
  warning_type TEXT,
  warning_message TEXT,
  is_overridden INTEGER NOT NULL DEFAULT 0,
  computed_at TEXT NOT NULL DEFAULT (datetime('now')),
  current_stock_units INTEGER NOT NULL DEFAULT 0,
  units_needed_after_stock INTEGER NOT NULL DEFAULT 0,
  safety_stock_units INTEGER NOT NULL DEFAULT 0,
  total_units_needed INTEGER NOT NULL DEFAULT 0,
  stock_coverage_months REAL NOT NULL DEFAULT 0,
  status_color TEXT NOT NULL DEFAULT 'green',
  safety_stock_breakdown TEXT,
  performance_info TEXT,
  UNIQUE(article_id, year, month),
  FOREIGN KEY (article_id) REFERENCES articles(article_id)
);

CREATE TABLE IF NOT EXISTS overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  field TEXT NOT NULL CHECK(field IN ('containers_needed', 'ship_date', 'production_start', 'target_units')),
  original_value TEXT NOT NULL,
  override_value TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(article_id, year, month, field),
  FOREIGN KEY (article_id) REFERENCES articles(article_id)
);

CREATE TABLE IF NOT EXISTS suppliers (
  supplier_id TEXT PRIMARY KEY,
  supplier_name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  payment_terms_days INTEGER NOT NULL DEFAULT 30,
  deposit_pct REAL NOT NULL DEFAULT 30,
  synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payments (
  payment_id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  supplier_name TEXT NOT NULL DEFAULT '',
  payment_type TEXT NOT NULL CHECK(payment_type IN ('Anzahlung', 'Restzahlung')),
  payment_method TEXT NOT NULL DEFAULT 'Vorkasse' CHECK(payment_method IN ('Vorkasse', 'Kreditlinie')),
  amount_eur REAL NOT NULL DEFAULT 0,
  due_date TEXT NOT NULL,
  paid_date TEXT,
  status TEXT NOT NULL CHECK(status IN ('open', 'paid', 'overdue')) DEFAULT 'open',
  synced_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
);

CREATE TABLE IF NOT EXISTS stockouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id TEXT NOT NULL,
  article_name TEXT NOT NULL DEFAULT '',
  oos_since_date TEXT NOT NULL,
  available_from_date TEXT NOT NULL,
  affected_orders INTEGER NOT NULL DEFAULT 0,
  delay_days INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('active', 'resolved')) DEFAULT 'active',
  synced_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(article_id, oos_since_date)
);

CREATE TABLE IF NOT EXISTS delay_by_month (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  total_orders INTEGER NOT NULL DEFAULT 0,
  delayed_orders INTEGER NOT NULL DEFAULT 0,
  delay_rate_pct REAL NOT NULL DEFAULT 0,
  synced_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(article_id, year, month)
);

CREATE TABLE IF NOT EXISTS sales_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id TEXT NOT NULL,
  article_name TEXT NOT NULL DEFAULT '',
  forecast_units INTEGER NOT NULL DEFAULT 0,
  actual_units INTEGER NOT NULL DEFAULT 0,
  performance_pct REAL NOT NULL DEFAULT 0,
  overstock_units INTEGER NOT NULL DEFAULT 0,
  action TEXT NOT NULL DEFAULT 'Keine Aktion notwendig' CHECK(action IN ('Sales puschen', 'Sales bremsen', 'Keine Aktion notwendig')),
  synced_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(article_id)
);

CREATE TABLE IF NOT EXISTS inbound_orders (
  order_id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  order_quantity INTEGER NOT NULL DEFAULT 0,
  mix_or_single TEXT NOT NULL DEFAULT '',
  etd_shipping_plan TEXT NOT NULL DEFAULT '',
  etd_forwarder TEXT NOT NULL DEFAULT '',
  etd_status TEXT NOT NULL DEFAULT '',
  eta TEXT NOT NULL DEFAULT '',
  warehouse_date TEXT NOT NULL DEFAULT '',
  synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS goods_on_the_way (
  order_id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  supplier_name TEXT NOT NULL DEFAULT '',
  article_id TEXT NOT NULL,
  article_name TEXT NOT NULL DEFAULT '',
  order_quantity INTEGER NOT NULL DEFAULT 0,
  etd_forwarder TEXT NOT NULL DEFAULT '',
  eta TEXT NOT NULL DEFAULT '',
  warehouse_date TEXT NOT NULL DEFAULT '',
  order_volume_eur REAL NOT NULL DEFAULT 0,
  deposit_value_paid_eur REAL NOT NULL DEFAULT 0,
  balance_unpaid_eur REAL NOT NULL DEFAULT 0,
  synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS in_production (
  order_id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  article_name TEXT NOT NULL DEFAULT '',
  supplier_id TEXT NOT NULL,
  supplier_name TEXT NOT NULL DEFAULT '',
  order_quantity INTEGER NOT NULL DEFAULT 0,
  deposit_paid_eur REAL NOT NULL DEFAULT 0,
  etd_shipping_plan TEXT NOT NULL DEFAULT '',
  etd_forwarder TEXT NOT NULL DEFAULT '',
  etd_status TEXT NOT NULL DEFAULT '',
  eta TEXT NOT NULL DEFAULT '',
  warehouse_date TEXT NOT NULL DEFAULT '',
  synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT NOT NULL CHECK(status IN ('success', 'error')),
  articles_count INTEGER,
  forecasts_count INTEGER,
  plans_count INTEGER,
  error_message TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
