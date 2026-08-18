import { describe, expect, it } from "vitest";

import detailFixture from "../../fixtures/vsmov/detail-cinema-embed.json";
import genresFixture from "../../fixtures/vsmov/genres.json";
import latestFixture from "../../fixtures/vsmov/latest.json";
import searchFixture from "../../fixtures/vsmov/search.json";
import {
  normalizeVsmovDetail,
  normalizeVsmovList,
} from "../../src/providers/vsmov/normalize";
import {
  vsmovDetailResponseSchema,
  vsmovListResponseSchema,
  vsmovTaxonomyResponseSchema,
} from "../../src/providers/vsmov/schemas";

describe("VSMOV provider fixtures", () => {
  it("normalizes the fixed-size latest response and tolerates an object poster", () => {
    const parsed = vsmovListResponseSchema.parse(latestFixture);
    const result = normalizeVsmovList(parsed);

    expect(result.pagination).toEqual({
      currentPage: 1,
      totalPages: 761,
      totalItems: 18_253,
      itemsPerPage: 24,
    });
    expect(result.items[0]).toMatchObject({
      provider: "vsmov",
      providerMovieId: "50387",
      providerSlug: "giac-mo-trao-em",
      isCinema: false,
      cinemaEvidence: null,
    });
    expect(result.items[6]).toMatchObject({
      providerSlug: "lau-dai-tham-vong-ban-thai",
      posterUrl: null,
    });
  });

  it("coerces search pagination returned as strings or numbers", () => {
    const parsed = vsmovListResponseSchema.parse(searchFixture);
    const result = normalizeVsmovList(parsed);

    expect(result.pagination).toEqual({
      currentPage: 1,
      totalPages: 5,
      totalItems: 10,
      itemsPerPage: 2,
    });
    expect(result.items).toHaveLength(2);
  });

  it("classifies cinema only from detail chieurap and keeps sources embed-only", () => {
    const parsed = vsmovDetailResponseSchema.parse(detailFixture);
    const result = normalizeVsmovDetail(parsed);

    expect(result.movie).toMatchObject({
      providerSlug: "bay-xac-song-178486381421977",
      type: "single",
      durationMinutes: 123,
      isCinema: true,
      cinemaEvidence: "vsmov:movie.chieurap=true",
    });
    expect(result.movie.genres.map((genre) => genre.slug)).toEqual([
      "phim-nhac",
      "hanh-dong",
      "kinh-di",
    ]);
    expect(result.movie.countries[0]?.slug).toBe("han-quoc");
    expect(result.episodes).toEqual([
      expect.objectContaining({
        provider: "vsmov",
        serverName: "Vietsub #1",
        episodeLabel: "Full",
        streamType: "embed",
        streamUrl: null,
        embedUrl:
          "https://v1.streamvsmov.com/video/b8d75148-a2b9-4edd-a77a-258357ade31d",
      }),
    ]);

    const withoutProviderEvidence = normalizeVsmovDetail({
      ...parsed,
      movie: { ...parsed.movie, chieurap: false },
    });
    expect(withoutProviderEvidence.movie).toMatchObject({
      isCinema: false,
      cinemaEvidence: null,
    });
  });

  it("accepts the live taxonomy envelope", () => {
    const parsed = vsmovTaxonomyResponseSchema.parse(genresFixture);

    expect(parsed.status).toBe("success");
    expect(parsed.data.items).toHaveLength(45);
    expect(parsed.data.items.some((item) => item.slug === "hoat-hinh")).toBe(true);
  });
});
