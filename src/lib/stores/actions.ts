import { vsmovProvider } from "@/providers/vsmov";
import { ophimProvider } from "@/providers/ophim";
import { nguoncProvider } from "@/providers/nguonc";
import { kkphimProvider } from "@/providers/kkphim";
import { vidsrcProvider, normalizedMovieName } from "@/providers/vidsrc";
import { vidlinkProvider } from "@/providers/vidlink";
import { STORE_API_MAP } from "@/lib/stores/config";
import { parseMovieReference } from "./movie-reference";
import { discoverMovies, discoverQuerySchema } from "./discover";
import type { ProviderDetail, ProviderId, ProviderMovieInput } from "@/types/catalog";
import { buildEpisodePlaybackSources, externalIds, enrichEpisodesWithFallbacks, getProviderFallbackOrder, getRemainingVnProviders } from "@/lib/streaming/fallback";

const providers = { vsmov: vsmovProvider, ophim: ophimProvider, nguonc: nguoncProvider, kkphim: kkphimProvider, vidsrc: vidsrcProvider, vidlink: vidlinkProvider };

export async function getMovieDetail(storeId: string, reference: string): Promise<ProviderDetail | null> {
  const { provider: referencedProvider, slug } = parseMovieReference(reference);
  const primary = (referencedProvider || STORE_API_MAP[storeId] || storeId) as ProviderId;
  if (!providers[primary] || !slug) return null;
  const sequence = getProviderFallbackOrder(primary);
  let metadata: ProviderDetail | null = null;
  for (const id of sequence) {
    // TMDB references have no equivalent Vietnamese slug. Never strip their digits.
    if (/^(?:(?:movie|tv)-)?\d+$/.test(slug) && id !== "vidsrc" && id !== "vidlink") continue;
    try {
      const ids: ReturnType<typeof externalIds> | null = metadata ? externalIds(metadata.movie) : null;
      const lookup: string = (id === "vidsrc" || id === "vidlink") && ids?.tmdbId && ids.mediaType ? `${ids.mediaType}-${ids.tmdbId}` : slug;
      const detail: ProviderDetail | null = await providers[id].getMovie(lookup);
      if (!detail || (id !== "vidsrc" && id !== "vidlink" && detail.movie.providerSlug !== slug)) continue;
      if (metadata && !sameMovie(metadata.movie, detail.movie)) continue;
      metadata ||= detail;
      const playable = enrichEpisodesWithFallbacks(detail);
      if (playable.episodes.some(episode => episode.embedUrl || episode.streamUrl)) return playable;
    } catch (error) {
      console.warn(`[Movie] ${id}:`, error instanceof Error ? error.message : "Source unavailable");
    }
  }
  return metadata;
}

export function sameMovie(left: ProviderMovieInput, right: ProviderMovieInput): boolean {
  const a = externalIds(left), b = externalIds(right);
  if (a.mediaType && b.mediaType && a.mediaType !== b.mediaType) return false;
  if (a.season && b.season && a.season !== b.season) return false;
  if (a.tmdbId && b.tmdbId && a.tmdbId !== b.tmdbId) return false;
  if (a.tmdbId && b.tmdbId && a.mediaType && b.mediaType) return a.tmdbId === b.tmdbId;
  if (a.imdbId && b.imdbId) return a.imdbId === b.imdbId;
  if (!left.year || left.year !== right.year || left.type !== right.type || left.type === "unknown") return false;
  const titles = [left.title, left.originalTitle].filter(Boolean).map(title => normalizedMovieName(title!));
  return [right.title, right.originalTitle].some(title => title && titles.includes(normalizedMovieName(title)));
}

export async function getVietnamesePlaybackBackups(storeId: string, reference: string, episodeKey: string, server: string, season: number) {
  const detail = await getMovieDetail(storeId, reference);
  if (!detail) return [];
  const selected = detail.episodes.find(ep => ep.episodeKey === episodeKey && ep.serverName === server && (ep.seasonNumber ?? 1) === season);
  if (!selected) return [];
  const movie = detail.movie;
  const ids = externalIds(movie);
  const matches = await Promise.all(getRemainingVnProviders(movie.provider).map(async provider => {
    try {
      const adapter = providers[provider];
      let backup: ProviderDetail | null = null;
      if (movie.provider !== "vidsrc" && movie.provider !== "vidlink") backup = await adapter.getMovie(movie.providerSlug);
      else {
        const result = await adapter.search(movie.title, 1, 24);
        const candidates = result.items.filter(item => sameMovie(movie, item));
        if (candidates.length === 1) backup = await adapter.getMovie(candidates[0].providerSlug);
      }
      if (!backup || !sameMovie(movie, backup.movie)) return [];
      const targetSeason = ids.season ?? selected.seasonNumber ?? 1;
      const backupSeason = externalIds(backup.movie).season;
      const episodes = backup.episodes.filter(ep => (backupSeason ?? ep.seasonNumber ?? 1) === targetSeason && (selected.episodeNumber != null ? ep.episodeNumber === selected.episodeNumber : ep.episodeKey === selected.episodeKey));
      return episodes.map(ep => ({ ...ep, episodeKey: selected.episodeKey, seasonNumber: selected.seasonNumber }));
    } catch { return []; }
  }));
  return buildEpisodePlaybackSources(movie, selected, matches.flat()).filter(source => source.tier === "backup_vn");
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
