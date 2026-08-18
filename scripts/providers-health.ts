import { closeDatabase, getDatabase } from "@/lib/db/client";
import { migrateDatabase } from "@/lib/db/migrate";
import { updateSyncState } from "@/lib/catalog/repository";
import { providers } from "@/providers";

async function main() {
  const database = await getDatabase();
  await migrateDatabase(database);
  const results = await Promise.all(providers.map((provider) => provider.healthCheck()));
  for (const result of results) {
    await updateSyncState({
      provider: result.provider,
      status: result.status,
      checkpointPage: 1,
      fullSyncCompleted: false,
      latencyMs: result.latencyMs,
      error: result.error,
    });
    console.log(
      `[${result.provider.toUpperCase()}] ${result.status} ${result.latencyMs}ms${result.error ? ` — ${result.error}` : ""}`,
    );
  }
  await closeDatabase();
}

main().catch(async (error: unknown) => {
  console.error("[HEALTH] Fatal error", error);
  await closeDatabase();
  process.exitCode = 1;
});
