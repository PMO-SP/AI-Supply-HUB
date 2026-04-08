import { createClient, type Client, type InValue } from "@libsql/client";

export interface PreparedResult {
  all(...params: InValue[]): Promise<Record<string, unknown>[]>;
  get(...params: InValue[]): Promise<Record<string, unknown> | undefined>;
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

export async function getDb(): Promise<Db> {
  const c = getClient();

  return {
    prepare(sql: string): PreparedResult {
      return {
        async all(...params: InValue[]) {
          const result = await c.execute({ sql, args: params });
          return rowsToObjects(result.columns, result.rows as ArrayLike<InValue>[]);
        },
        async get(...params: InValue[]) {
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
      await c.batch(statements, "write");
    },
    save() {
      // No-op: Turso persists automatically
    },
  };
}
