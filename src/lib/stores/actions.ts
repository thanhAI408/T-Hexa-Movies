import { vsmovProvider } from "@/providers/vsmov";
import { ophimProvider } from "@/providers/ophim";
import { nguoncProvider } from "@/providers/nguonc";
import { kkphimProvider } from "@/providers/kkphim";
import { STORE_API_MAP } from "@/lib/stores/config";
import type { ProviderDetail, ProviderListResult } from "@/types/catalog";
import type { ProviderListKind } from "@/providers/types";
import { enrichEpisodesWithFallbacks, getRemainingVnProviders } from "@/lib/streaming/fallback";

interface MovieProvider {
  getMovie(slug: string): Promise<ProviderDetail | null>;
  getList(kind: ProviderListKind, page?: number, limit?: number): Promise<ProviderListResult>;
}

const PROVIDER_MAP: Record<string, MovieProvider> = {
  vsmov: vsmovProvider,
  ophim: ophimProvider,
  nguonc: nguoncProvider,
  kkphim: kkphimProvider,
};

export async function getMovieDetail(storeId: string, slug: string): Promise<ProviderDetail | null> {
  const apiId = STORE_API_MAP[storeId] || storeId;
  const primaryProvider = PROVIDER_MAP[apiId];

  let detail: ProviderDetail | null = null;

  // 1. Try Primary Provider
  if (primaryProvider) {
    try {
      detail = await primaryProvider.getMovie(slug);
    } catch (error) {
      console.warn(`[Actions] Primary provider (${apiId}) failed for movie ${slug}:`, error);
    }
  }

  // 2. If Primary Provider fails, activate Fallback 3 across other Vietnamese providers
  if (!detail) {
    const backupProviders = getRemainingVnProviders(apiId);
    for (const backupId of backupProviders) {
      const backupProvider = PROVIDER_MAP[backupId];
      if (!backupProvider) continue;

      try {
        detail = await backupProvider.getMovie(slug);
        if (detail) {
          console.info(`[Actions] Successfully recovered movie ${slug} using Fallback 3 (${backupId})`);
          break;
        }
      } catch (backupError) {
        // Continue to next backup
      }
    }
  }

  if (!detail) return null;

  // If TMDB ID is missing, try to resolve it from KKPhim metadata for international embeds
  if (!detail.movie.externalIds?.tmdbId && !detail.movie.externalIds?.imdbId) {
    try {
      const searchTarget = detail.movie.originalTitle || detail.movie.title || slug;
      const match = await kkphimProvider.search(searchTarget, 1, 3);
      const found = match.items.find(
        (m) => m.externalIds?.tmdbId || (m.raw?.tmdb as any)?.id
      );
      if (found) {
        const resolvedTmdb = found.externalIds?.tmdbId || String((found.raw?.tmdb as any)?.id);
        const resolvedImdb = found.externalIds?.imdbId || String((found.raw?.imdb as any)?.id || "");
        detail.movie.externalIds = {
          tmdbId: resolvedTmdb || null,
          imdbId: resolvedImdb || null,
        };
      }
    } catch {
      // Ignore lookup failure
    }
  }

  // 3. Enrich with Fallback 1 (VidSrc) and Fallback 2 (VidLink) servers
  return enrichEpisodesWithFallbacks(detail, storeId);
}

export async function getRelatedMovies(storeId: string, options?: { limit?: number; excludeSlug?: string; type?: string }) {
  const apiId = STORE_API_MAP[storeId] || storeId;
  const primaryProvider = PROVIDER_MAP[apiId];
  const requestedLimit = options?.limit ?? 12;

  let result: ProviderListResult | null = null;

  if (primaryProvider) {
    try {
      result = await primaryProvider.getList("latest", 1, requestedLimit);
    } catch (error) {
      console.warn(`[Actions] Primary provider (${apiId}) failed for related movies:`, error);
    }
  }

  if (!result || !result.items || result.items.length === 0) {
    const backupProviders = getRemainingVnProviders(apiId);
    for (const backupId of backupProviders) {
      const backupProvider = PROVIDER_MAP[backupId];
      if (!backupProvider) continue;
      try {
        result = await backupProvider.getList("latest", 1, requestedLimit);
        if (result && result.items && result.items.length > 0) break;
      } catch {
        // Continue
      }
    }
  }

  if (!result || !result.items) {
    return { items: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: requestedLimit } };
  }

  const items = options?.excludeSlug
    ? result.items.filter((m: any) => m.providerSlug !== options.excludeSlug)
    : result.items;

  return { ...result, items };
}
