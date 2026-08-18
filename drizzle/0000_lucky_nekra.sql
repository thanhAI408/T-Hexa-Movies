-- Extensions disabled for PGlite compatibility
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE EXTENSION IF NOT EXISTS unaccent;
--> statement-breakpoint
CREATE TABLE "canonical_movies" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"normalized_title" text NOT NULL,
	"original_title" text,
	"normalized_original_title" text,
	"alternative_titles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"description" text,
	"poster_url" text,
	"backdrop_url" text,
	"year" integer,
	"type" text DEFAULT 'unknown' NOT NULL,
	"status" text,
	"duration_minutes" integer,
	"quality" text,
	"language" text,
	"genres" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"countries" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"directors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"actors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_episodes" integer,
	"current_episode" text,
	"tmdb_id" text,
	"imdb_id" text,
	"is_cinema" boolean DEFAULT false NOT NULL,
	"cinema_evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"search_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "episode_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"source_key" text NOT NULL,
	"episode_id" text NOT NULL,
	"provider" text NOT NULL,
	"server_name" text NOT NULL,
	"stream_type" text NOT NULL,
	"stream_url" text,
	"embed_url" text,
	"quality" text,
	"language" text,
	"health" text DEFAULT 'unknown' NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"startup_latency_ms" integer,
	"last_checked_at" timestamp with time zone,
	"last_error" text,
	"priority_score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "episodes" (
	"id" text PRIMARY KEY NOT NULL,
	"movie_id" text NOT NULL,
	"season_number" integer DEFAULT 0 NOT NULL,
	"episode_key" text NOT NULL,
	"episode_label" text NOT NULL,
	"episode_title" text,
	"episode_number" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_movies" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"provider_movie_id" text NOT NULL,
	"provider_slug" text NOT NULL,
	"canonical_movie_id" text NOT NULL,
	"title" text NOT NULL,
	"original_title" text,
	"year" integer,
	"type" text NOT NULL,
	"is_cinema" boolean DEFAULT false NOT NULL,
	"dedupe_reason" text NOT NULL,
	"dedupe_confidence" real NOT NULL,
	"raw" jsonb NOT NULL,
	"provider_updated_at" text,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_sync_states" (
	"provider" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'unknown' NOT NULL,
	"checkpoint_page" integer DEFAULT 1 NOT NULL,
	"full_sync_completed" boolean DEFAULT false NOT NULL,
	"last_successful_sync" timestamp with time zone,
	"last_attempt_at" timestamp with time zone,
	"latency_ms" integer,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "episode_sources" ADD CONSTRAINT "episode_sources_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_movie_id_canonical_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."canonical_movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_movies" ADD CONSTRAINT "provider_movies_canonical_movie_id_canonical_movies_id_fk" FOREIGN KEY ("canonical_movie_id") REFERENCES "public"."canonical_movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "canonical_movies_slug_uq" ON "canonical_movies" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "canonical_movies_tmdb_uq" ON "canonical_movies" USING btree ("tmdb_id") WHERE "canonical_movies"."tmdb_id" is not null and "canonical_movies"."tmdb_id" <> '';--> statement-breakpoint
CREATE UNIQUE INDEX "canonical_movies_imdb_uq" ON "canonical_movies" USING btree ("imdb_id") WHERE "canonical_movies"."imdb_id" is not null and "canonical_movies"."imdb_id" <> '';--> statement-breakpoint
CREATE INDEX "canonical_movies_year_idx" ON "canonical_movies" USING btree ("year");--> statement-breakpoint
CREATE INDEX "canonical_movies_type_idx" ON "canonical_movies" USING btree ("type");--> statement-breakpoint
CREATE INDEX "canonical_movies_cinema_updated_idx" ON "canonical_movies" USING btree ("is_cinema","updated_at");--> statement-breakpoint
CREATE INDEX "canonical_movies_updated_idx" ON "canonical_movies" USING btree ("updated_at");--> statement-breakpoint
-- GIN indexes disabled (require pg_trgm extension)
-- CREATE INDEX "canonical_movies_title_trgm_idx" ON "canonical_movies" USING gin ("normalized_title" gin_trgm_ops);
-- CREATE INDEX "canonical_movies_original_title_trgm_idx" ON "canonical_movies" USING gin ("normalized_original_title" gin_trgm_ops);
-- CREATE INDEX "canonical_movies_search_trgm_idx" ON "canonical_movies" USING gin ("search_text" gin_trgm_ops);
-- CREATE INDEX "canonical_movies_search_fts_idx" ON "canonical_movies" USING gin (to_tsvector('simple', "search_text"));
-- CREATE INDEX "canonical_movies_genres_gin_idx" ON "canonical_movies" USING gin ("genres");
-- CREATE INDEX "canonical_movies_countries_gin_idx" ON "canonical_movies" USING gin ("countries");
--> statement-breakpoint
CREATE UNIQUE INDEX "episode_sources_identity_uq" ON "episode_sources" USING btree ("episode_id","source_key");--> statement-breakpoint
CREATE INDEX "episode_sources_episode_idx" ON "episode_sources" USING btree ("episode_id");--> statement-breakpoint
CREATE INDEX "episode_sources_health_idx" ON "episode_sources" USING btree ("health");--> statement-breakpoint
CREATE UNIQUE INDEX "episodes_identity_uq" ON "episodes" USING btree ("movie_id","season_number","episode_key");--> statement-breakpoint
CREATE INDEX "episodes_movie_idx" ON "episodes" USING btree ("movie_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_movies_identity_uq" ON "provider_movies" USING btree ("provider","provider_movie_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_movies_slug_uq" ON "provider_movies" USING btree ("provider","provider_slug");--> statement-breakpoint
CREATE INDEX "provider_movies_canonical_idx" ON "provider_movies" USING btree ("canonical_movie_id");
