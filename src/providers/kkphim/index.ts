import type { MovieType, ProviderHealthResult, ProviderListResult } from "@/types/catalog";
import type { MovieProvider, ProviderListKind } from "@/providers/types";
import {
  ProviderRequestError,
  requestJson,
  withQuery,
} from "@/providers/shared/http";
import { normalizeTaxonomy, toYear } from "@/providers/shared/normalize";

import {
  type KkphimListContext,
  normalizeKkphimDetail,
  normalizeKkphimList,
} from "./normalize";
import {
  kkphimDetailResponseSchema,
  kkphimListResponseSchema,
  kkphimTaxonomyResponseSchema,
  kkphimYearsResponseSchema,
} from "./schemas";

const DEFAULT_BASE_URL = "https://phimapi.com";

function normalizeBaseUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Unsupported KKPhim base URL protocol: ${url.protocol}`);
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
  if (!Number.isFinite(value) || (value ?? 0) <= 0) return fallback;
  return Math.min(64, Math.floor(value as number));
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

export class KkphimProvider implements MovieProvider {
  readonly id = "kkphim" as const;
  readonly displayName = "KKPhim / PhimAPI";
  readonly baseUrl: string;

  constructor(
    baseUrl =
      process.env.KKPHIM_BASE_URL ??
      process.env.KKPHIM_API_BASE_URL ??
      DEFAULT_BASE_URL,
  ) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
  }

  private async listRequest(
    primaryPath: string,
    fallbackPath: string | null,
    requestedPage: number,
    context: KkphimListContext = {},
    params: Record<string, string | number | null | undefined> = {},
  ) {
    const request = (pathname: string) =>
      requestJson({
        provider: this.id,
        url: withQuery(this.baseUrl, pathname, {
          ...params,
          page: requestedPage,
        }),
        schema: kkphimListResponseSchema,
      });

    try {
      const response = await request(primaryPath);
      return normalizeKkphimList(response, requestedPage, context);
    } catch (primaryError) {
      if (!fallbackPath) throw primaryError;
      const response = await request(fallbackPath);
      return normalizeKkphimList(response, requestedPage, context);
    }
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
    const requestedPage = validPage(page);
    return this.listRequest(
      "/v1/api/danh-sach",
      "/danh-sach/phim-moi-cap-nhat-v3",
      requestedPage,
      { requestedLimit: validLimit(limit, 24) },
    );
  }

  async getList(
    kind: ProviderListKind,
    page = 1,
    limit?: number,
  ): Promise<ProviderListResult> {
    if (kind === "latest") return this.getLatest(page, limit);
    if (kind === "cinema") return this.getCinemaMovies(page, limit);

    const requestedPage = validPage(page);
    const route = LIST_ROUTES[kind];
    return this.listRequest(
      `/v1/api/danh-sach/${route}`,
      `/danh-sach/${route}`,
      requestedPage,
      {
        typeHint: TYPE_HINTS[kind],
        requestedLimit: validLimit(limit, 24),
      },
    );
  }

  async search(query: string, page = 1, limit?: number): Promise<ProviderListResult> {
    const requestedPage = validPage(page);
    const requestedLimit = validLimit(limit);
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return emptyResult(requestedPage, requestedLimit);

    return this.listRequest(
      "/v1/api/tim-kiem",
      null,
      requestedPage,
      { requestedLimit },
      { keyword: normalizedQuery, limit: requestedLimit },
    );
  }

  async getMovie(slug: string) {
    const normalizedSlug = slug.trim();
    if (!normalizedSlug) return null;

    const request = (pathname: string) =>
      requestJson({
        provider: this.id,
        url: withQuery(
          this.baseUrl,
          `${pathname}/${encodeURIComponent(normalizedSlug)}`,
          {},
        ),
        schema: kkphimDetailResponseSchema,
      });

    try {
      const response = await request("/v1/api/phim");
      return normalizeKkphimDetail(response);
    } catch (primaryError) {
      if (
        primaryError instanceof ProviderRequestError &&
        primaryError.status === 404
      ) {
        return null;
      }

      try {
        const response = await request("/phim");
        return normalizeKkphimDetail(response);
      } catch (fallbackError) {
        if (
          fallbackError instanceof ProviderRequestError &&
          fallbackError.status === 404
        ) {
          return null;
        }
        throw fallbackError;
      }
    }
  }

  async getGenres() {
    const response = await requestJson({
      provider: this.id,
      url: withQuery(this.baseUrl, "/the-loai", {}),
      schema: kkphimTaxonomyResponseSchema,
    });
    return normalizeTaxonomy(response.data.items, "kkphim-genre");
  }

  async getCountries() {
    const response = await requestJson({
      provider: this.id,
      url: withQuery(this.baseUrl, "/quoc-gia", {}),
      schema: kkphimTaxonomyResponseSchema,
    });
    return normalizeTaxonomy(response.data.items, "kkphim-country");
  }

  async getYears() {
    const response = await requestJson({
      provider: this.id,
      url: withQuery(this.baseUrl, "/nam-phat-hanh", {}),
      schema: kkphimYearsResponseSchema,
    });
    return [
      ...new Set(
        response.data.items
          .map((item) => toYear(item.year))
          .filter((year): year is number => year !== null),
      ),
    ].sort((left, right) => right - left);
  }

  async getCinemaMovies(page = 1, limit?: number): Promise<ProviderListResult> {
    const requestedPage = validPage(page);
    return this.listRequest(
      "/v1/api/danh-sach/phim-chieu-rap",
      "/danh-sach/phim-chieu-rap",
      requestedPage,
      {
        officialCinemaList: true,
        requestedLimit: validLimit(limit, 24),
      },
    );
  }
}

export const kkphimProvider = new KkphimProvider();

export * from "./normalize";
export * from "./schemas";

export default kkphimProvider;
