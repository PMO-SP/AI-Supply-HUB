import initSqlJs from "sql.js";
import type { Database as SqlJsDatabase } from "sql.js";
import path from "path";
import fs from "fs";

export interface PreparedResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  all(...params: any[]): any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(...params: any[]): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run(...params: any[]): void;
}

export interface Db {
  prepare(sql: string): PreparedResult;
  exec(sql: string): void;
  pragma(str: string): void;
  transaction<T>(fn: () => T): () => T;
  save(): void;
}

let dbInstance: Db | null = null;
let sqlPromise: ReturnType<typeof initSqlJs> | null = null;

function getSql() {
  if (!sqlPromise) {
    // Locate the WASM file in node_modules
    const wasmPath = path.resolve(
      process.cwd(),
      "node_modules",
      "sql.js",
      "dist",
      "sql-wasm.wasm"
    );
    sqlPromise = initSqlJs({
      locateFile: () => wasmPath,
    });
  }
  return sqlPromise;
}

function createWrapper(sqlDb: SqlJsDatabase, dbPath: string): Db {
  let inTransaction = false;

  const save = () => {
    const data = sqlDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  };

  return {
    prepare(sql: string): PreparedResult {
      return {
        all(...params: unknown[]) {
          const stmt = sqlDb.prepare(sql);
          if (params.length > 0) {
            stmt.bind(params.map((p) => (p === undefined ? null : p)));
          }
          const results: Record<string, unknown>[] = [];
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return results;
        },
        get(...params: unknown[]) {
          const stmt = sqlDb.prepare(sql);
          if (params.length > 0) {
            stmt.bind(params.map((p) => (p === undefined ? null : p)));
          }
          let result: Record<string, unknown> | undefined;
          if (stmt.step()) {
            result = stmt.getAsObject();
          }
          stmt.free();
          return result;
        },
        run(...params: unknown[]) {
          sqlDb.run(sql, params.map((p) => (p === undefined ? null : p)));
          if (!inTransaction) save();
        },
      };
    },
    exec(sql: string) {
      sqlDb.exec(sql);
    },
    pragma(str: string) {
      try {
        sqlDb.exec(`PRAGMA ${str}`);
      } catch {
        // Some pragmas (like WAL) don't work in sql.js - safe to ignore
      }
    },
    transaction<T>(fn: () => T): () => T {
      return () => {
        inTransaction = true;
        sqlDb.exec("BEGIN TRANSACTION");
        try {
          const result = fn();
          sqlDb.exec("COMMIT");
          inTransaction = false;
          save();
          return result;
        } catch (e) {
          sqlDb.exec("ROLLBACK");
          inTransaction = false;
          throw e;
        }
      };
    },
    save,
  };
}

export async function getDb(): Promise<Db> {
  if (dbInstance) return dbInstance;

  const SQL = await getSql();

  const dbPath = process.env.DATABASE_PATH || "./db/planner.db";
  const resolvedPath = path.resolve(dbPath);

  // Ensure directory exists
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let sqlDb: SqlJsDatabase;
  if (fs.existsSync(resolvedPath)) {
    const buffer = fs.readFileSync(resolvedPath);
    sqlDb = new SQL.Database(buffer);
  } else {
    sqlDb = new SQL.Database();
  }

  const wrapper = createWrapper(sqlDb, resolvedPath);
  wrapper.pragma("foreign_keys = ON");

  // Run schema
  const schemaPath = path.resolve("./db/schema.sql");
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, "utf-8");
    sqlDb.exec(schema);
  }

  // Migrate existing tables if needed
  migrateArticles(wrapper);
  migrateShipmentPlans(wrapper);
  migrateMonthlyPerformance(wrapper);
  migrateGoodsOnTheWay(wrapper);
  wrapper.save();

  dbInstance = wrapper;
  return dbInstance;
}

