import { describe, expect, it } from "vitest";

import { findDeterministicMatch } from "@/lib/dedupe";
import type { ProviderMovieInput } from "@/types/catalog";

function movie(
  overrides: Partial<ProviderMovieInput> = {},
): ProviderMovieInput {
  return {
    provider: "vsmov",
    providerMovieId: "vsmov-1",
    providerSlug: "lightyear",
    title: "Lightyear: Cảnh Sát Vũ Trụ",
    originalTitle: "Lightyear",
    alternativeTitles: [],
    description: null,
    posterUrl: null,
    backdropUrl: null,
    year: 2022,
    type: "animation",
    status: "completed",
    durationMinutes: 105,
    quality: "HD",
    language: "Vietsub",
    genres: [],
    countries: [],
    directors: [],
    actors: [],
    totalEpisodes: 1,
    currentEpisode: "Full",
    externalIds: { tmdbId: "718789", imdbId: "tt10298810" },
    isCinema: false,
    cinemaEvidence: null,
    providerUpdatedAt: null,
    raw: {},
    ...overrides,
  };
}

describe("deterministic movie deduplication", () => {
  it("prefers exact TMDB identity", () => {
    const existing = [movie()];
    const incoming = movie({
      provider: "ophim",
      providerMovieId: "ophim-1",
      title: "Tên dịch khác",
      year: 2023,
      type: "single",
      externalIds: { tmdbId: "718789", imdbId: null },
    });

    expect(findDeterministicMatch(existing, incoming)).toEqual({
      index: 0,
      confidence: 1,
      reason: "tmdb",
    });
  });

  it("matches IMDb IDs case-insensitively", () => {
    const existing = [
      movie({ externalIds: { tmdbId: null, imdbId: "TT10298810" } }),
    ];
    const incoming = movie({
      provider: "ophim",
      externalIds: { tmdbId: null, imdbId: "tt10298810" },
    });

    expect(findDeterministicMatch(existing, incoming)?.reason).toBe("imdb");
  });

  it("matches normalized original title only with the same year and type", () => {
    const existing = [
      movie({
        externalIds: { tmdbId: null, imdbId: null },
        originalTitle: "Ransom Canyon - Season 2",
        year: 2025,
        type: "series",
      }),
    ];
    const incoming = movie({
      provider: "ophim",
      externalIds: { tmdbId: null, imdbId: null },
      originalTitle: "Ransom Canyon (Phần 2)",
      title: "Tên Việt khác",
      year: 2025,
      type: "series",
    });

    expect(findDeterministicMatch(existing, incoming)).toEqual({
      index: 0,
      confidence: 0.98,
      reason: "original-title",
    });
  });

  it("falls back to normalized Vietnamese title with the same year and type", () => {
    const existing = [
      movie({
        externalIds: { tmdbId: null, imdbId: null },
        originalTitle: null,
        title: "Đất Rừng Phương Nam",
        year: 2023,
        type: "single",
      }),
    ];
    const incoming = movie({
      provider: "nguonc",
      externalIds: { tmdbId: null, imdbId: null },
      originalTitle: null,
      title: "Dat Rung Phuong Nam",
      year: 2023,
      type: "single",
    });

    expect(findDeterministicMatch(existing, incoming)?.reason).toBe("title");
  });

  it.each([
    ["missing year", { year: null }],
    ["unknown type", { type: "unknown" as const }],
    ["different year", { year: 2024 }],
    ["different type", { type: "series" as const }],
  ])("does not merge an ambiguous title with %s", (_label, incomingOverrides) => {
    const existing = [
      movie({
        externalIds: { tmdbId: null, imdbId: null },
        originalTitle: null,
        title: "Trùng Tên",
      }),
    ];
    const incoming = movie({
      provider: "ophim",
      externalIds: { tmdbId: null, imdbId: null },
      originalTitle: null,
      title: "Trung Ten",
      ...incomingOverrides,
    });

    expect(findDeterministicMatch(existing, incoming)).toBeNull();
  });

  it("always selects the first deterministic match", () => {
    const existing = [movie(), movie({ providerMovieId: "vsmov-2" })];
    const incoming = movie({ provider: "ophim" });
    expect(findDeterministicMatch(existing, incoming)?.index).toBe(0);
  });
});
