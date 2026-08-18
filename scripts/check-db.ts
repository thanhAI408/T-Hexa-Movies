import { getDatabase } from "../src/lib/db/client";

async function main() {
  const db = await getDatabase();

  const tables = await db.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
  );
  console.log("Tables:", tables.rows);

  const movies = await db.query("SELECT count(*) as count FROM canonical_movies");
  console.log("Movie count:", movies.rows[0]);

  const sample = await db.query("SELECT id, title FROM canonical_movies LIMIT 3");
  console.log("Sample movies:", sample.rows);

  await db.close();
}

main().catch(console.error);
