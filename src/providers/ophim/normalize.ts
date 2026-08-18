import type {
  MovieType,
  ProviderDetail,
  ProviderEpisodeInput,
  ProviderListResult,
  ProviderMovieInput,
} from "@/types/catalog";
import {
  cleanText,
  makeEpisodeSource,
  normalizeImageUrl,
  normalizeMovieType,
  normalizeTaxonomy,
  normalizeTitle,
  parseDuration,
  safeStringArray,
  toNumber,
  toYear,
} from "@/providers/shared/normalize";

import type {
  OPhimDetailResponse,
  OPhimEpisodeServer,
  OPhimLegacyDetailResponse,
  OPhimLegacyListResponse,
  OPhimListResponse,
  OPhimMovie,
  OPhimV1DetailResponse,
  OPhimV1ListResponse,
} from "./schema";

export const OPHIM_DEFAULT_IMAGE_BASE_URL = "https://img.ophimimg.com";

interface MovieNormalizationOptions {
  cdnBaseUrl?: string | null;
  cinemaFromEndpoint?: boolean;
}

interface ListNormalizationOptions extends MovieNormalizationOptions {
  requestedPage: number;
  requestedLimit: number;
}

function normalizeExternalId(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const id = String(value).trim();
  return id && id !== "0" ? id : null;
}

