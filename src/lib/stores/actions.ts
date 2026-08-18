import { vsmovProvider } from "@/providers/vsmov";
import { ophimProvider } from "@/providers/ophim";
import { nguoncProvider } from "@/providers/nguonc";
import { kkphimProvider } from "@/providers/kkphim";
import { STORE_API_MAP } from "@/lib/stores/config";
import type { ProviderDetail } from "@/types/catalog";

const PROVIDER_MAP: Record<string, { getMovie: (slug: string) => Promise<ProviderDetail | null> }> = {
  vsmov: vsmovProvider,
  ophim: ophimProvider,
  nguonc: nguoncProvider,
  kkphim: kkphimProvider,
};

export async function getMovieDetail(storeId: string, slug: string): Promise<ProviderDetail | null> {
  // Map store slug to API provider
  const apiId = STORE_API_MAP[storeId] || storeId;
  const provider = PROVIDER_MAP[apiId];

  if (!provider) return null;

  try {
    return await provider.getMovie(slug);
  } catch (error) {
    console.error(`[Actions] Failed to get movie ${storeId}/${slug}:`, error);
    return null;
  }
}

export async function getRelatedMovies(storeId: string, options?: { limit?: number; excludeSlug?: string; type?: string }) {
  const apiId = STORE_API_MAP[storeId] || storeId;
  const provider = PROVIDER_MAP[apiId];
  if (!provider) return { items: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 24 } };

  try {
    const result = await provider.getList("latest", 1, options?.limit ?? 12);
    const items = options?.excludeSlug
      ? result.items.filter((m) => m.providerSlug !== options.excludeSlug)
      : result.items;
    return { ...result, items };
  } catch (error) {
    console.error(`[Actions] Failed to get related movies:`, error);
    return { items: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 24 } };
  }
}
