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