function migrateArticles(database: Db) {
  const columns = database
    .prepare("PRAGMA table_info(articles)")
    .all() as { name: string }[];
  const columnNames = new Set(columns.map((c) => c.name));

  if (!columnNames.has("category")) {
    try {
      database.exec("ALTER TABLE articles ADD COLUMN category TEXT NOT NULL DEFAULT ''");
    } catch {
      // Column might already exist
    }
  }

  // Rename weeks -> days columns (add new, copy data if old exists)
  if (!columnNames.has("production_lead_time_days")) {
    try {
      database.exec("ALTER TABLE articles ADD COLUMN production_lead_time_days INTEGER NOT NULL DEFAULT 0");
      if (columnNames.has("production_lead_time_weeks")) {
        database.exec("UPDATE articles SET production_lead_time_days = production_lead_time_weeks");
      }
    } catch { /* Column might already exist */ }
  }
  if (!columnNames.has("transit_lead_time_days")) {
    try {
      database.exec("ALTER TABLE articles ADD COLUMN transit_lead_time_days INTEGER NOT NULL DEFAULT 0");
      if (columnNames.has("transit_lead_time_weeks")) {
        database.exec("UPDATE articles SET transit_lead_time_days = transit_lead_time_weeks");
      }
    } catch { /* Column might already exist */ }
  }
}

function migrateMonthlyPerformance(database: Db) {
  const columns = database
    .prepare("PRAGMA table_info(monthly_performance)")
    .all() as { name: string }[];
  const columnNames = new Set(columns.map((c) => c.name));

  const newCols = [
    { name: "performance_pct", type: "REAL", def: "0" },
    { name: "performance_m3", type: "REAL", def: "0" },
    { name: "performance_m2", type: "REAL", def: "0" },
    { name: "performance_m1", type: "REAL", def: "0" },
    { name: "trend_3m", type: "TEXT", def: "''" },
  ];

  for (const col of newCols) {
    if (!columnNames.has(col.name)) {
      try {
        database.exec(`ALTER TABLE monthly_performance ADD COLUMN ${col.name} ${col.type} DEFAULT ${col.def}`);
      } catch {
        // Column might already exist
      }
    }
  }
}

function migrateGoodsOnTheWay(database: Db) {
  try {
    const columns = database
      .prepare("PRAGMA table_info(goods_on_the_way)")
      .all() as { name: string }[];
    const columnNames = new Set(columns.map((c) => c.name));
    if (!columnNames.has("supplier_name")) {
      database.exec("ALTER TABLE goods_on_the_way ADD COLUMN supplier_name TEXT NOT NULL DEFAULT ''");
    }
    if (!columnNames.has("balance_unpaid_eur")) {
      database.exec("ALTER TABLE goods_on_the_way ADD COLUMN balance_unpaid_eur REAL NOT NULL DEFAULT 0");
    }
    if (!columnNames.has("article_name")) {
      database.exec("ALTER TABLE goods_on_the_way ADD COLUMN article_name TEXT NOT NULL DEFAULT ''");
    }
  } catch {
    // Table might not exist yet
  }
}

function migrateShipmentPlans(database: Db) {
  const columns = database
    .prepare("PRAGMA table_info(shipment_plans)")
    .all() as { name: string }[];

  const columnNames = new Set(columns.map((c) => c.name));

  const migrations: { column: string; type: string; defaultVal: string }[] = [
    { column: "current_stock_units", type: "INTEGER", defaultVal: "0" },
    { column: "units_needed_after_stock", type: "INTEGER", defaultVal: "0" },
    { column: "safety_stock_units", type: "INTEGER", defaultVal: "0" },
    { column: "total_units_needed", type: "INTEGER", defaultVal: "0" },
    { column: "stock_coverage_months", type: "REAL", defaultVal: "0" },
    { column: "status_color", type: "TEXT", defaultVal: "'green'" },
    { column: "safety_stock_breakdown", type: "TEXT", defaultVal: "NULL" },
    { column: "performance_info", type: "TEXT", defaultVal: "NULL" },
  ];

  for (const m of migrations) {
    if (!columnNames.has(m.column)) {
      try {
        database.exec(
          `ALTER TABLE shipment_plans ADD COLUMN ${m.column} ${m.type} DEFAULT ${m.defaultVal}`
        );
      } catch {
        // Column might already exist - safe to ignore
      }
    }
  }
}