function normalizeUpdatedAt(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function normalizeBoolean(value: unknown) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function normalizeOPhimMovieType(value: unknown): MovieType {
  const normalized = normalizeTitle(value);
  if (normalized === "hoathinh") return "animation";
  if (normalized === "tvshows") return "tvshow";
  return normalizeMovieType(value);
}

function normalizeOPhimImageUrl(value: unknown, cdnBaseUrl: string | null) {
  const baseAlreadyIncludesMoviePath = /\/uploads\/movies\/?$/i.test(cdnBaseUrl ?? "");
  return normalizeImageUrl(value, cdnBaseUrl, !baseAlreadyIncludesMoviePath);
}

function positiveInteger(value: unknown, fallback: number) {
  const parsed = toNumber(value);
  return parsed !== null && parsed > 0 ? Math.trunc(parsed) : fallback;
}

function nonNegativeInteger(value: unknown, fallback: number) {
  const parsed = toNumber(value);
  return parsed !== null && parsed >= 0 ? Math.trunc(parsed) : fallback;
}

export function normalizeOPhimMovie(
  movie: OPhimMovie,
  {
    cdnBaseUrl = OPHIM_DEFAULT_IMAGE_BASE_URL,
    cinemaFromEndpoint = false,
  }: MovieNormalizationOptions = {},
): ProviderMovieInput | null {
  const title = cleanText(movie.name) ?? cleanText(movie.origin_name);
  const providerSlug = cleanText(movie.slug);
  if (!title || !providerSlug) return null;

  const providerMovieId = normalizeExternalId(movie._id) ?? providerSlug;
  const flaggedCinema = normalizeBoolean(movie.chieurap);
  const isCinema = cinemaFromEndpoint || flaggedCinema;

  return {
    provider: "ophim",
    providerMovieId,
    providerSlug,
    title,
    originalTitle: cleanText(movie.origin_name),
    alternativeTitles: safeStringArray(movie.alternative_names),
    description: cleanText(movie.content),
    posterUrl: normalizeOPhimImageUrl(movie.poster_url, cdnBaseUrl),
    backdropUrl: normalizeOPhimImageUrl(movie.thumb_url, cdnBaseUrl),
    year: toYear(movie.year),
    type: normalizeOPhimMovieType(movie.type),
    status: cleanText(movie.status),
    durationMinutes: parseDuration(movie.time),
    quality: cleanText(movie.quality),
    language: cleanText(movie.lang),
    genres: normalizeTaxonomy(movie.category, "ophim-genre"),
    countries: normalizeTaxonomy(movie.country, "ophim-country"),
    directors: safeStringArray(movie.director),
    actors: safeStringArray(movie.actor),
    totalEpisodes: toNumber(movie.episode_total),
    currentEpisode: cleanText(movie.episode_current),
    externalIds: {
      tmdbId: normalizeExternalId(movie.tmdb?.id),
      imdbId: normalizeExternalId(movie.imdb?.id),
    },
    isCinema,
    cinemaEvidence: cinemaFromEndpoint
      ? "ophim:list:phim-chieu-rap"
      : flaggedCinema
        ? "ophim:chieurap=true"
        : null,
    providerUpdatedAt: normalizeUpdatedAt(movie.modified?.time),
    raw: movie as Record<string, unknown>,
  };
}

function isV1ListResponse(
  response: OPhimListResponse,
): response is OPhimV1ListResponse {
  const data = (response as { data?: unknown }).data;
  return typeof data === "object" && data !== null && "items" in data;
}

function isV1DetailResponse(
  response: OPhimDetailResponse,
): response is OPhimV1DetailResponse {
  const data = (response as { data?: unknown }).data;
  return typeof data === "object" && data !== null && "item" in data;
}

function unpackListResponse(response: OPhimListResponse) {
  if (isV1ListResponse(response)) {
    return {
      items: response.data.items,
      pagination: response.data.params.pagination,
      cdnBaseUrl: response.data.APP_DOMAIN_CDN_IMAGE,
    };
  }

  const legacyResponse: OPhimLegacyListResponse = response;
  return {
    items: legacyResponse.items,
    pagination: legacyResponse.pagination,
    cdnBaseUrl: legacyResponse.pathImage,
  };
}

export function normalizeOPhimListResponse(
  response: OPhimListResponse,
  {
    requestedPage,
    requestedLimit,
    cdnBaseUrl,
    cinemaFromEndpoint = false,
  }: ListNormalizationOptions,
): ProviderListResult {
  const unpacked = unpackListResponse(response);
  const imageBase = unpacked.cdnBaseUrl ?? cdnBaseUrl ?? OPHIM_DEFAULT_IMAGE_BASE_URL;
  const items = unpacked.items.flatMap((item) => {
    const movie = normalizeOPhimMovie(item, {
      cdnBaseUrl: imageBase,
      cinemaFromEndpoint,
    });
    return movie ? [movie] : [];
  });

  const totalItems = nonNegativeInteger(unpacked.pagination.totalItems, items.length);
  const itemsPerPage = positiveInteger(
    unpacked.pagination.totalItemsPerPage,
    requestedLimit,
  );
  const currentPage = positiveInteger(unpacked.pagination.currentPage, requestedPage);
  const totalPages = nonNegativeInteger(
    unpacked.pagination.totalPages,
    totalItems === 0 ? 0 : Math.ceil(totalItems / itemsPerPage),
  );

  return {
    items,
    pagination: { currentPage, totalPages, totalItems, itemsPerPage },
  };
}

export function normalizeOPhimEpisodes(
  servers: OPhimEpisodeServer[] | null | undefined,
  movie: OPhimMovie,
): ProviderEpisodeInput[] {
  if (!servers?.length) return [];

  const episodes = servers.flatMap((server) =>
    (server.server_data ?? []).flatMap((episode, index) => {
      const source = makeEpisodeSource({
        provider: "ophim",
        serverName: server.server_name,
        label: episode.name,
        slug: episode.slug,
        index,
        streamUrl: episode.link_m3u8,
        embedUrl: episode.link_embed,
        quality: movie.quality,
        language: movie.lang,
      });
      return source ? [source] : [];
    }),
  );

  const seen = new Set<string>();
  return episodes.filter((episode) => {
    const key = [
      episode.episodeKey,
      episode.serverName,
      episode.streamUrl ?? "",
      episode.embedUrl ?? "",
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeOPhimDetailResponse(
  response: OPhimDetailResponse,
  fallbackCdnBaseUrl = OPHIM_DEFAULT_IMAGE_BASE_URL,
): ProviderDetail | null {
  const isV1 = isV1DetailResponse(response);
  const item = isV1 ? response.data.item : response.movie;
  const servers = isV1 ? item.episodes : response.episodes;
  const cdnBaseUrl = isV1
    ? response.data.APP_DOMAIN_CDN_IMAGE ?? fallbackCdnBaseUrl
    : (response as OPhimLegacyDetailResponse).pathImage ?? fallbackCdnBaseUrl;
  const movie = normalizeOPhimMovie(item, { cdnBaseUrl });
  if (!movie) return null;

  return {
    movie,
    episodes: normalizeOPhimEpisodes(servers, item),
  };
}
