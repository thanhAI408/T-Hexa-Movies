# T-Hexa Movies — Architecture Decision Record

Updated: 2026-08-10

## Product boundary

T-Hexa Movies is a local-first, read-heavy movie catalog and player. Provider APIs are ingestion inputs, never page-render dependencies. The browser fetches video directly from provider/CDN URLs; the application only serves metadata, search results, source rankings, and playback-health feedback.

```text
Public provider APIs
        ↓
bounded sync → validate → normalize → conservative dedupe
        ↓
canonical PostgreSQL-compatible catalog
        ↓
Next.js Server Components / search API
        ↓
browser player → provider CDN directly
```

## 1. PostgreSQL local?

Yes in the target architecture, but not as a hard requirement for local startup.

- `docker` is installed on this machine, but the Docker Desktop Linux daemon is not running and no native `psql` is installed.
- Local development therefore defaults to **PGlite**, a file-backed WASM build of PostgreSQL.
- PGlite supports the same Drizzle `pg-core` schema and the required `pg_trgm` and `unaccent` extensions. This is a closer fallback than SQLite and avoids maintaining two SQL dialects.
- `DATABASE_URL` switches the same repository to PostgreSQL 16 (Docker now, managed PostgreSQL later).
- Migrations remain PostgreSQL migrations in source control.

PGlite is a development fallback only. A Vercel deployment must set `DATABASE_URL`; serverless functions must not persist catalog data to a local filesystem.

## 2. Redis now?

No. The database, short in-process request coalescing, HTTP cache headers, and React/Next request memoization are sufficient for the local workload. Redis is only justified later by measured multi-instance cache or coordination needs. Sync checkpoints and source health belong in PostgreSQL, not Redis.

## 3. Realtime fan-out for pages or search?

No. Homepage, cinema, detail, and search query the normalized local catalog. Provider calls happen only in explicit sync/health commands or a bounded refresh path. A failed provider must not delay or crash browsing.

## 4. Safest dedupe strategy

Automatic merges stop at high-confidence deterministic evidence:

1. exact TMDB/IMDb ID;
2. normalized original title + year + movie type;
3. normalized Vietnamese title + year + movie type.

Vietnamese normalization uses Unicode NFKD, diacritic removal, punctuation/space normalization, and consistent season tokens (`phần 2`, `season 2`, `s2`). Fuzzy similarity produces review candidates only; it never destructively merges on its own. Ambiguous records remain separate.

Provider identity is independently protected by a unique `(provider, providerMovieId)` constraint and a unique `(provider, providerSlug)` constraint.

## 5. Smart Source Router: client or server?

Hybrid:

- server/database: stable provider health, recent success/failure counts, average startup latency, format and quality metadata;
- client: current-browser HLS events, startup time, fatal errors, buffering, and immediate failover.

The server returns a ranked list. The client may override it using current-session evidence, keeps a tried-source set, and never loops A → B → A. Playback feedback is bounded and contains a source ID plus measurements, never an arbitrary URL for the server to fetch.

## 6. Direct stream vs embed

Preference order is direct HLS, direct MP4, then embed. HLS uses native playback where supported and `hls.js` elsewhere. Embed sources use a sandboxed iframe and cannot promise seek-preserving failover. URL schemes and hosts are validated from provider responses.

Verified provider behavior before implementation:

- VSMOV currently exposes iframe embeds in sampled details, not direct HLS/MP4.
- OPhim exposes both `link_m3u8` and `link_embed`; sampled HLS was browser-readable, while some stream hosts were stale or frame-restricted.
- NguonC currently exposes embeds in sampled details.
- KKPhim/PhimAPI is verified separately before its adapter is finalized.

## 7. Avoiding application video bandwidth

There is no video proxy, downloader, rehoster, token bypass, or arbitrary server-side URL fetch. Metadata flows through Next.js; media flows from the browser to the provider/CDN. Incompatible sources are degraded and skipped.

## 8. Vercel + Singapore PostgreSQL later

- Next.js App Router and Node.js runtime stay unchanged.
- Drizzle uses the same PostgreSQL schema and migrations.
- Local `PGLITE_DATA_DIR` is replaced by a Singapore-region `DATABASE_URL`.
- Sync commands run as an external scheduled worker/job rather than inside a short request.
- Provider base URLs, timeouts, concurrency, and feature switches come from environment variables.
- No persistent local files, Redis dependency, or video proxy are assumed by the production path.

## 9. Largest risks

1. provider API/stream-host churn;
2. external stream CORS, TLS, frame, token, or hotlink rules;
3. inconsistent metadata causing missed or wrong dedupe;
4. `phim chiếu rạp` semantics differing between providers;
5. a full catalog sync being too large for a request-oriented/serverless runtime.

Mitigations are provider-local schemas/fixtures, contract tests, conservative merging, positive cinema evidence only, bounded concurrency/retries, checkpoints, source health, and graceful degradation.

## 10. Improvements over the initial proposal

- PGlite is used instead of a separate SQLite schema, retaining PostgreSQL semantics and extensions without requiring Docker.
- Sync is two-phase: catalog pages first, then bounded detail/episode hydration. This makes initial browsing useful quickly and keeps the job restartable.
- Cinema is a provenance-backed flag. It is set only from an official provider field/list; title heuristics are forbidden.
- Fuzzy matching is review-only, reducing catastrophic false merges.
- Source ranking is hybrid and measurement-driven, while failover remains local and immediate.
- The UI uses Server Components for catalog reads; only search interaction, history, filters, and player controls ship client JavaScript.

## Data model

- `canonical_movies`: the single user-visible movie, normalized/search fields, canonical metadata, positive cinema provenance.
- `provider_movies`: raw-provider identity and sync metadata mapped to one canonical movie.
- `episodes`: canonical `(movie, season, episodeKey)` rows.
- `episode_sources`: provider/server/URL/format plus aggregate health signals.
- `provider_sync_states`: checkpoint, counts, latency, failures, and last success.

Genres, countries, actors, and directors are stored as JSONB arrays for the first release, with normalized searchable text and appropriate GIN/trigram indexes. This keeps ingestion simple without scanning the catalog in JavaScript; they can be promoted to relation tables if later features need entity pages.

## Sync and resilience

- one shared HTTP client: `AbortController` timeout, limited retries, exponential backoff with jitter, provider-local concurrency limit, normalized errors, and a light circuit breaker;
- idempotent upserts and transactions;
- per-provider/page checkpoints;
- failures are isolated and summarized; one provider never terminates the whole sync;
- deterministic fixture tests never use the network; live smoke tests are separate.

## Search

Search uses normalized Vietnamese columns, prefix matching, PostgreSQL full-text ranking, and `pg_trgm` similarity with indexes. It covers title, original title, aliases, year, actors, and directors. The client debounces for 200 ms, aborts stale requests, supports keyboard navigation, and never calls providers.

## Local testing contract

The release gate is lint + typecheck + deterministic unit/contract/integration tests + production build + Playwright E2E + real browser inspection. External playback results are reported honestly; a public HLS test stream validates player mechanics if provider policy blocks automation.
