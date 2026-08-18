import type {
  ProviderHealthResult,
  ProviderListResult,
  TaxonomyItem,
} from "@/types/catalog";
import { ProviderRequestError, requestJson, withQuery } from "@/providers/shared/http";
import { normalizeTaxonomy, safeString, toYear } from "@/providers/shared/normalize";
import type { MovieProvider, ProviderListKind } from "@/providers/types";

import { normalizeVsmovDetail, normalizeVsmovList } from "./normalize";
import {
  vsmovDetailResponseSchema,
  vsmovListResponseSchema,
  vsmovTaxonomyResponseSchema,
} from "./schemas";

const DEFAULT_BASE_URL = "https://vsmov.com/api/";
const DEFAULT_PAGE_SIZE = 24;
const CINEMA_DETAIL_CONCURRENCY = 4;

function positiveInteger(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : fallback;
}

function emptyList(page: number, limit: number): ProviderListResult {
  return {
    items: [],
    pagination: {
      currentPage: page,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: limit,
    },
  };
}

async function mapInChunks<T, U>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<U>,
) {
  const result: U[] = [];
  for (let index = 0; index < values.length; index += concurrency) {
    result.push(...(await Promise.all(values.slice(index, index + concurrency).map(mapper))));
  }
  return result;
}

export class VsmovProvider implements MovieProvider {
  readonly id = "vsmov" as const;
  readonly displayName = "VSMOV";
  readonly baseUrl: string;

  constructor(
    baseUrl = process.env.VSMOV_BASE_URL
      ?? process.env.VSMOV_API_BASE_URL
      ?? DEFAULT_BASE_URL,
  ) {
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  }

  private listUrl(
    pathname: string,
    page: number,
    limit: number,
    extra: Record<string, string | number | null | undefined> = {},
  ) {
    return withQuery(this.baseUrl, pathname, { page, limit, ...extra });
  }

  private async requestList(url: string) {
    const response = await requestJson({
      provider: this.id,
      url,
      schema: vsmovListResponseSchema,
    });
    return normalizeVsmovList(response);
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    const startedAt = performance.now();
    const checkedAt = new Date().toISOString();
    try {
      const response = await requestJson({
        provider: this.id,
        url: withQuery(this.baseUrl, "danh-sach/phim-moi-cap-nhat", { page: 1 }),
        schema: vsmovListResponseSchema,
        retries: 0,
        timeoutMs: 8_000,
      });
      if (!response.status) throw new Error("VSMOV health response was unsuccessful");

      const latencyMs = Math.round(performance.now() - startedAt);
      const hasItems = response.items.length > 0;
      return {
        provider: this.id,
        status: !hasItems || latencyMs > 5_000 ? "degraded" : "healthy",
        latencyMs,
        checkedAt,
        error: hasItems ? null : "VSMOV latest response contained no items",
      };
    } catch (error) {
      return {
        provider: this.id,
        status: "unavailable",
        latencyMs: Math.round(performance.now() - startedAt),
        checkedAt,
        error: error instanceof Error ? error.message : "Unknown VSMOV health error",
      };
    }
  }

  getLatest(page = 1, limit = DEFAULT_PAGE_SIZE) {
    const safePage = positiveInteger(page, 1);
    const safeLimit = positiveInteger(limit, DEFAULT_PAGE_SIZE);
    return this.requestList(
      this.listUrl("danh-sach/phim-moi-cap-nhat", safePage, safeLimit),
    );
  }

  getList(kind: ProviderListKind, page = 1, limit = DEFAULT_PAGE_SIZE) {
    const safePage = positiveInteger(page, 1);
    const safeLimit = positiveInteger(limit, DEFAULT_PAGE_SIZE);

    if (kind === "latest") return this.getLatest(safePage, safeLimit);
    if (kind === "cinema") return this.getCinemaMovies(safePage, safeLimit);

    const routeByKind: Partial<Record<ProviderListKind, string>> = {
      single: "danh-sach/phim-le",
      series: "danh-sach/phim-bo",
      animation: "the-loai/hoat-hinh",
    };
    const route = routeByKind[kind] ?? "danh-sach/phim-moi";
    const extra = kind === "tvshow" ? { type: "tvshows" } : {};
    return this.requestList(this.listUrl(route, safePage, safeLimit, extra));
  }

