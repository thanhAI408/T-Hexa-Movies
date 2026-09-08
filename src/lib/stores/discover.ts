import { z } from "zod";
import { STORE_API_MAP } from "./config";
import { movieReference } from "./movie-reference";
import { requestJson } from "@/providers/shared/http";
import { kkphimProvider, kkphimListResponseSchema, normalizeKkphimList } from "@/providers/kkphim";
import { ophimProvider } from "@/providers/ophim";
import { ophimListResponseSchema } from "@/providers/ophim/schema";
import { normalizeOPhimListResponse } from "@/providers/ophim/normalize";
import { vsmovProvider, vsmovListResponseSchema, normalizeVsmovList } from "@/providers/vsmov";
import { nguoncProvider, nguoncListResponseSchema, normalizeNguoncList } from "@/providers/nguonc";
import type { ProviderListResult, ProviderId } from "@/types/catalog";
import { vidsrcProvider, UnsupportedInternationalQuery } from "@/providers/vidsrc";
import { vidlinkProvider } from "@/providers/vidlink";
import { getProviderFallbackOrder } from "@/lib/streaming/fallback";

const positive = (fallback: number, max: number) => z.preprocess(
  value => value === null || value === undefined || value === "" ? fallback : value,
  z.coerce.number().int().min(1).max(max),
);
export const discoverQuerySchema = z.object({
  kind: z.enum(["latest", "single", "series", "animation", "tvshow", "cinema"]).default("latest"),
  genre: z.string().regex(/^[\p{L}\p{N}-]*$/u).default(""),
  country: z.string().regex(/^[\p{L}\p{N}-]*$/u).default(""),
  year: z.string().regex(/^(|\d{4})$/).default(""),
  q: z.string().trim().max(150).default(""),
  sort: z.enum(["modified", "updated", "year", "year_desc", "year_asc", "title", "view"]).default("modified"),
  page: positive(1, 10000),
  limit: positive(24, 48),
});
export type DiscoverQuery = z.infer<typeof discoverQuerySchema>;

const kinds = { latest: "phim-moi-cap-nhat", single: "phim-le", series: "phim-bo", animation: "hoat-hinh", tvshow: "tv-shows", cinema: "phim-chieu-rap" };
export function resolveStoreProvider(storeId: string): ProviderId | null {
  const legacy: Record<string, string> = { xuan: "vsmov", ha: "ophim", thu: "nguonc", dong: "kkphim" };
  const id = STORE_API_MAP[storeId] || legacy[storeId] || storeId;
  return ["vsmov", "ophim", "nguonc", "kkphim"].includes(id) ? id as ProviderId : null;
}

export function buildCatalogUrl(base: string, query: DiscoverQuery) {
  const path = query.q ? "tim-kiem" : `danh-sach/${kinds[query.kind]}`;
  const url = new URL(`/v1/api/${path}`, base);
  url.searchParams.set("page", String(query.page));
  url.searchParams.set("limit", String(query.limit));
  if (query.q) url.searchParams.set("keyword", query.q);
  if (query.genre) url.searchParams.set("category", query.genre);
  if (query.country) url.searchParams.set("country", query.country);
  if (query.year) url.searchParams.set("year", query.year);
  url.searchParams.set("sort_field", query.sort.startsWith("year") ? "year" : "modified.time");
  url.searchParams.set("sort_type", query.sort === "year_asc" ? "asc" : "desc");
  return url.toString();
}

async function catalogPage(provider: "kkphim" | "ophim", query: DiscoverQuery, limit = query.limit) {
  const url = new URL(buildCatalogUrl(provider === "kkphim" ? kkphimProvider.baseUrl : ophimProvider.baseUrl, query));
  url.searchParams.set("limit", String(limit));
  const options = { provider, url: url.toString(), timeoutMs: 6500, retries: 0 };
  if (provider === "ophim") {
    const response = await requestJson({ ...options, schema: ophimListResponseSchema });
    return normalizeOPhimListResponse(response, { requestedPage: query.page, requestedLimit: limit, cinemaFromEndpoint: query.kind === "cinema" && !query.q });
  }
  const response = await requestJson({ ...options, schema: kkphimListResponseSchema });
  return normalizeKkphimList(response, query.page, { requestedLimit: limit, officialCinemaList: query.kind === "cinema" && !query.q });
}

export class SearchTooBroadError extends Error {}

async function discoverCatalog(provider: "kkphim" | "ophim", query: DiscoverQuery): Promise<ProviderListResult> {
  if (!query.q || query.kind === "latest") return catalogPage(provider, query);
  // Search cannot filter format. Filter the complete bounded result before
  // pagination, not just the current page with an incorrect total.
  const first = await catalogPage(provider, { ...query, page: 1 }, 64);
  if (first.pagination.totalPages > 20) throw new SearchTooBroadError("Hãy nhập tên phim cụ thể hơn để kết hợp với loại phim.");
  const items = [...first.items];
  for (let page = 2; page <= first.pagination.totalPages; page += 4) {
    const pages = await Promise.all(Array.from({ length: Math.min(4, first.pagination.totalPages - page + 1) }, (_, index) => catalogPage(provider, { ...query, page: page + index }, 64)));
    pages.forEach(result => items.push(...result.items));
  }
  const filtered = items.filter(movie => query.kind === "cinema" ? movie.isCinema : movie.type === query.kind);
  return { items: filtered.slice((query.page - 1) * query.limit, query.page * query.limit), pagination: { currentPage: query.page, totalPages: Math.max(1, Math.ceil(filtered.length / query.limit)), totalItems: filtered.length, itemsPerPage: query.limit } };
}

