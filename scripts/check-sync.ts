import { getDatabase, closeDatabase } from "../src/lib/db/client";

async function main() {
  const database = await getDatabase();

  const { rows } = await database.query<{
    provider: string;
    checkpoint_page: number;
    full_sync_completed: boolean;
    last_successful_sync: string | null;
  }>("SELECT * FROM provider_sync_states");

  console.log("Sync states:");
  rows.forEach((r) => {
    console.log(`  ${r.provider}:`);
    console.log(`    checkpoint_page: ${r.checkpoint_page}`);
    console.log(`    full_sync_completed: ${r.full_sync_completed}`);
    console.log(`    last_successful_sync: ${r.last_successful_sync}`);
  });

  await closeDatabase();
}

main().catch(console.error);
