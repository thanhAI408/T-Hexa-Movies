import { vsmovProvider } from "@/providers/vsmov";
import { ophimProvider } from "@/providers/ophim";
import { nguoncProvider } from "@/providers/nguonc";
import { kkphimProvider } from "@/providers/kkphim";
import { vidsrcProvider } from "@/providers/vidsrc";
import { vidlinkProvider } from "@/providers/vidlink";
import { STORE_API_MAP } from "@/lib/stores/config";
import { parseMovieReference } from "./movie-reference";
import { discoverMovies, discoverQuerySchema } from "./discover";
import type { ProviderDetail, ProviderId } from "@/types/catalog";
import { enrichEpisodesWithFallbacks, getRemainingVnProviders } from "@/lib/streaming/fallback";

const providers = { vsmov: vsmovProvider, ophim: ophimProvider, nguonc: nguoncProvider, kkphim: kkphimProvider, vidsrc: vidsrcProvider, vidlink: vidlinkProvider };

export async function getMovieDetail(storeId: string, reference: string): Promise<ProviderDetail | null> {
  const { provider: referencedProvider, slug } = parseMovieReference(reference);
  const primary = (referencedProvider || STORE_API_MAP[storeId] || storeId) as ProviderId;
  if (!providers[primary] || !slug) return null;
  // Explicit source links must never silently resolve a different catalog/movie.
  // Keep old numeric international links and unqualified Vietnamese links working.
  const sequence: ProviderId[] = referencedProvider ? [primary] : /^\d+$/.test(slug)
    ? ["vidsrc", "vidlink"]
    : [primary, ...getRemainingVnProviders(primary)];
  for (const id of sequence) {
    try {
      const detail = await providers[id].getMovie(slug);
      if (detail) return enrichEpisodesWithFallbacks(detail, storeId);
    } catch (error) {
      console.warn(`[Movie] ${id}:`, error instanceof Error ? error.message : "Source unavailable");
    }
  }
  return null;
}

export async function getRelatedMovies(storeId: string, options?: { limit?: number; excludeSlug?: string; type?: string }) {
  try {
    const result = await discoverMovies(storeId, discoverQuerySchema.parse({ limit: options?.limit ?? 12 }));
    const excluded = options?.excludeSlug ? parseMovieReference(options.excludeSlug).slug : null;
    return { ...result, items: result.items.filter(movie => parseMovieReference(movie.providerSlug).slug !== excluded) };
  } catch {
    return { items: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: options?.limit ?? 12 } };
  }
}
