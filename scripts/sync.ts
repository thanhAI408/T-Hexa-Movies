import { closeDatabase, getDatabase } from "@/lib/db/client";
import { migrateDatabase } from "@/lib/db/migrate";
import { syncAll, type SyncMode } from "@/lib/sync/engine";

function readMode(): SyncMode {
  const index = process.argv.indexOf("--mode");
  const value = index >= 0 ? process.argv[index + 1] : "incremental";
  return value === "full" || value === "sample" ? value : "incremental";
}

async function main() {
  const mode = readMode();
  const database = await getDatabase();
  await migrateDatabase(database);
  const started = performance.now();
  const results = await syncAll(mode);
  console.log("[SYNC] Summary");
  for (const [provider, stats] of results) {
    console.log(
      `[SYNC][${provider.toUpperCase()}] fetched=${stats.fetched} inserted=${stats.inserted} updated=${stats.updated} merged=${stats.merged} skipped=${stats.skipped} failed=${stats.failed} sources=${stats.sources} pages=${stats.pages} duration=${stats.durationMs}ms`,
    );
  }
  console.log(`[SYNC] Total duration ${Math.round(performance.now() - started)}ms`);
  await closeDatabase();
}

main().catch(async (error: unknown) => {
  console.error("[SYNC] Fatal error", error);
  await closeDatabase();
  process.exitCode = 1;
});
