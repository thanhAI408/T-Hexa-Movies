import type {
  MovieType,
  ProviderDetail,
  ProviderListResult,
  ProviderMovieInput,
  TaxonomyItem,
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
  NguoncDetailResponse,
  NguoncListResponse,
  NguoncMovie,
} from "./schemas";

function positiveInteger(value: unknown, fallback: number) {
  const number = toNumber(value);
  return number && number > 0 ? Math.floor(number) : fallback;
}

function categoryGroups(movie: NguoncMovie) {
  return Object.values(movie.category ?? {});
}

function categoryList(movie: NguoncMovie, groupName: string) {
  const expected = normalizeTitle(groupName);
  return (
    categoryGroups(movie).find(
      (entry) => normalizeTitle(entry.group.name) === expected,
    )?.list ?? []
  );
}

function movieType(movie: NguoncMovie, hint?: MovieType): MovieType {
  if (hint && hint !== "unknown") return hint;

  for (const entry of categoryList(movie, "Định dạng")) {
    const normalized = normalizeMovieType(entry.name);
    if (normalized !== "unknown") return normalized;
  }

  if (
    categoryList(movie, "Thể loại").some(
      (entry) => normalizeTitle(entry.name) === "hoat hinh",
    )
  ) {
    return "animation";
  }

  return "unknown";
}

function movieStatus(movie: NguoncMovie) {
  const formatLabels = categoryList(movie, "Định dạng").map((entry) =>
    normalizeTitle(entry.name),
  );
  if (formatLabels.some((label) => label === "dang chieu")) return "ongoing";
  if (
    formatLabels.some(
      (label) => label === "hoan thanh" || label === "hoan tat",
    )
  ) {
    return "completed";
  }
  const current = normalizeTitle(movie.current_episode);
  return /\b(full|tron bo|hoan tat)\b/.test(current) ? "completed" : null;
}

function taxonomyFor(movie: NguoncMovie, groupName: string): TaxonomyItem[] {
  return normalizeTaxonomy(
    categoryList(movie, groupName),
    `nguonc-${normalizeTitle(groupName).replace(/\s+/g, "-")}`,
  );
}

export function normalizeNguoncMovie(
  movie: NguoncMovie,
  typeHint?: MovieType,
): ProviderMovieInput {
  const slug = cleanText(movie.slug) ?? movie.slug;
  const posterUrl = normalizeImageUrl(movie.poster_url);
  const backdropUrl = normalizeImageUrl(movie.thumb_url);

  return {
    provider: "nguonc",
    // NguonC ids differ across list/search/detail responses. Its own docs call
    // slug the stable detail key, so slug is the provider identity here.
    providerMovieId: slug,
    providerSlug: slug,
    title: cleanText(movie.name) ?? slug,
    originalTitle: cleanText(movie.original_name),
    alternativeTitles: [],
    description: cleanText(movie.description),
    posterUrl: posterUrl ?? backdropUrl,
    backdropUrl: backdropUrl ?? posterUrl,
    year: toYear(movie.year),
    type: movieType(movie, typeHint),
    status: movieStatus(movie),
    durationMinutes: parseDuration(movie.time),
    quality: cleanText(movie.quality),
    language: cleanText(movie.language),
    genres: taxonomyFor(movie, "Thể loại"),
    countries: taxonomyFor(movie, "Quốc gia"),
    directors: safeStringArray(movie.director),
    actors: safeStringArray(movie.casts),
    totalEpisodes: toNumber(movie.total_episodes),
    currentEpisode: cleanText(movie.current_episode),
    externalIds: { tmdbId: null, imdbId: null },
    isCinema: false,
    cinemaEvidence: null,
    providerUpdatedAt: cleanText(movie.modified),
    raw: movie as Record<string, unknown>,
  };
}

export function normalizeNguoncList(
  response: NguoncListResponse,
  requestedPage: number,
  typeHint?: MovieType,
): ProviderListResult {
  const currentPage = positiveInteger(response.paginate.current_page, requestedPage);
  const totalPages = positiveInteger(response.paginate.total_page, currentPage);
  const itemsPerPage = positiveInteger(
    response.paginate.items_per_page,
    response.items.length || 10,
  );

  return {
    items: response.items.map((movie) => normalizeNguoncMovie(movie, typeHint)),
    pagination: {
      currentPage,
      totalPages: Math.max(currentPage, totalPages),
      totalItems: Math.max(0, toNumber(response.paginate.total_items) ?? 0),
      itemsPerPage,
    },
  };
}

export function normalizeNguoncDetail(
  response: NguoncDetailResponse,
): ProviderDetail {
  const movie = response.movie;
  const episodes = movie.episodes.flatMap((server) =>
    server.items.flatMap((item, index) => {
      const source = makeEpisodeSource({
        provider: "nguonc",
        serverName: server.server_name,
        label: typeof item.name === "number" ? String(item.name) : item.name,
        slug: item.slug,
        index,
        embedUrl: item.embed,
        quality: movie.quality,
        language: server.server_name || movie.language,
      });
      return source ? [source] : [];
    }),
  );

  return {
    movie: normalizeNguoncMovie(movie),
    episodes,
  };
}
