import type {
  MovieType,
  ProviderDetail,
  ProviderHealthResult,
  ProviderListResult,
  ProviderMovieInput,
  TaxonomyItem,
} from "@/types/catalog";
import type { MovieProvider, ProviderListKind } from "@/providers/types";
import { buildVidSrcEmbed, buildVidLinkEmbed } from "@/lib/streaming/fallback";

const TMDB_API_KEY = process.env.TMDB_API_KEY || "e9e9d8da18ae29fc430845952232787c";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/original";

async function fetchTmdb(endpoint: string, params: Record<string, string | number> = {}) {
  const query = new URLSearchParams({
    api_key: TMDB_API_KEY,
    language: "vi-VN",
    ...Object.entries(params).reduce((acc, [k, v]) => {
      if (v !== undefined && v !== null && v !== "") acc[k] = String(v);
      return acc;
    }, {} as Record<string, string>),
  });

  try {
    const res = await fetch(`${TMDB_BASE_URL}${endpoint}?${query.toString()}`, {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(`[VidSrc Provider] TMDB Fetch error ${endpoint}:`, err);
    return null;
  }
}

function normalizeTmdbMovie(item: any, defaultType?: MovieType, isCinema = false): ProviderMovieInput {
  const isTv = item.media_type === "tv" || !item.title || item.first_air_date;
  const type: MovieType = defaultType || (isTv ? "series" : "single");
  const yearStr = item.release_date || item.first_air_date || "";
  const year = yearStr ? parseInt(yearStr.slice(0, 4), 10) : null;
  const idStr = String(item.id);

  return {
    provider: "vidsrc",
    providerSlug: idStr,
    providerMovieId: idStr,
    title: item.title || item.name || "Không rõ tiêu đề",
    originalTitle: item.original_title || item.original_name || null,
    alternativeTitles: [],
    description: item.overview || null,
    posterUrl: item.poster_path ? `${IMG_BASE}${item.poster_path}` : null,
    backdropUrl: item.backdrop_path ? `${BACKDROP_BASE}${item.backdrop_path}` : null,
    year: typeof year === "number" && !isNaN(year) ? year : null,
    type,
    status: "Hoàn tất",
    durationMinutes: item.runtime || null,
    quality: "FHD 1080p",
    language: "Phụ đề đa ngôn ngữ",
    genres: (item.genres || []).map((g: any) => ({ id: String(g.id), name: g.name, slug: String(g.id) })),
    countries: (item.production_countries || []).map((c: any) => ({ id: c.iso_3166_1, name: c.name, slug: c.iso_3166_1.toLowerCase() })),
    directors: [],
    actors: [],
    totalEpisodes: isTv ? (item.number_of_episodes || null) : 1,
    currentEpisode: isTv ? `Tập ${item.number_of_episodes || 1}` : "Full HD",
    externalIds: {
      tmdbId: idStr,
      imdbId: item.imdb_id || null,
    },
    isCinema,
    cinemaEvidence: isCinema ? "TMDB Now Playing" : null,
    providerUpdatedAt: new Date().toISOString(),
    raw: item,
  };
}

export const vidsrcProvider: MovieProvider = {
  id: "vidsrc",
  displayName: "VidSrc Quốc Tế",
  baseUrl: "https://vidsrc.to",

  async healthCheck(): Promise<ProviderHealthResult> {
    const data = await fetchTmdb("/trending/movie/day");
    return {
      provider: "vidsrc",
      status: data && data.results ? "healthy" : "degraded",
      latencyMs: 120,
      checkedAt: new Date().toISOString(),
      error: null,
    };
  },

  async getLatest(page = 1, limit = 24): Promise<ProviderListResult> {
    const data = await fetchTmdb("/trending/all/day", { page });
    const results = data?.results || [];
    const items = results.map((m: any) => normalizeTmdbMovie(m)).slice(0, limit);
    const totalItems = data?.total_results || 10000;
    const totalPages = Math.min(500, data?.total_pages || 500);

    return {
      items,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
      },
    };
  },

  async getList(kind: ProviderListKind, page = 1, limit = 24): Promise<ProviderListResult> {
    let endpoint = "/discover/movie";
    const params: Record<string, any> = {
      page,
      sort_by: "popularity.desc",
    };
    let typeHint: MovieType = "single";
    let isCinema = false;

    switch (kind) {
      case "series":
      case "tvshow":
        endpoint = "/discover/tv";
        typeHint = "series";
        break;
      case "animation":
        endpoint = "/discover/movie";
        params.with_genres = "16";
        typeHint = "animation";
        break;
      case "cinema":
        endpoint = "/movie/now_playing";
        typeHint = "single";
        isCinema = true;
        break;
      case "single":
      case "latest":
      default:
        endpoint = "/discover/movie";
        typeHint = "single";
        break;
    }

    const data = await fetchTmdb(endpoint, params);
    const results = data?.results || [];
    const items = results.map((m: any) => normalizeTmdbMovie(m, typeHint, isCinema)).slice(0, limit);
    const totalItems = data?.total_results || 10000;
    const totalPages = Math.min(500, data?.total_pages || 500);

    return {
      items,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
      },
    };
  },

  async search(query: string, page = 1, limit = 24): Promise<ProviderListResult> {
    if (!query) return { items: [], pagination: { currentPage: page, totalPages: 1, totalItems: 0, itemsPerPage: limit } };
    const data = await fetchTmdb("/search/multi", { query, page });
    const results = data?.results || [];
    const items = results
      .filter((m: any) => m.media_type === "movie" || m.media_type === "tv")
      .map((m: any) => normalizeTmdbMovie(m))
      .slice(0, limit);

    const totalItems = data?.total_results || items.length;
    const totalPages = Math.min(500, data?.total_pages || 1);

    return {
      items,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
      },
    };
  },

  async getMovie(slug: string): Promise<ProviderDetail | null> {
    const id = slug.replace(/\D/g, "");
    if (!id) {
      // Try search if slug is text
      const searchRes = await this.search(slug.replace(/-/g, " "), 1, 1);
      if (!searchRes.items.length) return null;
      return this.getMovie(searchRes.items[0].providerSlug);
    }

    // Try movie first, then tv
    let data = await fetchTmdb(`/movie/${id}`);
    let isTv = false;
    if (!data || data.status_code) {
      data = await fetchTmdb(`/tv/${id}`);
      isTv = true;
    }
    if (!data || data.status_code) return null;

    const movie = normalizeTmdbMovie(data, isTv ? "series" : "single");
    const episodes: any[] = [];

    const seasonsCount = isTv ? (data.number_of_seasons || 1) : 1;
    const epsPerSeason = isTv ? 12 : 1;

    for (let s = 1; s <= Math.min(seasonsCount, 5); s++) {
      for (let ep = 1; ep <= (isTv ? epsPerSeason : 1); ep++) {
        const epKey = isTv ? `tap-${ep}-s${s}` : "tap-01";
        const label = isTv ? `Mùa ${s} - Tập ${ep}` : "Full HD";

        const vidsrcEmbed = buildVidSrcEmbed({
          tmdbId: id,
          type: isTv ? "series" : "single",
          seasonNumber: s,
          episodeNumber: ep,
        });

        const vidlinkEmbed = buildVidLinkEmbed({
          tmdbId: id,
          type: isTv ? "series" : "single",
          seasonNumber: s,
          episodeNumber: ep,
        });

        if (vidsrcEmbed) {
          episodes.push({
            episodeKey: epKey,
            episodeLabel: label,
            episodeTitle: `Tập ${ep}`,
            episodeNumber: ep,
            seasonNumber: s,
            provider: "vidsrc",
            serverName: "VidSrc (Fallback 1)",
            streamType: "embed",
            streamUrl: null,
            embedUrl: vidsrcEmbed,
            quality: "1080p Ultra",
            language: "Phụ đề đa ngôn ngữ",
          });
        }

        if (vidlinkEmbed) {
          episodes.push({
            episodeKey: epKey,
            episodeLabel: label,
            episodeTitle: `Tập ${ep}`,
            episodeNumber: ep,
            seasonNumber: s,
            provider: "vidlink",
            serverName: "VidLink (Fallback 2)",
            streamType: "embed",
            streamUrl: null,
            embedUrl: vidlinkEmbed,
            quality: "1080p Fast",
            language: "Phụ đề đa ngôn ngữ",
          });
        }
      }
    }

    return {
      movie,
      episodes,
    };
  },

  async getGenres(): Promise<TaxonomyItem[]> {
    const data = await fetchTmdb("/genre/movie/list");
    return (data?.genres || []).map((g: any) => ({
      id: String(g.id),
      slug: String(g.id),
      name: g.name,
      count: 0,
    }));
  },

  async getCountries(): Promise<TaxonomyItem[]> {
    const data = await fetchTmdb("/configuration/countries");
    return (data || []).slice(0, 30).map((c: any) => ({
      id: c.iso_3166_1,
      slug: c.iso_3166_1.toLowerCase(),
      name: c.native_name || c.english_name,
      count: 0,
    }));
  },

  async getYears(): Promise<number[]> {
    const current = new Date().getFullYear();
    return Array.from({ length: 30 }, (_, i) => current - i);
  },

  async getCinemaMovies(page = 1, limit = 24): Promise<ProviderListResult> {
    return this.getList("cinema", page, limit);
  },
};
