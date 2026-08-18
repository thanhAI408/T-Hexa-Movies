import { createHash, randomUUID } from "node:crypto";

import type {
  CanonicalMovieView,
  EpisodeSourceView,
  EpisodeView,
  MovieDetailView,
  MovieType,
  ProviderDetail,
  ProviderId,
  ProviderMovieInput,
  SourceHealth,
  StreamType,
  TaxonomyItem,
} from "@/types/catalog";
import type { DatabaseClient, QueryRow, SqlExecutor, SqlParameter } from "@/lib/db/client";
import { getDatabase } from "@/lib/db/client";
import { canonicalSlug } from "@/lib/slug";
import { normalizeTitle } from "@/providers/shared/normalize";

interface MovieRow extends QueryRow {
  id: string;
  slug: string;
  title: string;
  normalized_title: string;
  original_title: string | null;
  normalized_original_title: string | null;
  alternative_titles: unknown;
  description: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  year: number | null;
  type: MovieType;
  status: string | null;
  duration_minutes: number | null;
  quality: string | null;
  language: string | null;
  genres: unknown;
  countries: unknown;
  directors: unknown;
  actors: unknown;
  total_episodes: number | null;
  current_episode: string | null;
  tmdb_id: string | null;
  imdb_id: string | null;
  is_cinema: boolean;
  cinema_evidence: unknown;
  search_text: string;
  created_at: Date | string;
  updated_at: Date | string;
  source_count?: number | string;
  latest_episode_label?: string | null;
  search_rank?: number | string;
}

interface EpisodeRow extends QueryRow {
  id: string;
  episode_key: string;
  episode_label: string;
  episode_title: string | null;
  episode_number: number | null;
  season_number: number | null;
}

interface SourceRow extends QueryRow {
  id: string;
  episode_id: string;
  provider: ProviderId;
  server_name: string;
  stream_type: StreamType;
  stream_url: string | null;
  embed_url: string | null;
  quality: string | null;
  language: string | null;
  health: SourceHealth;
  success_count: number;
  failure_count: number;
  startup_latency_ms: number | null;
  priority_score: number;
}

interface ProviderMappingRow extends QueryRow {
  id: string;
  canonical_movie_id: string;
}

interface CandidateRow extends QueryRow {
  id: string;
}

export interface CatalogFilters {
  query?: string;
  genre?: string;
  country?: string;
  year?: number;
  type?: MovieType;
  cinema?: boolean;
  limit?: number;
  offset?: number;
}

export interface CatalogPage {
  items: CanonicalMovieView[];
  total: number;
  elapsedMs: number;
}

export interface UpsertResult {
  canonicalMovieId: string;
  created: boolean;
  merged: boolean;
  reason: string;
  sourcesUpserted: number;
}

const MOVIE_SELECT = `
  m.*,
  (SELECT count(*)::int FROM provider_movies pm WHERE pm.canonical_movie_id = m.id) AS source_count,
  (
    SELECT e.episode_label
    FROM episodes e
    WHERE e.movie_id = m.id
    ORDER BY e.season_number DESC, e.episode_number DESC NULLS LAST, e.updated_at DESC
    LIMIT 1
  ) AS latest_episode_label
`;

function jsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function isoDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

function movieView(row: MovieRow): CanonicalMovieView {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    originalTitle: row.original_title,
    description: row.description,
    posterUrl: row.poster_url,
    backdropUrl: row.backdrop_url,
    year: row.year,
    type: row.type,
    status: row.status,
    durationMinutes: row.duration_minutes,
    quality: row.quality,
    language: row.language,
    genres: jsonArray<TaxonomyItem>(row.genres),
    countries: jsonArray<TaxonomyItem>(row.countries),
    directors: jsonArray<string>(row.directors),
    actors: jsonArray<string>(row.actors),
    totalEpisodes: row.total_episodes,
    currentEpisode: row.current_episode,
    isCinema: row.is_cinema,
    sourceCount: Number(row.source_count ?? 0),
    latestEpisodeLabel: row.latest_episode_label ?? null,
    updatedAt: isoDate(row.updated_at),
  };
}

