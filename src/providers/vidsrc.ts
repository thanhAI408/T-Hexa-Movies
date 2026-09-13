import { z } from "zod";
import type { ProviderDetail, ProviderEpisodeInput, ProviderListResult, ProviderMovieInput } from "@/types/catalog";
import type { MovieProvider } from "./types";
import { buildVidLinkEmbed, buildVidSrcEmbed } from "@/lib/streaming/fallback";

const TMDB_API_KEY = process.env.TMDB_API_KEY || "e9e9d8da18ae29fc430845952232787c";
export const tmdbItem = z.object({
  id: z.number().int().positive(), media_type: z.enum(["movie", "tv", "person"]).optional(),
  title: z.string().optional(), name: z.string().optional(), original_title: z.string().optional(), original_name: z.string().optional(),
  release_date: z.string().optional(), first_air_date: z.string().optional(), overview: z.string().nullable().optional(),
  poster_path: z.string().nullable().optional(), backdrop_path: z.string().nullable().optional(),
  genre_ids: z.array(z.number()).optional(), genres: z.array(z.object({ id: z.number(), name: z.string() })).optional(),
  origin_country: z.array(z.string()).optional(), production_countries: z.array(z.object({ iso_3166_1: z.string(), name: z.string() })).optional(),
  imdb_id: z.string().nullable().optional(), runtime: z.number().nullable().optional(), number_of_episodes: z.number().optional(),
  seasons: z.array(z.object({ season_number: z.number().int(), episode_count: z.number().int() })).optional(),
}).passthrough();
type TmdbItem = z.infer<typeof tmdbItem>;
const tmdbList = z.object({ results: z.array(tmdbItem), total_results: z.number().int().nonnegative(), total_pages: z.number().int().nonnegative() });
export interface InternationalFilters { kind?: string; genre?: string; country?: string; year?: string; q?: string; sort?: string; page?: number; limit?: number }
export class UnsupportedInternationalQuery extends Error {}
const genres: Record<string, number> = { "hanh-dong": 28, "phieu-luu": 12, "hoat-hinh": 16, "hai-huoc": 35, "hinh-su": 80, "tai-lieu": 99, "chinh-kich": 18, "gia-dinh": 10751, "gia-tuong": 14, "lich-su": 36, "kinh-di": 27, "am-nhac": 10402, "bi-an": 9648, "tinh-cam": 10749, "khoa-hoc-vien-tuong": 878, "giat-gan": 53, "chien-tranh": 10752 };
const countries: Record<string, string> = { "han-quoc": "KR", "trung-quoc": "CN", "au-my": "US", "nhat-ban": "JP", "thai-lan": "TH", "viet-nam": "VN", "anh": "GB", "phap": "FR", "hong-kong": "HK", "dai-loan": "TW", "an-do": "IN" };
export function normalizedMovieName(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }

export async function fetchTmdb(endpoint: string, params: Record<string, string | number> = {}, signal?: AbortSignal) {
  const query = new URLSearchParams({ api_key: TMDB_API_KEY, language: "vi-VN" });
  for (const [key, value] of Object.entries(params)) query.set(key, String(value));
  try {
    const response = await fetch(`https://api.themoviedb.org/3${endpoint}?${query}`, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(6500)]) : AbortSignal.timeout(6500), next: { revalidate: 3600 } });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch {
    // Do not log URLs or fetch errors that may include API credentials.
    throw new Error("International metadata unavailable");
  }
}

