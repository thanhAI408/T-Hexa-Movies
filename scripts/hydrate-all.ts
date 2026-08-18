import { getDatabase, closeDatabase } from "../src/lib/db/client";
import { upsertProviderMovie } from "../src/lib/catalog/repository";
import { providers } from "../src/providers";
import type { MovieProvider } from "../src/providers/types";

async function main() {
  const database = await getDatabase();

  // Get all movies without episodes, grouped by source
  const moviesWithoutEpisodes = await database.query<{
    provider: string;
    provider_slug: string;
    id: string;
  }>(`
    SELECT pm.provider, pm.provider_slug, pm.id
    FROM provider_movies pm
    LEFT JOIN episodes e ON e.movie_id = pm.canonical_movie_id
    WHERE e.id IS NULL
    ORDER BY pm.provider, pm.provider_slug
    LIMIT 500
  `);

  console.log(`Found ${moviesWithoutEpisodes.rows.length} movies without episodes`);

  const providerMap = new Map<string, MovieProvider>(
    providers.map((provider) => [provider.id, provider]),
  );
  let success = 0;
  let failed = 0;

  for (const movie of moviesWithoutEpisodes.rows) {
    const provider = providerMap.get(movie.provider);
    if (!provider) continue;

    try {
      const detail = await provider.getMovie(movie.provider_slug);
      if (detail) {
        await upsertProviderMovie(detail.movie, detail);
        success++;
        if (success % 50 === 0) {
          console.log(`Progress: ${success}/${moviesWithoutEpisodes.rows.length}`);
        }
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
      console.warn(`Failed: ${movie.provider}/${movie.provider_slug}`);
    }
  }

  console.log(`\nDone! Success: ${success}, Failed: ${failed}`);
  await closeDatabase();
}

main().catch(console.error);
