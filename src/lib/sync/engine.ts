import pLimit from "p-limit";

import {
  getSyncState,
  updateSyncState,
  upsertProviderMovie,
} from "@/lib/catalog/repository";
import { providers } from "@/providers";
import type { MovieProvider } from "@/providers/types";
import type { ProviderMovieInput } from "@/types/catalog";

export type SyncMode = "full" | "incremental" | "sample";

export interface SyncStats {
  fetched: number;
  inserted: number;
  updated: number;
  merged: number;
  skipped: number;
  failed: number;
  sources: number;
  pages: number;
  durationMs: number;
}

type MutableStats = Omit<SyncStats, "durationMs">;

function emptyStats(): MutableStats {
  return {
    fetched: 0,
    inserted: 0,
    updated: 0,
    merged: 0,
    skipped: 0,
    failed: 0,
    sources: 0,
    pages: 0,
  };
}

function pageLimit(mode: SyncMode, totalPages: number) {
  const explicit = Number(process.env.SYNC_MAX_PAGES ?? "");
  if (Number.isFinite(explicit) && explicit > 0) {
    return Math.min(totalPages, Math.floor(explicit));
  }
  if (mode === "sample") return 1;
  if (mode === "incremental") return Math.min(3, totalPages);
  return totalPages;
}

function detailLimit(mode: SyncMode) {
  const explicit = Number(process.env.SYNC_DETAIL_LIMIT ?? "48");
  const configured = Number.isFinite(explicit) && explicit >= 0 ? Math.floor(explicit) : 48;
  if (mode === "sample") return Math.min(8, configured || 8);
  if (mode === "incremental") return Math.min(32, configured);
  return configured;
}

async function persistMovie(
  movie: ProviderMovieInput,
  stats: MutableStats,
) {
  try {
    const result = await upsertProviderMovie(movie);
    if (result.created) stats.inserted += 1;
    else stats.updated += 1;
    if (result.merged) stats.merged += 1;
  } catch (error) {
    stats.failed += 1;
    console.warn(
      `[SYNC][${movie.provider.toUpperCase()}] skipped ${movie.providerSlug}: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

async function hydrateMovie(
  provider: MovieProvider,
  movie: ProviderMovieInput,
  stats: MutableStats,
) {
  try {
    const detail = await provider.getMovie(movie.providerSlug);
    if (!detail) {
      stats.skipped += 1;
      return;
    }
    const result = await upsertProviderMovie(detail.movie, detail);
    stats.sources += result.sourcesUpserted;
  } catch (error) {
    stats.failed += 1;
    console.warn(
      `[SYNC][${provider.id.toUpperCase()}] detail ${movie.providerSlug} failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

async function safeCinema(provider: MovieProvider) {
  try {
    return await provider.getCinemaMovies(1, 24);
  } catch (error) {
    console.warn(
      `[SYNC][${provider.id.toUpperCase()}] cinema feed unavailable: ${error instanceof Error ? error.message : "unknown error"}`,
    );
    return null;
  }
}

export async function syncProvider(provider: MovieProvider, mode: SyncMode) {
  const started = performance.now();
  const stats = emptyStats();
  const concurrency = Math.max(
    1,
    Math.min(8, Number(process.env.PROVIDER_CONCURRENCY ?? 4) || 4),
  );
  const limit = pLimit(concurrency);
  const state = await getSyncState(provider.id);
  const startPage = mode === "full" && !state.fullSyncCompleted
    ? Math.max(1, state.checkpointPage)
    : 1;
  const hydrateCandidates = new Map<string, ProviderMovieInput>();
  let checkpointPage = startPage;
  let fullSyncCompleted = false;

  console.log(`[SYNC][${provider.id.toUpperCase()}] ${mode} sync from page ${startPage}`);

  try {
    const first = await provider.getLatest(startPage, 24);
    const maximumPage = pageLimit(mode, Math.max(1, first.pagination.totalPages));

    for (let page = startPage; page <= maximumPage; page += 1) {
      const result = page === startPage ? first : await provider.getLatest(page, 24);
      if (page > 1 && result.pagination.currentPage !== page) {
        console.warn(
          `[SYNC][${provider.id.toUpperCase()}] stopped: requested page ${page}, provider returned ${result.pagination.currentPage}`,
        );
        break;
      }

      stats.fetched += result.items.length;
      stats.pages += 1;
      await Promise.all(result.items.map((movie) => limit(() => persistMovie(movie, stats))));
      for (const movie of result.items) {
        if (hydrateCandidates.size < detailLimit(mode)) {
          hydrateCandidates.set(movie.providerMovieId, movie);
        }
      }

      checkpointPage = page + 1;
      await updateSyncState({
        provider: provider.id,
        status: "healthy",
        checkpointPage,
        fullSyncCompleted: false,
        stats,
      });
      console.log(
        `[SYNC][${provider.id.toUpperCase()}] page ${page}/${maximumPage}: ${result.items.length} items`,
      );

      if (result.items.length === 0 || page >= result.pagination.totalPages) {
        fullSyncCompleted = mode === "full";
        break;
      }
    }

    const cinema = await safeCinema(provider);
    if (cinema) {
      stats.fetched += cinema.items.length;
      await Promise.all(cinema.items.map((movie) => limit(() => persistMovie(movie, stats))));
      for (const movie of cinema.items) hydrateCandidates.set(movie.providerMovieId, movie);
    }

    const candidates = [...hydrateCandidates.values()].slice(0, detailLimit(mode) + 24);
    await Promise.all(candidates.map((movie) => limit(() => hydrateMovie(provider, movie, stats))));

    const durationMs = Math.round(performance.now() - started);
    const status = stats.failed > 0 ? "degraded" : "healthy";
    await updateSyncState({
      provider: provider.id,
      status,
      checkpointPage,
      fullSyncCompleted,
      latencyMs: durationMs,
      stats,
    });
    return { ...stats, durationMs } satisfies SyncStats;
  } catch (error) {
    const durationMs = Math.round(performance.now() - started);
    await updateSyncState({
      provider: provider.id,
      status: "unavailable",
      checkpointPage,
      fullSyncCompleted: false,
      latencyMs: durationMs,
      error: error instanceof Error ? error.message : "unknown sync failure",
      stats,
    });
    console.error(
      `[SYNC][${provider.id.toUpperCase()}] unavailable: ${error instanceof Error ? error.message : "unknown failure"}`,
    );
    return { ...stats, failed: stats.failed + 1, durationMs } satisfies SyncStats;
  }
}

export async function syncAll(mode: SyncMode) {
  const results = new Map<string, SyncStats>();
  for (const provider of providers) {
    results.set(provider.id, await syncProvider(provider, mode));
  }
  return results;
}
