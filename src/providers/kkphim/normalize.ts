import type {
  MovieType,
  ProviderDetail,
  ProviderListResult,
  ProviderMovieInput,
} from "@/types/catalog";
import {
  cleanText,
  makeEpisodeSource,
  normalizeImageUrl,
  normalizeMovieType,
  normalizeTaxonomy,
  parseDuration,
  safeStringArray,
  toNumber,
  toYear,
} from "@/providers/shared/normalize";

import type {
  KkphimDetailResponse,
  KkphimListResponse,
  KkphimMovie,
} from "./schemas";

export const KKPHIM_DEFAULT_IMAGE_CDN = "https://phimimg.com";

function positiveInteger(value: unknown, fallback: number) {
  const number = toNumber(value);
  return number && number > 0 ? Math.floor(number) : fallback;
}

function scalarString(value: unknown) {
  if (typeof value === "string" && value.trim() && value.trim() !== "0") {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value) && value !== 0) {
    return String(value);
  }
  return null;
}

function kkphimMovieType(value: unknown): MovieType {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "hoathinh") return "animation";
  if (normalized === "tvshows") return "tvshow";
  return normalizeMovieType(value);
}

function imageOptions(cdnBase: string) {
  return {
    cdnBase,
    bareFileUsesMoviePath: !/\/uploads\/movies\/?$/i.test(cdnBase),
  };
}

export interface KkphimMovieContext {
  cdnBase?: string | null;
  typeHint?: MovieType;
  officialCinemaList?: boolean;
}

export function normalizeKkphimMovie(
  movie: KkphimMovie,
  context: KkphimMovieContext = {},
): ProviderMovieInput {
  const slug = cleanText(movie.slug) ?? movie.slug;
  const cdnBase = context.cdnBase ?? KKPHIM_DEFAULT_IMAGE_CDN;
  const options = imageOptions(cdnBase);
  const posterUrl = normalizeImageUrl(
    movie.poster_url,
    options.cdnBase,
    options.bareFileUsesMoviePath,
  );
  const backdropUrl = normalizeImageUrl(
    movie.thumb_url,
    options.cdnBase,
    options.bareFileUsesMoviePath,
  );
  const sourceType = kkphimMovieType(movie.type);
  const isCinema = movie.chieurap === true || context.officialCinemaList === true;

  return {
    provider: "kkphim",
    providerMovieId: scalarString(movie._id) ?? slug,
    providerSlug: slug,
    title: cleanText(movie.name) ?? slug,
    originalTitle: cleanText(movie.origin_name),
    alternativeTitles: safeStringArray(movie.alternative_names),
    description: cleanText(movie.content),
    posterUrl: posterUrl ?? backdropUrl,
    backdropUrl: backdropUrl ?? posterUrl,
    year: toYear(movie.year),
    type:
      sourceType !== "unknown"
        ? sourceType
        : context.typeHint ?? "unknown",
    status: cleanText(movie.status),
    durationMinutes: parseDuration(movie.time),
    quality: cleanText(movie.quality),
    language: cleanText(movie.lang),
    genres: normalizeTaxonomy(movie.category, "kkphim-genre"),
    countries: normalizeTaxonomy(movie.country, "kkphim-country"),
    directors: safeStringArray(movie.director),
    actors: safeStringArray(movie.actor),
    totalEpisodes: toNumber(movie.episode_total),
    currentEpisode: cleanText(movie.episode_current),
    externalIds: {
      tmdbId: scalarString(movie.tmdb?.id),
      imdbId: scalarString(movie.imdb?.id),
    },
    isCinema,
    cinemaEvidence: isCinema
      ? movie.chieurap === true
        ? "kkphim:movie.chieurap"
        : "kkphim:list:phim-chieu-rap"
      : null,
    providerUpdatedAt: cleanText(movie.modified?.time),
    raw: movie as Record<string, unknown>,
  };
}

export interface KkphimListContext extends KkphimMovieContext {
  requestedLimit?: number;
}

export function normalizeKkphimList(
  response: KkphimListResponse,
  requestedPage: number,
  context: KkphimListContext = {},
): ProviderListResult {
  const rawItems = response.items ?? response.data?.items ?? [];
  const rawPagination = response.pagination ?? response.data?.params?.pagination;
  const cdnBase =
    cleanText(response.data?.APP_DOMAIN_CDN_IMAGE) ??
    cleanText(response.pathImage) ??
    context.cdnBase ??
    KKPHIM_DEFAULT_IMAGE_CDN;
  const upstreamCurrentPage = positiveInteger(
    rawPagination?.currentPage,
    requestedPage,
  );
  const itemsPerPage = positiveInteger(
    rawPagination?.totalItemsPerPage,
    context.requestedLimit ?? (rawItems.length || 24),
  );
  const totalItems = Math.max(0, toNumber(rawPagination?.totalItems) ?? rawItems.length);
  const computedTotalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  let totalPages = positiveInteger(rawPagination?.totalPages, computedTotalPages);

  // PhimAPI currently responds to pages beyond its range with page-one data.
  // Returning those items would cause duplicate rows and endless sync loops.
  const repeatedFirstPage = requestedPage > 1 && upstreamCurrentPage !== requestedPage;
  const beyondLastPage = requestedPage > totalPages;
  if (repeatedFirstPage) {
    totalPages = Math.min(totalPages, Math.max(1, requestedPage - 1));
  }

  return {
    items:
      repeatedFirstPage || beyondLastPage
        ? []
        : rawItems.map((movie) =>
            normalizeKkphimMovie(movie, { ...context, cdnBase }),
          ),
    pagination: {
      currentPage: repeatedFirstPage ? requestedPage : upstreamCurrentPage,
      totalPages,
      totalItems,
      itemsPerPage,
    },
  };
}

export function normalizeKkphimDetail(
  response: KkphimDetailResponse,
): ProviderDetail {
  const movie = response.movie ?? response.data?.item;
  if (!movie) {
    // The Zod schema already prevents this; the guard keeps this function safe
    // if it is called independently in application code.
    throw new Error("KKPhim detail response is missing its movie item");
  }
  const cdnBase =
    cleanText(response.data?.APP_DOMAIN_CDN_IMAGE) ?? KKPHIM_DEFAULT_IMAGE_CDN;
  const servers = response.episodes ?? movie.episodes ?? [];
  const episodes = servers.flatMap((server) => {
    const serverName = `${server.server_name}${server.is_ai ? " (AI)" : ""}`;
    return server.server_data.flatMap((item, index) => {
      const source = makeEpisodeSource({
        provider: "kkphim",
        serverName,
        label: typeof item.name === "number" ? String(item.name) : item.name,
        slug: item.slug,
        index,
        streamUrl: item.link_m3u8,
        embedUrl: item.link_embed,
        quality: movie.quality,
        language: server.server_name || movie.lang,
      });
      return source ? [source] : [];
    });
  });

  const seen = new Set<string>();
  const uniqueEpisodes = episodes.filter((episode) => {
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

  return {
    movie: normalizeKkphimMovie(movie, { cdnBase }),
    episodes: uniqueEpisodes,
  };
}
