import type {
  ProviderDetail,
  ProviderListResult,
  ProviderMovieInput,
} from "@/types/catalog";
import {
  makeEpisodeSource,
  normalizeImageUrl,
  normalizeMovieType,
  normalizeTaxonomy,
  normalizeTitle,
  parseDuration,
  safeString,
  safeStringArray,
  toNumber,
  toYear,
} from "@/providers/shared/normalize";

import type {
  VsmovDetailResponse,
  VsmovListResponse,
  VsmovMovieDetail,
  VsmovMovieSummary,
} from "./schemas";

const PROVIDER = "vsmov" as const;
const IMAGE_BASE_URL = "https://vsmov.com/";

function scalarToString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function mapMovieType(value: unknown, tmdbType: unknown) {
  const normalized = normalizeMovieType(value);
  if (normalized !== "unknown") return normalized;

  switch (normalizeTitle(tmdbType)) {
    case "movie":
      return "single" as const;
    case "tv":
      return "series" as const;
    default:
      return "unknown" as const;
  }
}

function parseEpisodeTotal(value: unknown): number | null {
  const direct = toNumber(value);
  if (direct !== null) return direct;
  const text = safeString(value);
  const fraction = text?.match(/(\d+)\s*\/\s*(\d+)/);
  return fraction ? Number(fraction[2]) : null;
}

function normalizePagination(response: VsmovListResponse) {
  const currentPage = Math.max(1, toNumber(response.pagination.currentPage) ?? 1);
  const totalPages = Math.max(1, toNumber(response.pagination.totalPages) ?? 1);
  const totalItems = Math.max(0, toNumber(response.pagination.totalItems) ?? response.items.length);
  const itemsPerPage = Math.max(
    1,
    toNumber(response.pagination.totalItemsPerPage) ?? (response.items.length || 1),
  );

  return { currentPage, totalPages, totalItems, itemsPerPage };
}

function summaryToMovie(item: VsmovMovieSummary): ProviderMovieInput {
  const title = safeString(item.name) ?? item.slug;
  const originalTitle = safeString(item.origin_name);
  return {
    provider: PROVIDER,
    providerMovieId: scalarToString(item._id) ?? item.slug,
    providerSlug: item.slug,
    title,
    originalTitle,
    alternativeTitles: [],
    description: null,
    posterUrl: normalizeImageUrl(item.poster_url, IMAGE_BASE_URL),
    backdropUrl: normalizeImageUrl(item.thumb_url, IMAGE_BASE_URL),
    year: toYear(item.year),
    type: mapMovieType(undefined, item.tmdb?.type),
    status: null,
    durationMinutes: null,
    quality: null,
    language: null,
    genres: [],
    countries: [],
    directors: [],
    actors: [],
    totalEpisodes: null,
    currentEpisode: null,
    externalIds: {
      tmdbId: scalarToString(item.tmdb?.id),
      imdbId: scalarToString(item.imdb?.id),
    },
    // List responses do not include chieurap. Never infer cinema from a list
    // slug, status, title, or showtime text.
    isCinema: false,
    cinemaEvidence: null,
    providerUpdatedAt: safeString(item.modified?.time),
    raw: { ...item },
  };
}

function detailToMovie(movie: VsmovMovieDetail): ProviderMovieInput {
  const isCinema = movie.chieurap === true;
  return {
    provider: PROVIDER,
    providerMovieId: scalarToString(movie._id) ?? movie.slug,
    providerSlug: movie.slug,
    title: safeString(movie.name) ?? movie.slug,
    originalTitle: safeString(movie.origin_name),
    alternativeTitles: [],
    description: safeString(movie.content),
    posterUrl: normalizeImageUrl(movie.poster_url, IMAGE_BASE_URL),
    backdropUrl: normalizeImageUrl(movie.thumb_url, IMAGE_BASE_URL),
    year: toYear(movie.year),
    type: mapMovieType(movie.type, movie.tmdb?.type),
    status: safeString(movie.status),
    durationMinutes: parseDuration(movie.time),
    quality: safeString(movie.quality),
    language: safeString(movie.lang),
    genres: normalizeTaxonomy(movie.category ?? [], "vsmov-genre"),
    countries: normalizeTaxonomy(movie.country ?? [], "vsmov-country"),
    directors: safeStringArray(movie.director),
    actors: safeStringArray(movie.actor),
    totalEpisodes: parseEpisodeTotal(movie.episode_total),
    currentEpisode: safeString(movie.episode_current),
    externalIds: {
      tmdbId: scalarToString(movie.tmdb?.id),
      imdbId: scalarToString(movie.imdb?.id),
    },
    isCinema,
    cinemaEvidence: isCinema ? "vsmov:movie.chieurap=true" : null,
    providerUpdatedAt: safeString(movie.modified?.time),
    raw: { ...movie },
  };
}

export function normalizeVsmovList(response: VsmovListResponse): ProviderListResult {
  if (!response.status) throw new Error("VSMOV returned an unsuccessful list response");
  return {
    items: response.items.map(summaryToMovie),
    pagination: normalizePagination(response),
  };
}

export function normalizeVsmovDetail(response: VsmovDetailResponse): ProviderDetail {
  if (!response.status) throw new Error("VSMOV returned an unsuccessful detail response");

  const movie = detailToMovie(response.movie);
  const episodes = (response.episodes ?? []).flatMap((server) =>
    server.server_data.flatMap((episode, index) => {
      const source = makeEpisodeSource({
        provider: PROVIDER,
        serverName: server.server_name,
        label: episode.name,
        slug: episode.slug,
        index,
        // The public JSON contract currently exposes player pages, not direct
        // media manifests. Do not scrape the player HTML to manufacture HLS.
        embedUrl: episode.link_embed,
        quality: response.movie.quality,
        language: response.movie.lang,
      });
      return source ? [source] : [];
    }),
  );

  return { movie, episodes };
}