  search(query: string, page = 1, limit = 20) {
    const keyword = safeString(query);
    const safePage = positiveInteger(page, 1);
    const safeLimit = positiveInteger(limit, 20);
    if (!keyword) return Promise.resolve(emptyList(safePage, safeLimit));

    return this.requestList(
      this.listUrl("tim-kiem", safePage, safeLimit, { keyword }),
    );
  }

  async getMovie(slug: string) {
    const safeSlug = safeString(slug);
    if (!safeSlug) return null;

    const url = new URL(`phim/${encodeURIComponent(safeSlug)}`, this.baseUrl).toString();
    try {
      const response = await requestJson({
        provider: this.id,
        url,
        schema: vsmovDetailResponseSchema,
      });
      return normalizeVsmovDetail(response);
    } catch (error) {
      // Missing VSMOV records return an nginx HTML 404. requestJson rejects it
      // before JSON parsing, and the adapter exposes the contract's null result.
      if (error instanceof ProviderRequestError && error.status === 404) return null;
      throw error;
    }
  }

  private async getTaxonomy(pathname: string, fallbackPrefix: string) {
    const response = await requestJson({
      provider: this.id,
      url: new URL(pathname, this.baseUrl).toString(),
      schema: vsmovTaxonomyResponseSchema,
    });
    if (response.status !== "success" && response.status !== true) {
      throw new Error(`VSMOV returned an unsuccessful ${fallbackPrefix} response`);
    }
    return normalizeTaxonomy(response.data.items, fallbackPrefix);
  }

  getGenres(): Promise<TaxonomyItem[]> {
    return this.getTaxonomy("the-loai", "vsmov-genre");
  }

  getCountries(): Promise<TaxonomyItem[]> {
    return this.getTaxonomy("quoc-gia", "vsmov-country");
  }

  async getYears() {
    const response = await requestJson({
      provider: this.id,
      url: new URL("nam", this.baseUrl).toString(),
      schema: vsmovTaxonomyResponseSchema,
    });
    if (response.status !== "success" && response.status !== true) {
      throw new Error("VSMOV returned an unsuccessful year response");
    }
    return [
      ...new Set(
        response.data.items
          .map((item) => toYear(item.slug || item.name))
          .filter((year): year is number => year !== null),
      ),
    ].sort((left, right) => right - left);
  }

  async getCinemaMovies(page = 1, limit = DEFAULT_PAGE_SIZE) {
    const safePage = positiveInteger(page, 1);
    const safeLimit = positiveInteger(limit, DEFAULT_PAGE_SIZE);
    const candidates = await this.getLatest(safePage, safeLimit);

    const details = await mapInChunks(
      candidates.items,
      CINEMA_DETAIL_CONCURRENCY,
      async (candidate) => {
        try {
          return await this.getMovie(candidate.providerSlug);
        } catch {
          // One malformed/degraded detail must not discard the rest of the page.
          return null;
        }
      },
    );

    return {
      items: details
        .flatMap((detail) => (detail?.movie.isCinema ? [detail.movie] : []))
        .slice(0, safeLimit),
      // VSMOV has no confirmed cinema-list endpoint or cinema total. Pagination
      // describes the latest-page candidate scan so callers may continue to the
      // next candidate page without inventing a cinema count.
      pagination: candidates.pagination,
    };
  }
}

export const vsmovProvider = new VsmovProvider();
export default vsmovProvider;

export { normalizeVsmovDetail, normalizeVsmovList } from "./normalize";
export {
  vsmovDetailResponseSchema,
  vsmovListResponseSchema,
  vsmovMovieDetailSchema,
  vsmovMovieSummarySchema,
  vsmovTaxonomyResponseSchema,
} from "./schemas";
