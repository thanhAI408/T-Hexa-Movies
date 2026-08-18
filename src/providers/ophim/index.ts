import type {
  ProviderDetail,
  ProviderHealthResult,
  ProviderListResult,
  TaxonomyItem,
} from "@/types/catalog";
import { ProviderRequestError, requestJson, withQuery } from "@/providers/shared/http";
import { normalizeTaxonomy, toYear } from "@/providers/shared/normalize";
import type { MovieProvider, ProviderListKind } from "@/providers/types";

import {
  OPHIM_DEFAULT_IMAGE_BASE_URL,
  normalizeOPhimDetailResponse,
  normalizeOPhimListResponse,
} from "./normalize";
import {
  ophimDetailResponseSchema,
  ophimListResponseSchema,
  ophimTaxonomyResponseSchema,
  type OPhimListResponse,
  type OPhimTaxonomyResponse,
} from "./schema";

export const OPHIM_DEFAULT_BASE_URL = "https://ophim1.com";

const LIST_SLUGS: Exclude<ProviderListKind, "latest" | "cinema">[] = [
  "single",
  "series",
  "animation",
  "tvshow",
];

const KIND_TO_SLUG: Record<(typeof LIST_SLUGS)[number], string> = {
  single: "phim-le",
  series: "phim-bo",
  animation: "hoat-hinh",
  tvshow: "tv-shows",
};

function normalizeBaseUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Unsupported OPhim base URL protocol: ${url.protocol}`);
  }
  return url.toString().replace(/\/$/, "");
}

function normalizePage(value = 1) {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 1;
}

function normalizeLimit(value = 24) {
  if (!Number.isFinite(value)) return 24;
  return Math.min(64, Math.max(1, Math.trunc(value)));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown OPhim error";
}

export class OPhimProvider implements MovieProvider {
  readonly id = "ophim" as const;
  readonly displayName = "OPhim";
  readonly baseUrl: string;
  readonly imageBaseUrl: string;

  constructor(
    baseUrl = process.env.OPHIM_BASE_URL ?? OPHIM_DEFAULT_BASE_URL,
    imageBaseUrl = process.env.OPHIM_IMAGE_BASE_URL ?? OPHIM_DEFAULT_IMAGE_BASE_URL,
  ) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.imageBaseUrl = normalizeBaseUrl(imageBaseUrl);
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    const startedAt = Date.now();
    try {
      const response = await this.requestTaxonomy("/v1/api/the-loai", "/the-loai");
      const latencyMs = Date.now() - startedAt;
      const hasItems = response.data.items.length > 0;
      return {
        provider: this.id,
        status: !hasItems || latencyMs > 4_000 ? "degraded" : "healthy",
        latencyMs,
        checkedAt: new Date().toISOString(),
        error: hasItems ? null : "Genre taxonomy returned no items",
      };
    } catch (error) {
      return {
        provider: this.id,
        status: "unavailable",
        latencyMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
        error: errorMessage(error),
      };
    }
  }

  async getLatest(page = 1, limit = 24): Promise<ProviderListResult> {
    const safePage = normalizePage(page);
    const safeLimit = normalizeLimit(limit);
    return this.requestListWithFallback(
      "/v1/api/danh-sach",
      "/danh-sach/phim-moi-cap-nhat",
      safePage,
      safeLimit,
      false,
    );
  }

  async getList(
    kind: ProviderListKind,
    page = 1,
    limit = 24,
  ): Promise<ProviderListResult> {
    if (kind === "latest") return this.getLatest(page, limit);
    if (kind === "cinema") return this.getCinemaMovies(page, limit);

    const slug = KIND_TO_SLUG[kind];
    const safePage = normalizePage(page);
    const safeLimit = normalizeLimit(limit);
    return this.requestListWithFallback(
      `/v1/api/danh-sach/${slug}`,
      `/danh-sach/${slug}`,
      safePage,
      safeLimit,
      false,
    );
  }

  async search(query: string, page = 1, limit = 24): Promise<ProviderListResult> {
    const keyword = query.trim();
    const safePage = normalizePage(page);
    const safeLimit = normalizeLimit(limit);
    if (!keyword) {
      return {
        items: [],
        pagination: {
          currentPage: safePage,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: safeLimit,
        },
      };
    }

    const response = await requestJson({
      provider: this.id,
      url: withQuery(this.baseUrl, "/v1/api/tim-kiem", {
        keyword,
        page: safePage,
        limit: safeLimit,
      }),
      schema: ophimListResponseSchema,
      retry404: true,
    });
    return normalizeOPhimListResponse(response, {
      requestedPage: safePage,
      requestedLimit: safeLimit,
      cdnBaseUrl: this.imageBaseUrl,
    });
  }

  async getMovie(slug: string): Promise<ProviderDetail | null> {
    const safeSlug = slug.trim();
    if (!safeSlug) return null;
    const encodedSlug = encodeURIComponent(safeSlug);

    try {
      const response = await requestJson({
        provider: this.id,
        url: withQuery(this.baseUrl, `/v1/api/phim/${encodedSlug}`, {}),
        schema: ophimDetailResponseSchema,
      });
      return normalizeOPhimDetailResponse(response, this.imageBaseUrl);
    } catch (primaryError) {
      const primaryWasNotFound =
        primaryError instanceof ProviderRequestError && primaryError.status === 404;
      try {
        const legacyResponse = await requestJson({
          provider: this.id,
          url: withQuery(this.baseUrl, `/phim/${encodedSlug}`, {}),
          schema: ophimDetailResponseSchema,
        });
        return normalizeOPhimDetailResponse(legacyResponse, this.imageBaseUrl);
      } catch (legacyError) {
        if (
          primaryWasNotFound &&
          legacyError instanceof ProviderRequestError &&
          legacyError.status === 404
        ) {
          return null;
        }
        throw legacyError;
      }
    }
  }

  async getGenres(): Promise<TaxonomyItem[]> {
    const response = await this.requestTaxonomy("/v1/api/the-loai", "/the-loai");
    return normalizeTaxonomy(response.data.items, "ophim-genre");
  }

  async getCountries(): Promise<TaxonomyItem[]> {
    const response = await this.requestTaxonomy("/v1/api/quoc-gia", "/quoc-gia");
    return normalizeTaxonomy(response.data.items, "ophim-country");
  }

  async getYears(): Promise<number[]> {
    const response = await requestJson({
      provider: this.id,
      url: withQuery(this.baseUrl, "/nam-phat-hanh", {}),
      schema: ophimTaxonomyResponseSchema,
      retry404: true,
    });
    return [
      ...new Set(
        response.data.items
          .map((item) => toYear(item.year))
          .filter((year): year is number => year !== null),
      ),
    ].sort((left, right) => right - left);
  }

  async getCinemaMovies(page = 1, limit = 24): Promise<ProviderListResult> {
    const safePage = normalizePage(page);
    const safeLimit = normalizeLimit(limit);
    return this.requestListWithFallback(
      "/v1/api/danh-sach/phim-chieu-rap",
      "/danh-sach/phim-chieu-rap",
      safePage,
      safeLimit,
      true,
    );
  }

  private async requestListWithFallback(
    primaryPath: string,
    legacyPath: string,
    page: number,
    limit: number,
    cinemaFromEndpoint: boolean,
  ) {
    let response: OPhimListResponse;
    try {
      response = await requestJson({
        provider: this.id,
        url: withQuery(this.baseUrl, primaryPath, { page, limit }),
        schema: ophimListResponseSchema,
        retry404: true,
      });
    } catch {
      response = await requestJson({
        provider: this.id,
        url: withQuery(this.baseUrl, legacyPath, { page }),
        schema: ophimListResponseSchema,
        retry404: true,
      });
    }

    return normalizeOPhimListResponse(response, {
      requestedPage: page,
      requestedLimit: limit,
      cdnBaseUrl: this.imageBaseUrl,
      cinemaFromEndpoint,
    });
  }

  private async requestTaxonomy(primaryPath: string, legacyPath: string) {
    try {
      return await requestJson({
        provider: this.id,
        url: withQuery(this.baseUrl, primaryPath, {}),
        schema: ophimTaxonomyResponseSchema,
        retry404: true,
      });
    } catch {
      return requestJson({
        provider: this.id,
        url: withQuery(this.baseUrl, legacyPath, {}),
        schema: ophimTaxonomyResponseSchema,
        retry404: true,
      });
    }
  }
}

export const ophimProvider = new OPhimProvider();

export default ophimProvider;

export type { OPhimTaxonomyResponse };
export {
  normalizeOPhimDetailResponse,
  normalizeOPhimEpisodes,
  normalizeOPhimListResponse,
  normalizeOPhimMovie,
} from "./normalize";
export {
  ophimDetailResponseSchema,
  ophimListResponseSchema,
  ophimTaxonomyResponseSchema,
} from "./schema";
