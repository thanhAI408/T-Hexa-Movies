import { getDatabase, closeDatabase } from "../src/lib/db/client";

async function main() {
  const database = await getDatabase();

  const totalMovies = await database.query<{ count: number }>("SELECT count(*)::int as count FROM canonical_movies");
  console.log("Total movies:", totalMovies.rows[0]);

  const totalEpisodes = await database.query<{ count: number }>("SELECT count(*)::int as count FROM episodes");
  console.log("Total episodes:", totalEpisodes.rows[0]);

  const totalSources = await database.query<{ count: number }>("SELECT count(*)::int as count FROM episode_sources");
  console.log("Total episode_sources:", totalSources.rows[0]);

  const moviesWithSources = await database.query<{ slug: string; ep_count: number; src_count: number }>(
    `SELECT m.slug,
            (SELECT count(*)::int FROM episodes WHERE movie_id = m.id) as ep_count,
            (SELECT count(*)::int FROM episode_sources s JOIN episodes e ON s.episode_id = e.id WHERE e.movie_id = m.id) as src_count
     FROM canonical_movies m
     WHERE EXISTS (SELECT 1 FROM episodes WHERE movie_id = m.id)
     ORDER BY src_count DESC
     LIMIT 5`,
  );
  console.log("\nMovies with sources:");
  moviesWithSources.rows.forEach((r) => console.log(`  ${r.slug}: episodes=${r.ep_count}, sources=${r.src_count}`));

  const watchableMovies = await database.query<{ slug: string; title: string; ep_count: number; src_count: number }>(
    `SELECT m.slug, m.title,
            (SELECT count(*)::int FROM episodes WHERE movie_id = m.id) as ep_count,
            (SELECT count(*)::int FROM episode_sources s JOIN episodes e ON s.episode_id = e.id WHERE e.movie_id = m.id) as src_count
     FROM canonical_movies m
     WHERE EXISTS (SELECT 1 FROM episode_sources s JOIN episodes e ON s.episode_id = e.id WHERE e.movie_id = m.id)
     ORDER BY src_count DESC
     LIMIT 10`,
  );
  console.log("\nWatchable movies (have sources):");
  watchableMovies.rows.forEach((r) => console.log(`  ${r.slug}: "${r.title}" - episodes=${r.ep_count}, sources=${r.src_count}`));

  await closeDatabase();
}

main().catch(console.error);
