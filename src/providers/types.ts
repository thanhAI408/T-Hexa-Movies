import type {
  ProviderDetail,
  ProviderHealthResult,
  ProviderId,
  ProviderListResult,
  TaxonomyItem,
} from "@/types/catalog";

export type ProviderListKind =
  | "latest"
  | "single"
  | "series"
  | "animation"
  | "tvshow"
  | "cinema";

export interface MovieProvider {
  readonly id: ProviderId;
  readonly displayName: string;
  readonly baseUrl: string;

  healthCheck(): Promise<ProviderHealthResult>;
  getLatest(page?: number, limit?: number): Promise<ProviderListResult>;
  getList(
    kind: ProviderListKind,
    page?: number,
    limit?: number,
  ): Promise<ProviderListResult>;
  search(query: string, page?: number, limit?: number): Promise<ProviderListResult>;
  getMovie(slug: string): Promise<ProviderDetail | null>;
  getGenres(): Promise<TaxonomyItem[]>;
  getCountries(): Promise<TaxonomyItem[]>;
  getYears(): Promise<number[]>;
  getCinemaMovies(page?: number, limit?: number): Promise<ProviderListResult>;
}
