import { closeDatabase, getDatabase } from "@/lib/db/client";
import { listMovies } from "@/lib/catalog/repository";
import { migrateDatabase } from "@/lib/db/migrate";

async function main() {
  const database = await getDatabase();
  await migrateDatabase(database);
  const queries = ["hanh dong", "tinh yeu", "2026", "spider man"];
  for (const query of queries) {
    const samples: number[] = [];
    for (let index = 0; index < 5; index += 1) {
      const result = await listMovies({ query, limit: 20 });
      samples.push(result.elapsedMs);
    }
    const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    console.log(
      `[SEARCH] "${query}" avg=${average.toFixed(2)}ms min=${Math.min(...samples).toFixed(2)}ms max=${Math.max(...samples).toFixed(2)}ms`,
    );
  }
  await closeDatabase();
}

main().catch(async (error: unknown) => {
  console.error("[SEARCH] Benchmark failed", error);
  await closeDatabase();
  process.exitCode = 1;
});