export function normalize(item: TmdbItem, provider: "vidsrc" | "vidlink", mediaType: "movie" | "tv"): ProviderMovieInput {
  const ids = item.genre_ids || item.genres?.map(g => g.id) || [];
  const countryCodes = item.origin_country || item.production_countries?.map(c => c.iso_3166_1) || [];
  const date = (mediaType === "tv" ? item.first_air_date : item.release_date) || "";
  return {
    provider, providerSlug: `${mediaType}-${item.id}`, providerMovieId: `${mediaType}-${item.id}`,
    title: item.title || item.name || "Không rõ tiêu đề", originalTitle: item.original_title || item.original_name || null,
    alternativeTitles: [], description: item.overview || null,
    posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
    backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : null,
    year: Number(date.slice(0, 4)) || null, type: ids.includes(16) ? "animation" : mediaType === "tv" ? "series" : "single",
    status: null, durationMinutes: item.runtime || null, quality: null, language: "Phụ đề tùy nguồn",
    genres: ids.map(id => ({ id: String(id), slug: Object.keys(genres).find(key => genres[key] === id) || String(id), name: item.genres?.find(g => g.id === id)?.name || Object.keys(genres).find(key => genres[key] === id) || String(id) })),
    countries: countryCodes.map(code => ({ id: code, slug: Object.keys(countries).find(key => countries[key] === code) || code.toLowerCase(), name: item.production_countries?.find(c => c.iso_3166_1 === code)?.name || code })),
    directors: [], actors: [], totalEpisodes: mediaType === "tv" ? item.number_of_episodes || null : 1, currentEpisode: null,
    externalIds: { tmdbId: String(item.id), imdbId: item.imdb_id || null }, isCinema: false, cinemaEvidence: null, providerUpdatedAt: null,
    raw: { ...item, tmdb: { id: String(item.id), type: mediaType, vote_average: item.vote_average } },
  };
}

