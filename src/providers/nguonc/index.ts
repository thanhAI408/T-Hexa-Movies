import type { MovieType, ProviderHealthResult, ProviderListResult } from "@/types/catalog";
import type { MovieProvider, ProviderListKind } from "@/providers/types";
import {
  ProviderRequestError,
  requestJson,
  withQuery,
} from "@/providers/shared/http";

import { normalizeNguoncDetail, normalizeNguoncList } from "./normalize";
import {
  nguoncDetailResponseSchema,
  nguoncListResponseSchema,
} from "./schemas";
import {
  cloneTaxonomy,
  NGUONC_COUNTRIES,
  NGUONC_GENRES,
  NGUONC_YEARS,
} from "./taxonomy";

const DEFAULT_BASE_URL = "https://phim.nguonc.com";

function normalizeBaseUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Unsupported NguonC base URL protocol: ${url.protocol}`);
  }
  return url.toString().replace(/\/$/, "");
}

const LIST_ROUTES: Record<Exclude<ProviderListKind, "latest" | "cinema">, string> = {
  single: "phim-le",
  series: "phim-bo",
  animation: "hoat-hinh",
  tvshow: "tv-shows",
};

const TYPE_HINTS: Record<Exclude<ProviderListKind, "latest" | "cinema">, MovieType> = {
  single: "single",
  series: "series",
  animation: "animation",
  tvshow: "tvshow",
};

function validPage(value: number | undefined) {
  return Number.isFinite(value) && (value ?? 0) > 0 ? Math.floor(value as number) : 1;
}

function validLimit(value: number | undefined, fallback = 10) {
  return Number.isFinite(value) && (value ?? 0) > 0
    ? Math.floor(value as number)
    : fallback;
}

function emptyResult(page: number, limit: number): ProviderListResult {
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

export class NguoncProvider implements MovieProvider {
  readonly id = "nguonc" as const;
  readonly displayName = "NguonC";
  readonly baseUrl: string;

  constructor(
    baseUrl =
      process.env.NGUONC_BASE_URL ??
      process.env.NGUONC_API_BASE_URL ??
      DEFAULT_BASE_URL,
  ) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    const startedAt = Date.now();
    try {
      const result = await this.getLatest(1);
      return {
        provider: this.id,
        status: result.items.length > 0 ? "healthy" : "degraded",
        latencyMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
        error: result.items.length > 0 ? null : "Latest feed returned no movies",
      };
    } catch (error) {
      return {
        provider: this.id,
        status: "unavailable",
        latencyMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown provider error",
      };
    }
  }

  async getLatest(page = 1, limit?: number): Promise<ProviderListResult> {
    void limit; // NguonC fixes list pages at ten items.
    const requestedPage = validPage(page);
    const response = await requestJson({
      provider: this.id,
      url: withQuery(this.baseUrl, "/api/films/phim-moi-cap-nhat", {
        page: requestedPage,
      }),
      schema: nguoncListResponseSchema,
    });
    return normalizeNguoncList(response, requestedPage);
  }

  async getList(
    kind: ProviderListKind,
    page = 1,
    limit?: number,
  ): Promise<ProviderListResult> {
    if (kind === "latest") return this.getLatest(page, limit);
    if (kind === "cinema") return this.getCinemaMovies(page, limit);

    void limit; // The documented list endpoint does not accept a limit.
    const requestedPage = validPage(page);
    const response = await requestJson({
      provider: this.id,
      url: withQuery(
        this.baseUrl,
        `/api/films/danh-sach/${LIST_ROUTES[kind]}`,
        { page: requestedPage },
      ),
      schema: nguoncListResponseSchema,
    });
    return normalizeNguoncList(response, requestedPage, TYPE_HINTS[kind]);
  }

  async search(query: string, page = 1, limit?: number): Promise<ProviderListResult> {
    const requestedPage = validPage(page);
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return emptyResult(requestedPage, validLimit(limit));

    const response = await requestJson({
      provider: this.id,
      url: withQuery(this.baseUrl, "/api/films/search", {
        keyword: normalizedQuery,
        // The docs omit it, but the live API returns and honors this page value.
        page: requestedPage,
      }),
      schema: nguoncListResponseSchema,
    });
    return normalizeNguoncList(response, requestedPage);
  }

  async getMovie(slug: string) {
    const normalizedSlug = slug.trim();
    if (!normalizedSlug) return null;

    try {
      const response = await requestJson({
        provider: this.id,
        url: withQuery(
          this.baseUrl,
          `/api/film/${encodeURIComponent(normalizedSlug)}`,
          {},
        ),
        schema: nguoncDetailResponseSchema,
      });
      return normalizeNguoncDetail(response);
    } catch (error) {
      if (error instanceof ProviderRequestError && error.status === 404) return null;
      throw error;
    }
  }

  async getGenres() {
    return cloneTaxonomy(NGUONC_GENRES);
  }

  async getCountries() {
    return cloneTaxonomy(NGUONC_COUNTRIES);
  }

  async getYears() {
    return [...NGUONC_YEARS];
  }

  async getCinemaMovies(page = 1, limit?: number): Promise<ProviderListResult> {
    // NguonC documents no cinema list or positive cinema field. The guessed
    // phim-chieu-rap slug returns 404, so heuristics are deliberately forbidden.
    return emptyResult(validPage(page), validLimit(limit));
  }
}

export const nguoncProvider = new NguoncProvider();

export * from "./normalize";
export * from "./schemas";
export * from "./taxonomy";

export default nguoncProvider;
