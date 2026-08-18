import { closeDatabase, getDatabase } from "@/lib/db/client";
import { migrateDatabase } from "@/lib/db/migrate";

async function main() {
  const database = await getDatabase();
  try {
    await migrateDatabase(database);
    console.log(`[DB] Applied migrations using ${database.kind}`);
  } finally {
    await closeDatabase();
  }
}

main().catch((error: unknown) => {
  console.error("[DB] Migration failed", error);
  process.exitCode = 1;
});