export function createInternationalProvider(provider: "vidsrc" | "vidlink"): MovieProvider & { getFilteredList(filters: InternationalFilters): Promise<ProviderListResult> } {
  const name = provider === "vidsrc" ? "Tinh Tú" : "Ngân Hà";
  const builder = provider === "vidsrc" ? buildVidSrcEmbed : buildVidLinkEmbed;
  return {
    id: provider, displayName: `${name} Quốc Tế`, baseUrl: provider === "vidsrc" ? "https://vidsrc.me" : "https://vidlink.pro",
    async getFilteredList(filters) {
      const { kind = "latest", genre = "", country = "", year = "", q = "", sort = "modified", page = 1, limit = 24 } = filters;
      const tv = kind === "series";
      // Do not weaken a Vietnamese format/taxonomy or discard search filters.
      // TMDB's combined TV genres (e.g. Action & Adventure) are not exact equivalents.
      if (q || !["latest", "single", "series"].includes(kind) || (genre && (!genres[genre] || (tv && ![16, 35, 80, 99, 18, 10751, 9648].includes(genres[genre])))) || (country && !countries[country]) || (kind === "latest" && (genre || country || year || sort.startsWith("year")))) throw new UnsupportedInternationalQuery("International source cannot preserve this query");
      const media = tv ? "tv" : "movie";
      const endpoint = kind === "latest" ? "/trending/all/day" : `/${q ? "search" : "discover"}/${media}`;
      const params: Record<string, string | number> = {};
      if (q) params.query = q;
      if (!q && kind !== "latest") params.without_genres = tv ? "16,10764,10767" : "16";
      if (genre) params.with_genres = genres[genre];
      if (country) params.with_origin_country = countries[country];
      if (year) params[tv ? "first_air_date_year" : "primary_release_year"] = year;
      if (!q && kind !== "latest") params.sort_by = sort.startsWith("year") ? `${tv ? "first_air_date" : "primary_release_date"}.${sort === "year_asc" ? "asc" : "desc"}` : "popularity.desc";
      // Re-page TMDB's fixed 20-result pages without dropping or repeating titles.
      const offset = (page - 1) * limit;
      const firstPage = Math.floor(offset / 20) + 1;
      const first = tmdbList.parse(await fetchTmdb(endpoint, { ...params, page: Math.min(firstPage, 500) }));
      const totalItems = Math.min(first.total_results, 10000);
      const pagination = { currentPage: page, totalPages: Math.max(1, Math.ceil(totalItems / limit)), totalItems, itemsPerPage: limit };
      if (offset >= totalItems) return { items: [], pagination };
      const rows = [...first.results];
      const lastPage = Math.min(Math.ceil((offset + limit) / 20), first.total_pages, 500);
      for (let p = firstPage + 1; p <= lastPage; p++) rows.push(...tmdbList.parse(await fetchTmdb(endpoint, { ...params, page: p })).results);
      const items = rows.slice(offset % 20, offset % 20 + limit).filter(item => item.media_type !== "person").map(item => normalize(item, provider, kind === "latest" ? item.media_type === "tv" ? "tv" : "movie" : media));
      return { items, pagination };
    },
    async getLatest(page = 1, limit = 24) { return this.getFilteredList({ page, limit }); },
    async getList(kind, page = 1, limit = 24) { return this.getFilteredList({ kind, page, limit }); },
    async search(query, page = 1, limit = 24) {
      // Remove people before pagination, with a bounded complete search result.
      const first = tmdbList.parse(await fetchTmdb("/search/multi", { query, page: 1 }));
      if (first.total_pages > 20) throw new UnsupportedInternationalQuery("Search is too broad");
      const rows = [...first.results];
      for (let p = 2; p <= first.total_pages; p += 4) {
        const pages = await Promise.all(Array.from({ length: Math.min(4, first.total_pages - p + 1) }, (_, index) => fetchTmdb("/search/multi", { query, page: p + index })));
        for (const data of pages) rows.push(...tmdbList.parse(data).results);
      }
      const movies = rows.filter(item => item.media_type === "movie" || item.media_type === "tv");
      const items = movies.slice((page - 1) * limit, page * limit).map(item => normalize(item, provider, item.media_type === "tv" ? "tv" : "movie"));
      return { items, pagination: { currentPage: page, totalPages: Math.max(1, Math.ceil(movies.length / limit)), totalItems: movies.length, itemsPerPage: limit } };
    },
    async getMovie(reference): Promise<ProviderDetail | null> {
      let match = /^(movie|tv)-([1-9]\d*)$/.exec(reference);
      if (!match) {
        if (/^\d+$/.test(reference)) {
          // Legacy IDs are accepted only if the media type is unambiguous.
          const candidates = await Promise.all([fetchTmdb(`/movie/${reference}`), fetchTmdb(`/tv/${reference}`)]);
          if (candidates.filter(Boolean).length !== 1) return null;
          return this.getMovie(`${candidates[0] ? "movie" : "tv"}-${reference}`);
        }
        const data = tmdbList.parse(await fetchTmdb("/search/multi", { query: reference.replace(/-/g, " "), page: 1 }));
        const wanted = normalizedMovieName(reference);
        const matches = data.results.filter(item => (item.media_type === "movie" || item.media_type === "tv") && [item.title, item.name, item.original_title, item.original_name].some(title => title && normalizedMovieName(title) === wanted));
        // A slug alone cannot disambiguate remakes or translated partial matches.
        if (data.total_pages > 1 || matches.length !== 1) return null;
        match = /^(movie|tv)-([1-9]\d*)$/.exec(`${matches[0].media_type}-${matches[0].id}`);
      }
      if (!match) return null;
      const media = match[1] as "movie" | "tv";
      const id = match[2];
      const raw = await fetchTmdb(`/${media}/${id}`);
      if (!raw) return null;
      const data = tmdbItem.parse(raw);
      const movie = normalize(data, provider, media);
      const episodes: ProviderEpisodeInput[] = [];
      const positions = media === "movie" ? [{ season: 1, episode: 1 }] : (data.seasons || []).filter(season => season.season_number > 0).flatMap(season => Array.from({ length: season.episode_count }, (_, i) => ({ season: season.season_number, episode: i + 1 })));
      for (const { season, episode } of positions) {
        episodes.push({ episodeKey: `${season}:${episode}`, episodeLabel: media === "movie" ? "Full" : `Mùa ${season} - Tập ${episode}`, episodeTitle: null, episodeNumber: episode, seasonNumber: season, provider, serverName: name, streamType: "embed", streamUrl: null, embedUrl: builder({ tmdbId: id, mediaType: media, seasonNumber: season, episodeNumber: episode }), quality: null, language: "Phụ đề tùy nguồn" });
      }
      return { movie, episodes };
    },
    async healthCheck() {
      const start = Date.now();
      try { tmdbList.parse(await fetchTmdb("/trending/movie/day")); return { provider, status: "healthy", latencyMs: Date.now() - start, checkedAt: new Date().toISOString(), error: null }; }
      catch { return { provider, status: "unavailable", latencyMs: Date.now() - start, checkedAt: new Date().toISOString(), error: "Metadata unavailable" }; }
    },
    async getGenres() { return Object.entries(genres).map(([slug, id]) => ({ id: String(id), slug, name: slug })); },
    async getCountries() { return Object.entries(countries).map(([slug, id]) => ({ id, slug, name: slug })); },
    async getYears() { return Array.from({ length: 100 }, (_, index) => new Date().getFullYear() - index); },
    async getCinemaMovies(page = 1, limit = 24) { return this.getList("cinema", page, limit); },
  };
}
export const vidsrcProvider = createInternationalProvider("vidsrc");