function sourceView(row: SourceRow): EpisodeSourceView {
  return {
    id: row.id,
    provider: row.provider,
    serverName: row.server_name,
    streamType: row.stream_type,
    streamUrl: row.stream_url,
    embedUrl: row.embed_url,
    quality: row.quality,
    language: row.language,
    health: row.health,
    successCount: row.success_count,
    failureCount: row.failure_count,
    startupLatencyMs: row.startup_latency_ms,
    priorityScore: row.priority_score,
  };
}

function appendFilter(
  conditions: string[],
  params: SqlParameter[],
  expression: string,
  value: SqlParameter,
) {
  params.push(value);
  conditions.push(expression.replace("?", `$${params.length}`));
}

function boundedLimit(limit: number | undefined) {
  return Math.max(1, Math.min(60, Math.floor(limit ?? 24)));
}

export async function listMovies(filters: CatalogFilters = {}): Promise<CatalogPage> {
  const started = performance.now();
  const database = await getDatabase();
  const conditions: string[] = [];
  const params: SqlParameter[] = [];
  let rankExpression = "0";

  if (filters.query?.trim()) {
    const query = normalizeTitle(filters.query);
    if (query.length < 3) {
      appendFilter(
        conditions,
        params,
        "(m.normalized_title LIKE ? || '%' OR m.normalized_original_title LIKE ? || '%')",
        query,
      );
      params.push(query);
      conditions[conditions.length - 1] = conditions[conditions.length - 1].replace(
        "? || '%')",
        `$${params.length} || '%')`,
      );
      rankExpression = `CASE WHEN m.normalized_title = $${params.length - 1} THEN 100 ELSE 70 END`;
    } else {
      params.push(query);
      const position = params.length;
      conditions.push(`(
        m.normalized_title ILIKE '%' || $${position} || '%'
        OR coalesce(m.normalized_original_title, '') ILIKE '%' || $${position} || '%'
        OR m.search_text ILIKE '%' || $${position} || '%'
        OR to_tsvector('simple', m.search_text) @@ plainto_tsquery('simple', $${position})
      )`);
      rankExpression = `(
        CASE
          WHEN m.normalized_title = $${position} THEN 110
          WHEN m.normalized_title LIKE $${position} || '%' THEN 90
          ELSE 0
        END
        + (CASE WHEN m.normalized_title ILIKE '%' || $${position} || '%' THEN 1 ELSE 0 END) * 30
        + (CASE WHEN m.search_text ILIKE '%' || $${position} || '%' THEN 1 ELSE 0 END) * 20
        + ts_rank(to_tsvector('simple', m.search_text), plainto_tsquery('simple', $${position})) * 25
      )`;
    }
  }

  if (filters.genre) {
    appendFilter(
      conditions,
      params,
      "EXISTS (SELECT 1 FROM jsonb_array_elements(m.genres) item WHERE item->>'slug' = ?)",
      filters.genre,
    );
  }
  if (filters.country) {
    appendFilter(
      conditions,
      params,
      "EXISTS (SELECT 1 FROM jsonb_array_elements(m.countries) item WHERE item->>'slug' = ?)",
      filters.country,
    );
  }
  if (filters.year) appendFilter(conditions, params, "m.year = ?", filters.year);
  if (filters.type && filters.type !== "unknown") {
    appendFilter(conditions, params, "m.type = ?", filters.type);
  }
  if (filters.cinema !== undefined) {
    appendFilter(conditions, params, "m.is_cinema = ?", filters.cinema);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const count = await database.query<{ total: number | string }>(
    `SELECT count(*)::int AS total FROM canonical_movies m ${where}`,
    params,
  );

  params.push(boundedLimit(filters.limit));
  const limitPosition = params.length;
  params.push(Math.max(0, Math.floor(filters.offset ?? 0)));
  const offsetPosition = params.length;
  const order = filters.query?.trim()
    ? `search_rank DESC, m.updated_at DESC`
    : `m.updated_at DESC, m.title ASC`;

  const rows = await database.query<MovieRow>(
    `SELECT ${MOVIE_SELECT}, ${rankExpression} AS search_rank
     FROM canonical_movies m
     ${where}
     ORDER BY ${order}
     LIMIT $${limitPosition} OFFSET $${offsetPosition}`,
    params,
  );

  return {
    items: rows.rows.map(movieView),
    total: Number(count.rows[0]?.total ?? 0),
    elapsedMs: Number((performance.now() - started).toFixed(2)),
  };
}

export async function getHomeCatalog() {
  const [cinema, latest, singles, series, animation] = await Promise.all([
    listMovies({ cinema: true, limit: 16 }),
    listMovies({ limit: 18 }),
    listMovies({ type: "single", limit: 16 }),
    listMovies({ type: "series", limit: 16 }),
    listMovies({ type: "animation", limit: 16 }),
  ]);
  const hero = cinema.items[0] ?? latest.items[0] ?? null;
  return { hero, cinema, latest, singles, series, animation };
}

export async function getMovieBySlug(slug: string): Promise<MovieDetailView | null> {
  const database = await getDatabase();
  const movieResult = await database.query<MovieRow>(
    `SELECT ${MOVIE_SELECT} FROM canonical_movies m WHERE m.slug = $1 LIMIT 1`,
    [slug],
  );
  const movie = movieResult.rows[0];
  if (!movie) return null;

  const [episodeRows, sourceRows] = await Promise.all([
    database.query<EpisodeRow>(
      `SELECT id, episode_key, episode_label, episode_title, episode_number, season_number
       FROM episodes
       WHERE movie_id = $1
       ORDER BY season_number, episode_number NULLS LAST, episode_label`,
      [movie.id],
    ),
    database.query<SourceRow>(
      `SELECT s.id, s.episode_id, s.provider, s.server_name, s.stream_type,
              s.stream_url, s.embed_url, s.quality, s.language, s.health,
              s.success_count, s.failure_count, s.startup_latency_ms, s.priority_score
       FROM episode_sources s
       INNER JOIN episodes e ON e.id = s.episode_id
       WHERE e.movie_id = $1`,
      [movie.id],
    ),
  ]);

  const sourcesByEpisode = new Map<string, EpisodeSourceView[]>();
  for (const source of sourceRows.rows) {
    const group = sourcesByEpisode.get(source.episode_id) ?? [];
    group.push(sourceView(source));
    sourcesByEpisode.set(source.episode_id, group);
  }

  const episodesView: EpisodeView[] = episodeRows.rows.map((episode) => ({
    id: episode.id,
    episodeKey: episode.episode_key,
    episodeLabel: episode.episode_label,
    episodeTitle: episode.episode_title,
    episodeNumber: episode.episode_number,
    seasonNumber: episode.season_number,
    sources: sourcesByEpisode.get(episode.id) ?? [],
  }));

  return {
    ...movieView(movie),
    alternativeTitles: jsonArray<string>(movie.alternative_titles),
    episodes: episodesView,
  };
}

export async function getMovieById(id: string) {
  const database = await getDatabase();
  const result = await database.query<{ slug: string }>(
    "SELECT slug FROM canonical_movies WHERE id = $1 LIMIT 1",
    [id],
  );
  return result.rows[0] ? getMovieBySlug(result.rows[0].slug) : null;
}

interface TaxonomyRow extends QueryRow {
  slug: string;
  name: string;
  movie_count: number | string;
}

export async function getTaxonomyOptions(kind: "genres" | "countries") {
  const database = await getDatabase();
  const column = kind === "genres" ? "genres" : "countries";
  const rows = await database.query<TaxonomyRow>(`
    SELECT item->>'slug' AS slug, max(item->>'name') AS name, count(*)::int AS movie_count
    FROM canonical_movies m,
         jsonb_array_elements(m.${column}) item
    WHERE item->>'slug' IS NOT NULL AND item->>'slug' <> ''
    GROUP BY item->>'slug'
    ORDER BY movie_count DESC, name
  `);
  return rows.rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    movieCount: Number(row.movie_count),
  }));
}

