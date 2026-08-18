import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  catalogCounts,
  getMovieById,
  listMovies,
  upsertProviderMovie,
} from "@/lib/catalog/repository";
import { getDatabase, type DatabaseClient } from "@/lib/db/client";
import { migrateDatabase } from "@/lib/db/migrate";
import type {
  ProviderDetail,
  ProviderEpisodeInput,
  ProviderMovieInput,
} from "@/types/catalog";

let database: DatabaseClient;

function movie(
  overrides: Partial<ProviderMovieInput> = {},
): ProviderMovieInput {
  return {
    provider: "vsmov",
    providerMovieId: "vsmov-lightyear",
    providerSlug: "lightyear-canh-sat-vu-tru",
    title: "Lightyear: Cảnh Sát Vũ Trụ",
    originalTitle: "Lightyear",
    alternativeTitles: [],
    description: "Buzz Lightyear tìm đường trở về nhà.",
    posterUrl: "https://images.example.test/lightyear-poster.jpg",
    backdropUrl: "https://images.example.test/lightyear-backdrop.jpg",
    year: 2022,
    type: "animation",
    status: "completed",
    durationMinutes: 105,
    quality: "1080p",
    language: "Vietsub",
    genres: [{ id: "adventure", name: "Phiêu Lưu", slug: "phieu-luu" }],
    countries: [{ id: "us", name: "Âu Mỹ", slug: "au-my" }],
    directors: ["Angus MacLane"],
    actors: ["Chris Evans"],
    totalEpisodes: 1,
    currentEpisode: "Full",
    externalIds: { tmdbId: "718789", imdbId: "tt10298810" },
    isCinema: false,
    cinemaEvidence: null,
    providerUpdatedAt: "2026-08-10T00:00:00.000Z",
    raw: { fixture: true },
    ...overrides,
  };
}

function episode(
  provider: ProviderMovieInput["provider"],
  overrides: Partial<ProviderEpisodeInput> = {},
): ProviderEpisodeInput {
  return {
    episodeKey: "0:1",
    episodeLabel: "Full",
    episodeTitle: null,
    episodeNumber: 1,
    seasonNumber: null,
    provider,
    serverName: `${provider} server`,
    streamType: "hls",
    streamUrl: `https://${provider}.video.example.test/index.m3u8`,
    embedUrl: `https://${provider}.video.example.test/embed/1`,
    quality: "1080p",
    language: "Vietsub",
    ...overrides,
  };
}

function detail(
  movieInput: ProviderMovieInput,
  sources: ProviderEpisodeInput[] = [episode(movieInput.provider)],
): ProviderDetail {
  return { movie: movieInput, episodes: sources };
}

beforeAll(async () => {
  database = await getDatabase();
  await migrateDatabase(database);
});

beforeEach(async () => {
  await database.query(`
    TRUNCATE TABLE
      episode_sources,
      episodes,
      provider_movies,
      provider_sync_states,
      canonical_movies
    RESTART IDENTITY CASCADE
  `);
});