async function discoverNative(provider: "vsmov" | "nguonc", query: DiscoverQuery): Promise<ProviderListResult> {
  let path = `danh-sach/${kinds[query.kind]}`;
  if (query.kind === "latest") path = provider === "nguonc" ? "phim-moi-cap-nhat" : "danh-sach/phim-moi-cap-nhat";
  if (query.genre) path = `the-loai/${encodeURIComponent(query.genre)}`;
  if (query.country) path = `quoc-gia/${encodeURIComponent(query.country)}`;
  if (query.year) path = `${provider === "nguonc" ? "nam-phat-hanh" : "nam"}/${query.year}`;
  if (query.q) path = provider === "nguonc" ? "search" : "tim-kiem";
  const base = provider === "vsmov" ? `${vsmovProvider.baseUrl.replace(/\/$/, "")}/` : `${nguoncProvider.baseUrl}/api/films/`;
  const url = new URL(path, base);
  url.searchParams.set("page", String(query.page));
  url.searchParams.set("limit", String(query.limit));
  if (query.q) url.searchParams.set("keyword", query.q);
  const options = { provider, url: url.toString(), timeoutMs: 6500, retries: 0 };
  if (provider === "vsmov") {
    const response = await requestJson({ ...options, schema: vsmovListResponseSchema });
    return normalizeVsmovList(response);
  }
  const response = await requestJson({ ...options, schema: nguoncListResponseSchema });
  return normalizeNguoncList(response, query.page, query.kind === "latest" || query.kind === "cinema" ? undefined : query.kind);
}

export async function discoverMovies(storeId: string, query: DiscoverQuery) {
  const requestedProvider = resolveStoreProvider(storeId);
  if (!requestedProvider) throw new Error("Invalid store");
  let provider = requestedProvider;
  let result: ProviderListResult | undefined;
  const dimensions = [query.kind !== "latest", query.genre, query.country, query.year, query.q].filter(Boolean).length;
  const attempts: { provider: ProviderId; status: "available" | "unavailable" | "unsupported" }[] = [];
  for (const candidate of getProviderFallbackOrder(requestedProvider)) {
    try {
      if (candidate === "vsmov" || candidate === "nguonc") {
        if (dimensions > 1 || query.genre || query.country || query.year || query.sort.startsWith("year") || query.kind === "cinema") throw new UnsupportedInternationalQuery("Native source cannot preserve this query");
        result = await discoverNative(candidate, query);
      } else if (candidate === "vidsrc" || candidate === "vidlink") {
        result = await (candidate === "vidsrc" ? vidsrcProvider : vidlinkProvider).getFilteredList(query);
      } else {
        result = await discoverCatalog(candidate, query);
      }
      attempts.push({ provider: candidate, status: "available" });
      provider = candidate;
      break; // A successful empty result is not an outage.
    } catch (error) {
      if (error instanceof SearchTooBroadError) throw error;
      attempts.push({ provider: candidate, status: error instanceof UnsupportedInternationalQuery ? "unsupported" : "unavailable" });
    }
  }
  if (!result) throw new Error("All catalog sources unavailable for this query");
  const names = { vsmov: "Bình Minh", ophim: "Ban Mai", nguonc: "Hoàng Hôn", kkphim: "Dạ Nguyệt", vidsrc: "VidSrc", vidlink: "VidLink" };
  const notice = provider === requestedProvider ? null : `Nguồn chính không khả dụng cho truy vấn này. Đang dùng ${names[provider]} với cùng bộ lọc.${provider === "vidsrc" || provider === "vidlink" ? " Danh mục quốc tế dùng dữ liệu TMDB; khả năng phát tùy phim." : ""}`;
  if (query.sort === "title") result.items.sort((a, b) => a.title.localeCompare(b.title, "vi"));
  if (query.sort === "view") result.items.sort((a, b) => Number((b.raw.tmdb as { vote_average?: number })?.vote_average || 0) - Number((a.raw.tmdb as { vote_average?: number })?.vote_average || 0));
  return { ...result, provider, requestedProvider, notice, attempts, items: result.items.map(movie => ({ ...movie, providerSlug: movieReference(movie.provider, movie.providerSlug) })) };
}

// Global search must report provenance, not substitute another store's catalog.
export async function searchStoreCatalog(storeId: string, query: string, page = 1, limit = 24): Promise<ProviderListResult> {
  const provider = resolveStoreProvider(storeId);
  const filters = discoverQuerySchema.parse({ q: query, page, limit });
  if (provider === "kkphim" || provider === "ophim") return discoverCatalog(provider, filters);
  if (provider === "vsmov" || provider === "nguonc") return discoverNative(provider, filters);
  throw new Error("Invalid store");
}