interface MappingDebugRow extends QueryRow {
  provider: ProviderId;
  provider_movie_id: string;
  provider_slug: string;
  title: string;
  dedupe_reason: string;
  dedupe_confidence: number;
  is_cinema: boolean;
  last_synced_at: Date | string;
}

export async function getMovieDebug(id: string) {
  const database = await getDatabase();
  const [movie, mappings] = await Promise.all([
    getMovieById(id),
    database.query<MappingDebugRow>(
      `SELECT provider, provider_movie_id, provider_slug, title, dedupe_reason,
              dedupe_confidence, is_cinema, last_synced_at
       FROM provider_movies
       WHERE canonical_movie_id = $1
       ORDER BY provider`,
      [id],
    ),
  ]);
  return {
    movie,
    mappings: mappings.rows.map((mapping) => ({
      provider: mapping.provider,
      providerMovieId: mapping.provider_movie_id,
      providerSlug: mapping.provider_slug,
      title: mapping.title,
      dedupeReason: mapping.dedupe_reason,
      dedupeConfidence: mapping.dedupe_confidence,
      isCinema: mapping.is_cinema,
      lastSyncedAt: isoDate(mapping.last_synced_at),
    })),
  };
}

export async function getRelatedMovies(movie: MovieDetailView, limit = 12) {
  const primaryGenre = movie.genres[0]?.slug;
  const result = await listMovies({
    genre: primaryGenre,
    type: movie.type,
    limit: Math.min(30, limit + 1),
  });
  return result.items.filter((item) => item.id !== movie.id).slice(0, limit);
}

