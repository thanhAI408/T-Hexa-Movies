import { describe, expect, it } from "vitest";

import detailFixture from "../../fixtures/nguonc/detail.json";
import latestFixture from "../../fixtures/nguonc/latest.json";
import { NguoncProvider } from "../../src/providers/nguonc";
import {
  normalizeNguoncDetail,
  normalizeNguoncList,
} from "../../src/providers/nguonc/normalize";
import {
  nguoncDetailResponseSchema,
  nguoncListResponseSchema,
} from "../../src/providers/nguonc/schemas";

describe("NguonC provider fixtures", () => {
  it("normalizes the fixed-size latest feed using slug identity", () => {
    const parsed = nguoncListResponseSchema.parse(latestFixture);
    const result = normalizeNguoncList(parsed, 1);

    expect(result.pagination).toMatchObject({
      currentPage: 1,
      totalPages: 3327,
      itemsPerPage: 10,
    });
    expect(result.items[0]).toMatchObject({
      provider: "nguonc",
      providerMovieId: "hoa-khai-cam-tu",
      providerSlug: "hoa-khai-cam-tu",
      year: 2026,
      isCinema: false,
    });
    expect(result.items[0]?.posterUrl).toMatch(/^https:\/\//);
  });

  it("keeps NguonC episodes embed-only", () => {
    const parsed = nguoncDetailResponseSchema.parse(detailFixture);
    const result = normalizeNguoncDetail(parsed);

    expect(result.movie.type).toBe("series");
    expect(result.movie.status).toBe("ongoing");
    expect(result.movie.genres.map((genre) => genre.slug)).toContain("chinh-kich");
    expect(result.movie.countries[0]?.slug).toBe("trung-quoc");
    expect(result.episodes).toHaveLength(2);
    expect(result.episodes.every((episode) => episode.streamType === "embed")).toBe(true);
    expect(result.episodes.every((episode) => episode.streamUrl === null)).toBe(true);
  });

  it("returns official static taxonomy and an empty cinema result", async () => {
    const provider = new NguoncProvider();
    const [genres, countries, years, cinema] = await Promise.all([
      provider.getGenres(),
      provider.getCountries(),
      provider.getYears(),
      provider.getCinemaMovies(3, 12),
    ]);

    expect(genres).toHaveLength(22);
    expect(countries).toHaveLength(16);
    expect(years[0]).toBe(2026);
    expect(cinema).toEqual({
      items: [],
      pagination: {
        currentPage: 3,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 12,
      },
    });
  });
});
