import postgres from "postgres";

export type SqlParameter = string | number | boolean | null | Date;
export type QueryRow = Record<string, unknown>;

export interface QueryResult<T extends QueryRow> {
  rows: T[];
  affectedRows: number;
}

export interface SqlExecutor {
  query<T extends QueryRow>(
    statement: string,
    params?: SqlParameter[],
  ): Promise<QueryResult<T>>;
}

export interface DatabaseClient extends SqlExecutor {
  readonly kind: "pglite" | "postgres";
  transaction<T>(callback: (transaction: SqlExecutor) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

declare global {
  var tHexaDatabase: Promise<DatabaseClient> | undefined;
}

function affectedRows(value: unknown) {
  if (value && typeof value === "object" && "count" in value) {
    const count = Number((value as { count?: number }).count ?? 0);
    return Number.isFinite(count) ? count : 0;
  }
  return 0;
}

async function createPostgresClient(url: string): Promise<DatabaseClient> {
  const sql = postgres(url, {
    max: Number(process.env.DATABASE_POOL_SIZE ?? 5),
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

  const query = async <T extends QueryRow>(
    statement: string,
    params: SqlParameter[] = [],
  ): Promise<QueryResult<T>> => {
    const result = await sql.unsafe(statement, params);
    return {
      rows: Array.from(result) as unknown as T[],
      affectedRows: affectedRows(result),
    };
  };

  return {
    kind: "postgres",
    query,
    transaction: async <T>(callback: (transaction: SqlExecutor) => Promise<T>) =>
      sql.begin(async (transaction) =>
        callback({
          query: async <R extends QueryRow>(
            statement: string,
            params: SqlParameter[] = [],
          ) => {
            const result = await transaction.unsafe(statement, params);
            return {
              rows: Array.from(result) as unknown as R[],
              affectedRows: affectedRows(result),
            };
          },
        }),
      ) as Promise<T>,
    close: async () => sql.end({ timeout: 5 }),
  };
}

async function createPgliteClient(): Promise<DatabaseClient> {
  const [{ PGlite }] = await Promise.all([
    import("@electric-sql/pglite"),
  ]);

  const dataDir =
    process.env.PGLITE_DATA_DIR ??
    (process.env.NODE_ENV === "test" ? "memory://" : "./.data/pglite");

  const client = await PGlite.create(dataDir);

  const query = async <T extends QueryRow>(
    statement: string,
    params: SqlParameter[] = [],
  ): Promise<QueryResult<T>> => {
    const result = await client.query<T>(statement, params);
    return {
      rows: result.rows,
      affectedRows: result.affectedRows ?? 0,
    };
  };

  return {
    kind: "pglite",
    query,
    transaction: <T>(callback: (transaction: SqlExecutor) => Promise<T>) =>
      client.transaction((transaction) =>
        callback({
          query: async <R extends QueryRow>(
            statement: string,
            params: SqlParameter[] = [],
          ) => {
            const result = await transaction.query<R>(statement, params);
            return {
              rows: result.rows,
              affectedRows: result.affectedRows ?? 0,
            };
          },
        }),
      ),
    close: () => client.close(),
  };
}

async function createDatabaseClient() {
  return process.env.DATABASE_URL
    ? createPostgresClient(process.env.DATABASE_URL)
    : createPgliteClient();
}

export function getDatabase() {
  globalThis.tHexaDatabase ??= createDatabaseClient();
  return globalThis.tHexaDatabase;
}

export async function closeDatabase() {
  if (!globalThis.tHexaDatabase) return;
  const database = await globalThis.tHexaDatabase;
  await database.close();
  globalThis.tHexaDatabase = undefined;
}
