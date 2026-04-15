import { createClient, type Client, type InValue } from "@libsql/client";
import { readFileSync } from "fs";
import { join } from "path";

export interface PreparedResult {
  all(...params: InValue[]): Promise<unknown[]>;
  get(...params: InValue[]): Promise<unknown>;
  run(...params: InValue[]): Promise<void>;
}

export interface Db {
  prepare(sql: string): PreparedResult;
  exec(sql: string): Promise<void>;
  pragma(_str: string): Promise<void>;
  batch(statements: Array<{ sql: string; args?: InValue[] }>): Promise<void>;
  save(): void;
}

let client: Client | null = null;
let schemaInitialized = false;
let migrationsRun = false;

function getClient(): Client {
  if (!client) {
    if (!process.env.TURSO_DATABASE_URL) {
      throw new Error("TURSO_DATABASE_URL is not set");
    }
    client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

function rowsToObjects(
  columns: string[],
  rows: ArrayLike<InValue>[]
): Record<string, unknown>[] {
  return rows.map((row) =>
    Object.fromEntries(columns.map((col, i) => [col, row[i]]))
  );
}

/**
 * M001: payments-Tabelle ohne FOREIGN KEY neu erstellen.
 * Turso erzwingt FK-Constraints per Default. supplier_name ist in payments
 * denormalisiert, /api/payments braucht keinen JOIN auf suppliers.
 * Der FK-Constraint würde den Sync blockieren wenn supplier_ids nicht exakt übereinstimmen.
 */
async function runMigrations(c: Client): Promise<void> {
  if (migrationsRun) return;
  try {
    const fkList = await c.execute("PRAGMA foreign_key_list(payments)");
    if (fkList.rows.length > 0) {
      await c.batch([
        { sql: "DROP TABLE IF EXISTS payments" },
        {
          sql: `CREATE TABLE payments (
            payment_id TEXT PRIMARY KEY,
            supplier_id TEXT NOT NULL,
            supplier_name TEXT NOT NULL DEFAULT '',
            payment_type TEXT NOT NULL CHECK(payment_type IN ('Anzahlung', 'Restzahlung')),
            payment_method TEXT NOT NULL DEFAULT 'Vorkasse' CHECK(payment_method IN ('Vorkasse', 'Kreditlinie')),
            amount_eur REAL NOT NULL DEFAULT 0,
            due_date TEXT NOT NULL,
            paid_date TEXT,
            status TEXT NOT NULL CHECK(status IN ('open', 'paid', 'overdue')) DEFAULT 'open',
            synced_at TEXT NOT NULL DEFAULT (datetime('now'))
          )`,
        },
      ], "write");
      console.log("[migration] M001: payments table rebuilt without FK constraint");
    }
  } catch (e) {
    // Tabelle existiert noch nicht — initSchema legt sie an
    console.log("[migration] M001: payments table not yet present, skipping");
  }
  migrationsRun = true;
}

async function initSchema(c: Client): Promise<void> {
  if (schemaInitialized) return;
  const schemaPath = join(process.cwd(), "db", "schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => ({ sql: s + ";", args: [] as InValue[] }));
  await c.batch(statements, "write");
  schemaInitialized = true;
}

export async function getDb(): Promise<Db> {
  const c = getClient();
  await runMigrations(c);
  await initSchema(c);

  return {
    prepare(sql: string): PreparedResult {
      return {
        async all(...params: InValue[]): Promise<unknown[]> {
          const result = await c.execute({ sql, args: params });
          return rowsToObjects(result.columns, result.rows as ArrayLike<InValue>[]);
        },
        async get(...params: InValue[]): Promise<unknown> {
          const result = await c.execute({ sql, args: params });
          if (result.rows.length === 0) return undefined;
          return rowsToObjects(result.columns, result.rows as ArrayLike<InValue>[])[0];
        },
        async run(...params: InValue[]) {
          await c.execute({ sql, args: params });
        },
      };
    },
    async exec(sql: string) {
      await c.execute(sql);
    },
    async pragma(_str: string) {
      // Turso handles this automatically
    },
    async batch(statements) {
      await c.batch(
        statements.map((s) => ({ sql: s.sql, args: s.args ?? [] })),
        "write"
      );
    },
    save() {
      // No-op: Turso persists automatically
    },
  };
}
