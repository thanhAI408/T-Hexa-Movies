import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { DatabaseClient, SqlExecutor } from "@/lib/db/client";

interface MigrationRow extends Record<string, unknown> {
  filename: string;
  checksum: string;
}

function statements(sql: string) {
  return sql
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function ensureMigrationTable(database: SqlExecutor) {
  await database.query(`
    CREATE TABLE IF NOT EXISTS _t_hexa_migrations (
      filename text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

export async function migrateDatabase(
  database: DatabaseClient,
  migrationsFolder = path.join(process.cwd(), "drizzle"),
) {
  await ensureMigrationTable(database);
  const filenames = (await readdir(migrationsFolder))
    .filter((filename) => filename.endsWith(".sql"))
    .sort();

  for (const filename of filenames) {
    const source = await readFile(path.join(migrationsFolder, filename), "utf8");
    const checksum = createHash("sha256").update(source).digest("hex");
    const applied = await database.query<MigrationRow>(
      "SELECT filename, checksum FROM _t_hexa_migrations WHERE filename = $1",
      [filename],
    );

    if (applied.rows[0]) {
      if (applied.rows[0].checksum !== checksum) {
        throw new Error(`Migration ${filename} changed after it was applied`);
      }
      continue;
    }

    await database.transaction(async (transaction) => {
      for (const statement of statements(source)) {
        await transaction.query(statement);
      }
      await transaction.query(
        "INSERT INTO _t_hexa_migrations (filename, checksum) VALUES ($1, $2)",
        [filename, checksum],
      );
    });
  }
}
