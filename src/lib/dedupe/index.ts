import type { MovieType, ProviderMovieInput } from "@/types/catalog";
import { normalizeTitle } from "@/providers/shared/normalize";

export type DedupeReason = "tmdb" | "imdb" | "original-title" | "title";

export interface DedupeMatch {
  index: number;
  confidence: 1 | 0.98 | 0.96;
  reason: DedupeReason;
}

function sameYear(left: number | null, right: number | null) {
  return left !== null && right !== null && left === right;
}

function compatibleType(left: MovieType, right: MovieType) {
  return left !== "unknown" && right !== "unknown" && left === right;
}

export function findDeterministicMatch(
  existing: ProviderMovieInput[],
  incoming: ProviderMovieInput,
): DedupeMatch | null {
  const tmdbId = incoming.externalIds.tmdbId?.trim();
  if (tmdbId) {
    const index = existing.findIndex(
      (movie) => movie.externalIds.tmdbId?.trim() === tmdbId,
    );
    if (index >= 0) return { index, confidence: 1, reason: "tmdb" };
  }

  const imdbId = incoming.externalIds.imdbId?.trim().toLowerCase();
  if (imdbId) {
    const index = existing.findIndex(
      (movie) => movie.externalIds.imdbId?.trim().toLowerCase() === imdbId,
    );
    if (index >= 0) return { index, confidence: 1, reason: "imdb" };
  }

  if (incoming.year !== null && incoming.type !== "unknown") {
    const originalTitle = normalizeTitle(incoming.originalTitle);
    if (originalTitle) {
      const index = existing.findIndex(
        (movie) =>
          sameYear(movie.year, incoming.year) &&
          compatibleType(movie.type, incoming.type) &&
          normalizeTitle(movie.originalTitle) === originalTitle,
      );
      if (index >= 0) {
        return { index, confidence: 0.98, reason: "original-title" };
      }
    }

    const title = normalizeTitle(incoming.title);
    if (title) {
      const index = existing.findIndex(
        (movie) =>
          sameYear(movie.year, incoming.year) &&
          compatibleType(movie.type, incoming.type) &&
          normalizeTitle(movie.title) === title,
      );
      if (index >= 0) return { index, confidence: 0.96, reason: "title" };
    }
  }

  return null;
}
