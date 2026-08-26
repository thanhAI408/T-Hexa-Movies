export const PROVIDER_IDS = [
  "vsmov",
  "ophim",
  "nguonc",
  "kkphim",
  "vidsrc",
  "vidlink",
] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

export type MovieType =
  | "single"
  | "series"
  | "animation"
  | "tvshow"
  | "unknown";

export type StreamType = "hls" | "mp4" | "embed" | "unknown";

export type SourceHealth = "healthy" | "degraded" | "unavailable" | "unknown";

export interface ExternalIds {
  tmdbId: string | null;
  imdbId: string | null;
}

export interface TaxonomyItem {
  id: string;
  name: string;
  slug: string;
}

export interface ProviderMovieInput {
  provider: ProviderId;
  providerMovieId: string;
  providerSlug: string;
  title: string;
  originalTitle: string | null;
  alternativeTitles: string[];
  description: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  year: number | null;
  type: MovieType;
  status: string | null;
  durationMinutes: number | null;
  quality: string | null;
  language: string | null;
  genres: TaxonomyItem[];
  countries: TaxonomyItem[];
  directors: string[];
  actors: string[];
  totalEpisodes: number | null;
  currentEpisode: string | null;
  externalIds: ExternalIds;
  isCinema: boolean;
  cinemaEvidence: string | null;
  providerUpdatedAt: string | null;
  raw: Record<string, unknown>;
}

export interface ProviderEpisodeInput {
  episodeKey: string;
  episodeLabel: string;
  episodeTitle: string | null;
  episodeNumber: number | null;
  seasonNumber: number | null;
  provider: ProviderId;
  serverName: string;
  streamType: StreamType;
  streamUrl: string | null;
  embedUrl: string | null;
  quality: string | null;
  language: string | null;
}

export interface ProviderDetail {
  movie: ProviderMovieInput;
  episodes: ProviderEpisodeInput[];
}

export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface ProviderListResult {
  items: ProviderMovieInput[];
  pagination: Pagination;
}

export interface ProviderHealthResult {
  provider: ProviderId;
  status: SourceHealth;
  latencyMs: number;
  checkedAt: string;
  error: string | null;
}

export interface CanonicalMovieView {
  id: string;
  slug: string;
  title: string;
  originalTitle: string | null;
  description: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  year: number | null;
  type: MovieType;
  status: string | null;
  durationMinutes: number | null;
  quality: string | null;
  language: string | null;
  genres: TaxonomyItem[];
  countries: TaxonomyItem[];
  directors: string[];
  actors: string[];
  totalEpisodes: number | null;
  currentEpisode: string | null;
  isCinema: boolean;
  sourceCount: number;
  latestEpisodeLabel: string | null;
  updatedAt: string;
}

export interface EpisodeSourceView {
  id: string;
  provider: ProviderId;
  serverName: string;
  streamType: StreamType;
  streamUrl: string | null;
  embedUrl: string | null;
  quality: string | null;
  language: string | null;
  health: SourceHealth;
  successCount: number;
  failureCount: number;
  startupLatencyMs: number | null;
  priorityScore: number;
}

export interface EpisodeView {
  id: string;
  episodeKey: string;
  episodeLabel: string;
  episodeTitle: string | null;
  episodeNumber: number | null;
  seasonNumber: number | null;
  sources: EpisodeSourceView[];
}

export interface MovieDetailView extends CanonicalMovieView {
  alternativeTitles: string[];
  episodes: EpisodeView[];
}
