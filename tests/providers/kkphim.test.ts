import { describe, expect, it } from "vitest";

import detailFixture from "../../fixtures/kkphim/detail-v1.json";
import legacyListFixture from "../../fixtures/kkphim/list-legacy.json";
import v1ListFixture from "../../fixtures/kkphim/list-v1.json";
import {
  normalizeKkphimDetail,
  normalizeKkphimList,
  normalizeKkphimMovie,
} from "../../src/providers/kkphim/normalize";
import {
  kkphimDetailResponseSchema,
  kkphimListResponseSchema,
} from "../../src/providers/kkphim/schemas";

describe("KKPhim provider fixtures", () => {
  it("accepts v1 and legacy list envelopes", () => {
    const v1 = normalizeKkphimList(
      kkphimListResponseSchema.parse(v1ListFixture),
      1,
    );
    const legacy = normalizeKkphimList(
      kkphimListResponseSchema.parse(legacyListFixture),
      1,
    );

    expect(v1.items[0]?.providerMovieId).toBe("6a6c7a3443f4d7a8fe03c8d2");
    expect(v1.items[0]?.posterUrl).toBe(
      "https://phimimg.com/uploads/movies/20260731/cuu-mon-2026-poster.webp",
    );
    expect(legacy.items[0]?.posterUrl).toBe(v1.items[0]?.posterUrl);
  });

  it("drops repeated page-one payloads to stop pagination loops", () => {
    const parsed = kkphimListResponseSchema.parse(v1ListFixture);
    const result = normalizeKkphimList(parsed, 2);

    expect(result.items).toEqual([]);
    expect(result.pagination.currentPage).toBe(2);
    expect(result.pagination.totalPages).toBe(1);
  });

  it("prefers direct HLS while retaining the provider embed fallback", () => {
    const parsed = kkphimDetailResponseSchema.parse(detailFixture);
    const result = normalizeKkphimDetail(parsed);

    expect(result.episodes).toHaveLength(2);
    expect(result.episodes[0]).toMatchObject({
      streamType: "hls",
      streamUrl:
        "https://v7.kkphimplayer7.com/20260731/qWJLS8Cx/index.m3u8",
      embedUrl:
        "https://player.phimapi.com/player/?url=https://v7.kkphimplayer7.com/20260731/qWJLS8Cx/index.m3u8",
    });
  });

  it("sets cinema only from positive provider evidence", () => {
    const parsed = kkphimListResponseSchema.parse(v1ListFixture);
    const movie = parsed.data?.items[0];
    expect(movie).toBeDefined();

    const ordinary = normalizeKkphimMovie(movie!);
    const cinema = normalizeKkphimMovie(movie!, { officialCinemaList: true });
    expect(ordinary.isCinema).toBe(false);
    expect(cinema).toMatchObject({
      isCinema: true,
      cinemaEvidence: "kkphim:list:phim-chieu-rap",
    });
  });
});