describe("catalog migrations and repository", () => {
  it("applies migrations idempotently to an isolated PGlite database", async () => {
    await migrateDatabase(database);
    await migrateDatabase(database);

    const applied = await database.query<{ count: number | string }>(
      "SELECT count(*) AS count FROM _t_hexa_migrations",
    );
    const tables = await database.query<{ count: number | string }>(
      `SELECT count(*) AS count
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name IN ('canonical_movies', 'provider_movies', 'episodes', 'episode_sources')`,
    );

    expect(Number(applied.rows[0]?.count)).toBe(1);
    expect(Number(tables.rows[0]?.count)).toBe(4);
  });

  it("upserts the same provider movie and sources idempotently", async () => {
    const input = movie();
    const first = await upsertProviderMovie(input, detail(input));
    const second = await upsertProviderMovie(input, detail(input));

    expect(first).toMatchObject({
      created: true,
      merged: false,
      reason: "new-canonical",
      sourcesUpserted: 1,
    });
    expect(second).toMatchObject({
      canonicalMovieId: first.canonicalMovieId,
      created: false,
      merged: false,
      reason: "provider-identity",
      sourcesUpserted: 1,
    });
    await expect(catalogCounts(database)).resolves.toEqual({
      movies: 1,
      mappings: 1,
      episodes: 1,
      sources: 1,
    });
  });

  it("merges exact external IDs across providers and aggregates episode sources", async () => {
    const vsmov = movie();
    const ophim = movie({
      provider: "ophim",
      providerMovieId: "ophim-lightyear",
      providerSlug: "lightyear-canh-sat-vu-tru-ophim",
      title: "Lightyear: Cảnh sát vũ trụ",
      description:
        "Một mô tả dài hơn từ OPhim về hành trình của Buzz Lightyear trở về nhà.",
      alternativeTitles: ["Cảnh Sát Vũ Trụ"],
      actors: ["Chris Evans", "Keke Palmer"],
      isCinema: true,
      cinemaEvidence: "ophim:list:phim-chieu-rap",
    });

    const first = await upsertProviderMovie(vsmov, detail(vsmov));
    const second = await upsertProviderMovie(ophim, detail(ophim));
    const stored = await getMovieById(first.canonicalMovieId);

    expect(second).toMatchObject({
      canonicalMovieId: first.canonicalMovieId,
      created: false,
      merged: true,
      reason: "external-id",
    });
    expect(stored).toMatchObject({
      sourceCount: 2,
      isCinema: true,
      description:
        "Một mô tả dài hơn từ OPhim về hành trình của Buzz Lightyear trở về nhà.",
    });
    expect(stored?.actors).toEqual(["Chris Evans", "Keke Palmer"]);
    expect(stored?.episodes).toHaveLength(1);
    expect(stored?.episodes[0]?.sources).toHaveLength(2);
    expect(stored?.episodes[0]?.sources.map((source) => source.provider).sort()).toEqual([
      "ophim",
      "vsmov",
    ]);
    await expect(catalogCounts(database)).resolves.toEqual({
      movies: 1,
      mappings: 2,
      episodes: 1,
      sources: 2,
    });
  });

  it("keeps ambiguous same-title records separate", async () => {
    const first = movie({
      providerMovieId: "vsmov-ambiguous",
      providerSlug: "trung-ten-vsmov",
      title: "Trùng Tên",
      originalTitle: null,
      year: null,
      externalIds: { tmdbId: null, imdbId: null },
    });
    const second = movie({
      provider: "ophim",
      providerMovieId: "ophim-ambiguous",
      providerSlug: "trung-ten-ophim",
      title: "Trung Ten",
      originalTitle: null,
      year: null,
      externalIds: { tmdbId: null, imdbId: null },
    });

    const firstResult = await upsertProviderMovie(first);
    const secondResult = await upsertProviderMovie(second);

    expect(firstResult.created).toBe(true);
    expect(secondResult).toMatchObject({ created: true, merged: false });
    expect(secondResult.canonicalMovieId).not.toBe(firstResult.canonicalMovieId);
    await expect(catalogCounts(database)).resolves.toMatchObject({
      movies: 2,
      mappings: 2,
    });
  });

  it("searches normalized Vietnamese titles without accents", async () => {
    const vietnameseMovie = movie({
      providerMovieId: "vsmov-fox-summer",
      providerSlug: "mua-he-cua-ho-ly",
      title: "Mùa Hè Của Hồ Ly",
      originalTitle: "The Fox's Summer",
      alternativeTitles: ["Mua He Cua Ho Ly"],
      year: 2017,
      type: "series",
      actors: ["Đàm Tùng Vận"],
      directors: ["Vu Trung Trung"],
      externalIds: { tmdbId: "70791", imdbId: null },
    });
    await upsertProviderMovie(vietnameseMovie);

    const exact = await listMovies({ query: "mua he cua ho ly" });
    const shortPrefix = await listMovies({ query: "mu" });

    expect(exact.total).toBe(1);
    expect(exact.items[0]?.title).toBe("Mùa Hè Của Hồ Ly");
    expect(shortPrefix.items[0]?.title).toBe("Mùa Hè Của Hồ Ly");
  });
});
