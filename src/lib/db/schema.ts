import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import type { TaxonomyItem } from "@/types/catalog";

const emptyArray = sql`'[]'::jsonb`;

export const canonicalMovies = pgTable(
  "canonical_movies",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    normalizedTitle: text("normalized_title").notNull(),
    originalTitle: text("original_title"),
    normalizedOriginalTitle: text("normalized_original_title"),
    alternativeTitles: jsonb("alternative_titles")
      .$type<string[]>()
      .notNull()
      .default(emptyArray),
    description: text("description"),
    posterUrl: text("poster_url"),
    backdropUrl: text("backdrop_url"),
    year: integer("year"),
    type: text("type").notNull().default("unknown"),
    status: text("status"),
    durationMinutes: integer("duration_minutes"),
    quality: text("quality"),
    language: text("language"),
    genres: jsonb("genres").$type<TaxonomyItem[]>().notNull().default(emptyArray),
    countries: jsonb("countries")
      .$type<TaxonomyItem[]>()
      .notNull()
      .default(emptyArray),
    directors: jsonb("directors").$type<string[]>().notNull().default(emptyArray),
    actors: jsonb("actors").$type<string[]>().notNull().default(emptyArray),
    totalEpisodes: integer("total_episodes"),
    currentEpisode: text("current_episode"),
    tmdbId: text("tmdb_id"),
    imdbId: text("imdb_id"),
    isCinema: boolean("is_cinema").notNull().default(false),
    cinemaEvidence: jsonb("cinema_evidence")
      .$type<string[]>()
      .notNull()
      .default(emptyArray),
    searchText: text("search_text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("canonical_movies_slug_uq").on(table.slug),
    uniqueIndex("canonical_movies_tmdb_uq")
      .on(table.tmdbId)
      .where(sql`${table.tmdbId} is not null and ${table.tmdbId} <> ''`),
    uniqueIndex("canonical_movies_imdb_uq")
      .on(table.imdbId)
      .where(sql`${table.imdbId} is not null and ${table.imdbId} <> ''`),
    index("canonical_movies_year_idx").on(table.year),
    index("canonical_movies_type_idx").on(table.type),
    index("canonical_movies_cinema_updated_idx").on(table.isCinema, table.updatedAt),
    index("canonical_movies_updated_idx").on(table.updatedAt),
  ],
);

export const providerMovies = pgTable(
  "provider_movies",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    providerMovieId: text("provider_movie_id").notNull(),
    providerSlug: text("provider_slug").notNull(),
    canonicalMovieId: text("canonical_movie_id")
      .notNull()
      .references(() => canonicalMovies.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    originalTitle: text("original_title"),
    year: integer("year"),
    type: text("type").notNull(),
    isCinema: boolean("is_cinema").notNull().default(false),
    dedupeReason: text("dedupe_reason").notNull(),
    dedupeConfidence: real("dedupe_confidence").notNull(),
    raw: jsonb("raw").$type<Record<string, unknown>>().notNull(),
    providerUpdatedAt: text("provider_updated_at"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("provider_movies_identity_uq").on(
      table.provider,
      table.providerMovieId,
    ),
    uniqueIndex("provider_movies_slug_uq").on(table.provider, table.providerSlug),
    index("provider_movies_canonical_idx").on(table.canonicalMovieId),
  ],
);

export const episodes = pgTable(
  "episodes",
  {
    id: text("id").primaryKey(),
    movieId: text("movie_id")
      .notNull()
      .references(() => canonicalMovies.id, { onDelete: "cascade" }),
    seasonNumber: integer("season_number").notNull().default(0),
    episodeKey: text("episode_key").notNull(),
    episodeLabel: text("episode_label").notNull(),
    episodeTitle: text("episode_title"),
    episodeNumber: doublePrecision("episode_number"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("episodes_identity_uq").on(
      table.movieId,
      table.seasonNumber,
      table.episodeKey,
    ),
    index("episodes_movie_idx").on(table.movieId),
  ],
);

export const episodeSources = pgTable(
  "episode_sources",
  {
    id: text("id").primaryKey(),
    sourceKey: text("source_key").notNull(),
    episodeId: text("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    serverName: text("server_name").notNull(),
    streamType: text("stream_type").notNull(),
    streamUrl: text("stream_url"),
    embedUrl: text("embed_url"),
    quality: text("quality"),
    language: text("language"),
    health: text("health").notNull().default("unknown"),
    successCount: integer("success_count").notNull().default(0),
    failureCount: integer("failure_count").notNull().default(0),
    startupLatencyMs: integer("startup_latency_ms"),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    lastError: text("last_error"),
    priorityScore: integer("priority_score").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("episode_sources_identity_uq").on(table.episodeId, table.sourceKey),
    index("episode_sources_episode_idx").on(table.episodeId),
    index("episode_sources_health_idx").on(table.health),
  ],
);

export const providerSyncStates = pgTable("provider_sync_states", {
  provider: text("provider").primaryKey(),
  status: text("status").notNull().default("unknown"),
  checkpointPage: integer("checkpoint_page").notNull().default(1),
  fullSyncCompleted: boolean("full_sync_completed").notNull().default(false),
  lastSuccessfulSync: timestamp("last_successful_sync", { withTimezone: true }),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  latencyMs: integer("latency_ms"),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  lastError: text("last_error"),
  stats: jsonb("stats").$type<Record<string, number>>().notNull().default(sql`'{}'::jsonb`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