function unionStrings(...groups: string[][]) {
  return [...new Set(groups.flat().map((value) => value.trim()).filter(Boolean))];
}

function unionTaxonomy(...groups: TaxonomyItem[][]) {
  const items = new Map<string, TaxonomyItem>();
  for (const item of groups.flat()) items.set(item.slug, item);
  return [...items.values()];
}

function preferDescription(current: string | null, incoming: string | null) {
  if (!current) return incoming;
  if (!incoming) return current;
  return incoming.length > current.length ? incoming : current;
}

function makeSearchText(input: {
  title: string;
  originalTitle: string | null;
  alternativeTitles: string[];
  actors: string[];
  directors: string[];
  year: number | null;
}) {
  return normalizeTitle(
    [
      input.title,
      input.originalTitle,
      ...input.alternativeTitles,
      ...input.actors,
      ...input.directors,
      input.year,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function mergedMovie(current: MovieRow, incoming: ProviderMovieInput) {
  const alternativeTitles = unionStrings(
    jsonArray<string>(current.alternative_titles),
    incoming.alternativeTitles,
    incoming.originalTitle && incoming.originalTitle !== current.original_title
      ? [incoming.originalTitle]
      : [],
  );
  const actors = unionStrings(jsonArray<string>(current.actors), incoming.actors);
  const directors = unionStrings(jsonArray<string>(current.directors), incoming.directors);
  const genres = unionTaxonomy(jsonArray<TaxonomyItem>(current.genres), incoming.genres);
  const countries = unionTaxonomy(
    jsonArray<TaxonomyItem>(current.countries),
    incoming.countries,
  );
  const evidence = incoming.isCinema && incoming.cinemaEvidence
    ? [`${incoming.provider}:${incoming.cinemaEvidence}`]
    : [];
  const cinemaEvidence = unionStrings(
    jsonArray<string>(current.cinema_evidence),
    evidence,
  );
  const title = current.title || incoming.title;
  const originalTitle = current.original_title ?? incoming.originalTitle;
  const year = current.year ?? incoming.year;
  const merged = {
    title,
    normalizedTitle: normalizeTitle(title),
    originalTitle,
    normalizedOriginalTitle: normalizeTitle(originalTitle) || null,
    alternativeTitles,
    description: preferDescription(current.description, incoming.description),
    posterUrl: current.poster_url ?? incoming.posterUrl,
    backdropUrl: current.backdrop_url ?? incoming.backdropUrl,
    year,
    type: current.type === "unknown" ? incoming.type : current.type,
    status: incoming.status ?? current.status,
    durationMinutes: current.duration_minutes ?? incoming.durationMinutes,
    quality: incoming.quality ?? current.quality,
    language: incoming.language ?? current.language,
    genres,
    countries,
    directors,
    actors,
    totalEpisodes: Math.max(current.total_episodes ?? 0, incoming.totalEpisodes ?? 0) || null,
    currentEpisode: incoming.currentEpisode ?? current.current_episode,
    tmdbId: current.tmdb_id ?? incoming.externalIds.tmdbId,
    imdbId: current.imdb_id ?? incoming.externalIds.imdbId,
    isCinema: current.is_cinema || incoming.isCinema,
    cinemaEvidence,
  };
  return {
    ...merged,
    searchText: makeSearchText(merged),
  };
}

async function uniqueSlug(
  transaction: SqlExecutor,
  movie: ProviderMovieInput,
) {
  const base = canonicalSlug(movie.title, movie.year);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = attempt === 0 ? undefined : `${movie.provider}-${attempt + 1}`;
    const slug = canonicalSlug(movie.title, movie.year, suffix);
    const found = await transaction.query<{ id: string }>(
      "SELECT id FROM canonical_movies WHERE slug = $1 LIMIT 1",
      [slug],
    );
    if (!found.rows[0]) return slug;
  }
  return `${base}-${randomUUID().slice(0, 8)}`;
}

async function findCandidate(transaction: SqlExecutor, movie: ProviderMovieInput) {
  const externalConditions: string[] = [];
  const externalParams: SqlParameter[] = [];
  if (movie.externalIds.tmdbId) {
    externalParams.push(movie.externalIds.tmdbId);
    externalConditions.push(`tmdb_id = $${externalParams.length}`);
  }
  if (movie.externalIds.imdbId) {
    externalParams.push(movie.externalIds.imdbId);
    externalConditions.push(`lower(imdb_id) = lower($${externalParams.length})`);
  }
  if (externalConditions.length) {
    const result = await transaction.query<CandidateRow>(
      `SELECT id FROM canonical_movies WHERE ${externalConditions.join(" OR ")} LIMIT 1`,
      externalParams,
    );
    if (result.rows[0]) return { ...result.rows[0], reason: "external-id", confidence: 1 };
  }

  if (movie.year !== null && movie.type !== "unknown") {
    const normalizedOriginal = normalizeTitle(movie.originalTitle);
    if (normalizedOriginal) {
      const result = await transaction.query<CandidateRow>(
        `SELECT id FROM canonical_movies
         WHERE normalized_original_title = $1 AND year = $2 AND type = $3
         LIMIT 1`,
        [normalizedOriginal, movie.year, movie.type],
      );
      if (result.rows[0]) {
        return { ...result.rows[0], reason: "original-title-year-type", confidence: 0.98 };
      }
    }

    const normalized = normalizeTitle(movie.title);
    const result = await transaction.query<CandidateRow>(
      `SELECT id FROM canonical_movies
       WHERE normalized_title = $1 AND year = $2 AND type = $3
       LIMIT 1`,
      [normalized, movie.year, movie.type],
    );
    if (result.rows[0]) {
      return { ...result.rows[0], reason: "title-year-type", confidence: 0.96 };
    }
  }

  return null;
}

async function insertCanonical(transaction: SqlExecutor, movie: ProviderMovieInput) {
  const id = randomUUID();
  const slug = await uniqueSlug(transaction, movie);
  const evidence = movie.isCinema && movie.cinemaEvidence
    ? [`${movie.provider}:${movie.cinemaEvidence}`]
    : [];
  const searchText = makeSearchText({
    title: movie.title,
    originalTitle: movie.originalTitle,
    alternativeTitles: movie.alternativeTitles,
    actors: movie.actors,
    directors: movie.directors,
    year: movie.year,
  });
  await transaction.query(
    `INSERT INTO canonical_movies (
      id, slug, title, normalized_title, original_title, normalized_original_title,
      alternative_titles, description, poster_url, backdrop_url, year, type, status,
      duration_minutes, quality, language, genres, countries, directors, actors,
      total_episodes, current_episode, tmdb_id, imdb_id, is_cinema, cinema_evidence,
      search_text
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13,
      $14, $15, $16, $17::jsonb, $18::jsonb, $19::jsonb, $20::jsonb,
      $21, $22, $23, $24, $25, $26::jsonb, $27
    )`,
    [
      id,
      slug,
      movie.title,
      normalizeTitle(movie.title),
      movie.originalTitle,
      normalizeTitle(movie.originalTitle) || null,
      JSON.stringify(movie.alternativeTitles),
      movie.description,
      movie.posterUrl,
      movie.backdropUrl,
      movie.year,
      movie.type,
      movie.status,
      movie.durationMinutes,
      movie.quality,
      movie.language,
      JSON.stringify(movie.genres),
      JSON.stringify(movie.countries),
      JSON.stringify(movie.directors),
      JSON.stringify(movie.actors),
      movie.totalEpisodes,
      movie.currentEpisode,
      movie.externalIds.tmdbId,
      movie.externalIds.imdbId,
      movie.isCinema,
      JSON.stringify(evidence),
      searchText,
    ],
  );
  return id;
}

async function updateCanonical(
  transaction: SqlExecutor,
  canonicalMovieId: string,
  movie: ProviderMovieInput,
) {
  const current = await transaction.query<MovieRow>(
    "SELECT * FROM canonical_movies WHERE id = $1 LIMIT 1",
    [canonicalMovieId],
  );
  const row = current.rows[0];
  if (!row) throw new Error(`Canonical movie ${canonicalMovieId} disappeared`);
  const merged = mergedMovie(row, movie);
  await transaction.query(
    `UPDATE canonical_movies SET
      title = $2, normalized_title = $3, original_title = $4,
      normalized_original_title = $5, alternative_titles = $6::jsonb,
      description = $7, poster_url = $8, backdrop_url = $9, year = $10,
      type = $11, status = $12, duration_minutes = $13, quality = $14,
      language = $15, genres = $16::jsonb, countries = $17::jsonb,
      directors = $18::jsonb, actors = $19::jsonb, total_episodes = $20,
      current_episode = $21, tmdb_id = $22, imdb_id = $23, is_cinema = $24,
      cinema_evidence = $25::jsonb, search_text = $26, updated_at = now()
     WHERE id = $1`,
    [
      canonicalMovieId,
      merged.title,
      merged.normalizedTitle,
      merged.originalTitle,
      merged.normalizedOriginalTitle,
      JSON.stringify(merged.alternativeTitles),
      merged.description,
      merged.posterUrl,
      merged.backdropUrl,
      merged.year,
      merged.type,
      merged.status,
      merged.durationMinutes,
      merged.quality,
      merged.language,
      JSON.stringify(merged.genres),
      JSON.stringify(merged.countries),
      JSON.stringify(merged.directors),
      JSON.stringify(merged.actors),
      merged.totalEpisodes,
      merged.currentEpisode,
      merged.tmdbId,
      merged.imdbId,
      merged.isCinema,
      JSON.stringify(merged.cinemaEvidence),
      merged.searchText,
    ],
  );
}

async function upsertEpisodes(
  transaction: SqlExecutor,
  canonicalMovieId: string,
  detail: ProviderDetail,
) {
  let sourcesUpserted = 0;
  for (const source of detail.episodes) {
    const season = source.seasonNumber ?? 0;
    const existing = await transaction.query<{ id: string }>(
      `SELECT id FROM episodes
       WHERE movie_id = $1 AND season_number = $2 AND episode_key = $3
       LIMIT 1`,
      [canonicalMovieId, season, source.episodeKey],
    );
    const episodeId = existing.rows[0]?.id ?? randomUUID();
    await transaction.query(
      `INSERT INTO episodes (
        id, movie_id, season_number, episode_key, episode_label,
        episode_title, episode_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (movie_id, season_number, episode_key) DO UPDATE SET
        episode_label = EXCLUDED.episode_label,
        episode_title = coalesce(EXCLUDED.episode_title, episodes.episode_title),
        episode_number = coalesce(EXCLUDED.episode_number, episodes.episode_number),
        updated_at = now()`,
      [
        episodeId,
        canonicalMovieId,
        season,
        source.episodeKey,
        source.episodeLabel,
        source.episodeTitle,
        source.episodeNumber,
      ],
    );

    const sourceKey = createHash("sha1")
      .update(
        [
          source.provider,
          source.serverName,
          source.streamUrl ?? "",
          source.embedUrl ?? "",
        ].join("|"),
      )
      .digest("hex");
    const priorityScore = source.streamType === "hls"
      ? 20
      : source.streamType === "mp4"
        ? 15
        : source.streamType === "embed"
          ? 5
          : 0;
    await transaction.query(
      `INSERT INTO episode_sources (
        id, source_key, episode_id, provider, server_name, stream_type,
        stream_url, embed_url, quality, language, priority_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (episode_id, source_key) DO UPDATE SET
        server_name = EXCLUDED.server_name,
        stream_type = EXCLUDED.stream_type,
        stream_url = EXCLUDED.stream_url,
        embed_url = EXCLUDED.embed_url,
        quality = EXCLUDED.quality,
        language = EXCLUDED.language,
        priority_score = EXCLUDED.priority_score,
        updated_at = now()`,
      [
        randomUUID(),
        sourceKey,
        episodeId,
        source.provider,
        source.serverName,
        source.streamType,
        source.streamUrl,
        source.embedUrl,
        source.quality,
        source.language,
        priorityScore,
      ],
    );
    sourcesUpserted += 1;
  }
  return sourcesUpserted;
}

export async function upsertProviderMovie(
  movie: ProviderMovieInput,
  detail?: ProviderDetail,
): Promise<UpsertResult> {
  const database = await getDatabase();
  return database.transaction(async (transaction) => {
    const mapping = await transaction.query<ProviderMappingRow>(
      `SELECT id, canonical_movie_id FROM provider_movies
       WHERE provider = $1 AND (provider_movie_id = $2 OR provider_slug = $3)
       ORDER BY provider_movie_id = $2 DESC
       LIMIT 1`,
      [movie.provider, movie.providerMovieId, movie.providerSlug],
    );

    let canonicalMovieId = mapping.rows[0]?.canonical_movie_id;
    let created = false;
    let reason = "provider-identity";
    let confidence = 1;

    if (!canonicalMovieId) {
      const candidate = await findCandidate(transaction, movie);
      if (candidate) {
        canonicalMovieId = candidate.id;
        reason = candidate.reason;
        confidence = candidate.confidence;
      } else {
        canonicalMovieId = await insertCanonical(transaction, movie);
        created = true;
        reason = "new-canonical";
        confidence = 1;
      }
    }

    if (!created) await updateCanonical(transaction, canonicalMovieId, movie);

    await transaction.query(
      `INSERT INTO provider_movies (
        id, provider, provider_movie_id, provider_slug, canonical_movie_id,
        title, original_title, year, type, is_cinema, dedupe_reason,
        dedupe_confidence, raw, provider_updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14)
      ON CONFLICT (provider, provider_movie_id) DO UPDATE SET
        provider_slug = EXCLUDED.provider_slug,
        canonical_movie_id = EXCLUDED.canonical_movie_id,
        title = EXCLUDED.title,
        original_title = EXCLUDED.original_title,
        year = EXCLUDED.year,
        type = EXCLUDED.type,
        is_cinema = EXCLUDED.is_cinema,
        dedupe_reason = EXCLUDED.dedupe_reason,
        dedupe_confidence = EXCLUDED.dedupe_confidence,
        raw = EXCLUDED.raw,
        provider_updated_at = EXCLUDED.provider_updated_at,
        last_synced_at = now()`,
      [
        mapping.rows[0]?.id ?? randomUUID(),
        movie.provider,
        movie.providerMovieId,
        movie.providerSlug,
        canonicalMovieId,
        movie.title,
        movie.originalTitle,
        movie.year,
        movie.type,
        movie.isCinema,
        reason,
        confidence,
        JSON.stringify(movie.raw),
        movie.providerUpdatedAt,
      ],
    );

    const sourcesUpserted = detail
      ? await upsertEpisodes(transaction, canonicalMovieId, detail)
      : 0;
    return {
      canonicalMovieId,
      created,
      merged: !created && reason !== "provider-identity",
      reason,
      sourcesUpserted,
    };
  });
}

export async function recordPlaybackFeedback(input: {
  sourceId: string;
  success: boolean;
  startupLatencyMs?: number | null;
  error?: string | null;
}) {
  const database = await getDatabase();
  const latency = input.startupLatencyMs === null || input.startupLatencyMs === undefined
    ? null
    : Math.max(0, Math.min(120_000, Math.round(input.startupLatencyMs)));
  const error = input.error?.slice(0, 500) ?? null;
  const result = await database.query<{ id: string }>(
    `UPDATE episode_sources SET
      success_count = success_count + CASE WHEN $2 THEN 1 ELSE 0 END,
      failure_count = failure_count + CASE WHEN $2 THEN 0 ELSE 1 END,
      startup_latency_ms = CASE
        WHEN $2 AND $3::int IS NOT NULL AND startup_latency_ms IS NOT NULL
          THEN round((startup_latency_ms * 0.7) + ($3::int * 0.3))::int
        WHEN $2 AND $3::int IS NOT NULL THEN $3::int
        ELSE startup_latency_ms
      END,
      health = CASE
        WHEN $2 THEN 'healthy'
        WHEN failure_count + 1 >= 3 AND success_count = 0 THEN 'unavailable'
        ELSE 'degraded'
      END,
      last_error = CASE WHEN $2 THEN NULL ELSE $4 END,
      last_checked_at = now(),
      updated_at = now()
     WHERE id = $1
     RETURNING id`,
    [input.sourceId, input.success, latency, error],
  );
  return Boolean(result.rows[0]);
}

export async function updateSyncState(input: {
  provider: ProviderId;
  status: SourceHealth;
  checkpointPage: number;
  fullSyncCompleted: boolean;
  latencyMs?: number | null;
  error?: string | null;
  stats?: Record<string, number>;
}) {
  const database = await getDatabase();
  await database.query(
    `INSERT INTO provider_sync_states (
      provider, status, checkpoint_page, full_sync_completed, last_successful_sync,
      last_attempt_at, latency_ms, consecutive_failures, last_error, stats
    ) VALUES (
      $1, $2, $3, $4, CASE WHEN $2 IN ('healthy', 'degraded') THEN now() ELSE NULL END,
      now(), $5, CASE WHEN $2 = 'unavailable' THEN 1 ELSE 0 END, $6, $7::jsonb
    )
    ON CONFLICT (provider) DO UPDATE SET
      status = EXCLUDED.status,
      checkpoint_page = EXCLUDED.checkpoint_page,
      full_sync_completed = EXCLUDED.full_sync_completed,
      last_successful_sync = CASE
        WHEN EXCLUDED.status IN ('healthy', 'degraded') THEN now()
        ELSE provider_sync_states.last_successful_sync
      END,
      last_attempt_at = now(),
      latency_ms = EXCLUDED.latency_ms,
      consecutive_failures = CASE
        WHEN EXCLUDED.status = 'unavailable' THEN provider_sync_states.consecutive_failures + 1
        ELSE 0
      END,
      last_error = EXCLUDED.last_error,
      stats = EXCLUDED.stats,
      updated_at = now()`,
    [
      input.provider,
      input.status,
      Math.max(1, input.checkpointPage),
      input.fullSyncCompleted,
      input.latencyMs ?? null,
      input.error?.slice(0, 1_000) ?? null,
      JSON.stringify(input.stats ?? {}),
    ],
  );
}

interface SyncStateRow extends QueryRow {
  checkpoint_page: number;
  full_sync_completed: boolean;
}

export async function getSyncState(provider: ProviderId) {
  const database = await getDatabase();
  const result = await database.query<SyncStateRow>(
    `SELECT checkpoint_page, full_sync_completed
     FROM provider_sync_states
     WHERE provider = $1
     LIMIT 1`,
    [provider],
  );
  return {
    checkpointPage: result.rows[0]?.checkpoint_page ?? 1,
    fullSyncCompleted: result.rows[0]?.full_sync_completed ?? false,
  };
}

interface ProviderStatsRow extends QueryRow {
  provider: ProviderId;
  status: SourceHealth;
  latency_ms: number | null;
  last_successful_sync: Date | string | null;
  last_error: string | null;
  movie_count: number | string;
}

export async function getProviderStats() {
  const database = await getDatabase();
  const rows = await database.query<ProviderStatsRow>(`
    SELECT
      s.provider,
      s.status,
      s.latency_ms,
      s.last_successful_sync,
      s.last_error,
      count(pm.id)::int AS movie_count
    FROM provider_sync_states s
    LEFT JOIN provider_movies pm ON pm.provider = s.provider
    GROUP BY s.provider, s.status, s.latency_ms, s.last_successful_sync, s.last_error
    ORDER BY s.provider
  `);
  return rows.rows.map((row) => ({
    provider: row.provider,
    status: row.status,
    latencyMs: row.latency_ms,
    lastSuccessfulSync: row.last_successful_sync
      ? isoDate(row.last_successful_sync)
      : null,
    lastError: row.last_error,
    movieCount: Number(row.movie_count),
  }));
}

export async function catalogCounts(database?: DatabaseClient) {
  const client = database ?? (await getDatabase());
  const result = await client.query<{
    movies: number | string;
    mappings: number | string;
    episodes: number | string;
    sources: number | string;
  }>(`
    SELECT
      (SELECT count(*) FROM canonical_movies) AS movies,
      (SELECT count(*) FROM provider_movies) AS mappings,
      (SELECT count(*) FROM episodes) AS episodes,
      (SELECT count(*) FROM episode_sources) AS sources
  `);
  const row = result.rows[0];
  return {
    movies: Number(row?.movies ?? 0),
    mappings: Number(row?.mappings ?? 0),
    episodes: Number(row?.episodes ?? 0),
    sources: Number(row?.sources ?? 0),
  };
}
