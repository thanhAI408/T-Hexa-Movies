import { afterEach, describe, expect, it, vi } from "vitest";

import cinemaFixture from "../../fixtures/ophim/cinema.json";
import countriesFixture from "../../fixtures/ophim/countries.json";
import detailEmptySourceFixture from "../../fixtures/ophim/detail-empty-source.json";
import detailLegacyFixture from "../../fixtures/ophim/detail-legacy.json";
import detailV1Fixture from "../../fixtures/ophim/detail-v1.json";
import genresFixture from "../../fixtures/ophim/genres.json";
import listLegacyFixture from "../../fixtures/ophim/list-legacy.json";
import listV1Fixture from "../../fixtures/ophim/list-v1.json";
import searchFixture from "../../fixtures/ophim/search.json";
import yearsFixture from "../../fixtures/ophim/years.json";
import {
  OPhimProvider,
  normalizeOPhimDetailResponse,
  normalizeOPhimListResponse,
  ophimDetailResponseSchema,
  ophimListResponseSchema,
} from "../../src/providers/ophim";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("OPhim provider normalization", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("maps the rich v1 list shape and resolves bare image filenames", () => {
    const response = ophimListResponseSchema.parse(listV1Fixture);
    const result = normalizeOPhimListResponse(response, {
      requestedPage: 1,
      requestedLimit: 1,
    });

    expect(result.pagination).toEqual({
      currentPage: 1,
      totalPages: 12815,
      totalItems: 12815,
      itemsPerPage: 1,
    });
    expect(result.items[0]).toMatchObject({
      provider: "ophim",
      providerMovieId: "6a59298412f0391f00e0d8af",
      providerSlug: "bi-kip-nghich-tap-cua-thieu-hiep",
      title: "Bí Kíp Nghịch Tập Của Thiếu Hiệp",
      originalTitle: "Young Swordsman",
      type: "series",
      year: 2026,
      durationMinutes: 15,
    });
    expect(result.items[0]?.externalIds.imdbId).toBeNull();
    expect(result.items[0]?.posterUrl).toBe(
      "https://img.ophimimg.com/uploads/movies/bi-kip-nghich-tap-cua-thieu-hiep-poster.jpg",
    );
  });

  it("accepts the legacy latest-list shape", () => {
    const response = ophimListResponseSchema.parse(listLegacyFixture);
    const result = normalizeOPhimListResponse(response, {
      requestedPage: 1,
      requestedLimit: 24,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.providerSlug).toBe("soulm8te");
    expect(result.items[0]?.posterUrl).toBe(
      "https://img.ophimimg.com/uploads/movies/soulm8te-poster.webp",
    );
    expect(result.pagination.totalPages).toBe(1502);
  });

  it("maps hoathinh and trusts the official cinema flag", () => {
    const response = ophimListResponseSchema.parse(searchFixture);
    const result = normalizeOPhimListResponse(response, {
      requestedPage: 1,
      requestedLimit: 1,
    });

    expect(result.items[0]).toMatchObject({
      type: "animation",
      isCinema: true,
      cinemaEvidence: "ophim:chieurap=true",
    });
  });

  it("marks movies from the official cinema endpoint with route evidence", () => {
    const response = ophimListResponseSchema.parse(cinemaFixture);
    const result = normalizeOPhimListResponse(response, {
      requestedPage: 1,
      requestedLimit: 1,
      cinemaFromEndpoint: true,
    });

    expect(result.items[0]).toMatchObject({
      isCinema: true,
      cinemaEvidence: "ophim:list:phim-chieu-rap",
    });
  });

  it("maps v1 detail, sanitizes HTML, and prefers HLS while retaining embed", () => {
    const response = ophimDetailResponseSchema.parse(detailV1Fixture);
    const result = normalizeOPhimDetailResponse(response);

    expect(result?.movie).toMatchObject({
      providerSlug: "lightyear-canh-sat-vu-tru",
      description:
        "Trong khi dành nhiều năm cố gắng trở về nhà, Space Ranger Buzz Lightyear chạm trán với đội quân robot do Zurg chỉ huy.",
      type: "animation",
      totalEpisodes: 1,
      durationMinutes: 110,
    });
    expect(result?.episodes).toEqual([
      expect.objectContaining({
        episodeKey: "0:1",
        episodeLabel: "Full",
        streamType: "hls",
        streamUrl:
          "https://vip.opstream14.com/20220715/18240_3035e3ce/index.m3u8",
        embedUrl:
          "https://vip.opstream14.com/share/fea427597536f3e21482196d31927037",
        serverName: "Vietsub #1",
      }),
    ]);
  });

  it("accepts legacy detail and drops placeholder episodes with no source URL", () => {
    const legacy = normalizeOPhimDetailResponse(
      ophimDetailResponseSchema.parse(detailLegacyFixture),
    );
    const empty = normalizeOPhimDetailResponse(
      ophimDetailResponseSchema.parse(detailEmptySourceFixture),
    );

    expect(legacy?.episodes).toHaveLength(1);
    expect(legacy?.episodes[0]?.streamType).toBe("hls");
    expect(empty?.movie.providerSlug).toBe("soulm8te");
    expect(empty?.episodes).toEqual([]);
  });

  it("retries transient 404 responses for known collection endpoints", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ status: false, msg: "temporary" }, 404))
      .mockResolvedValueOnce(jsonResponse(listV1Fixture));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OPhimProvider("https://example.test");
    const result = await provider.getList("single", 1, 1);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "/v1/api/danh-sach/phim-le?page=1&limit=1",
    );
    expect(result.items[0]?.provider).toBe("ophim");
  });

  it("normalizes live taxonomy fixtures through the public adapter contract", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(genresFixture))
      .mockResolvedValueOnce(jsonResponse(countriesFixture))
      .mockResolvedValueOnce(jsonResponse(yearsFixture));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OPhimProvider("https://example.test");
    await expect(provider.getGenres()).resolves.toEqual([
      expect.objectContaining({ name: "Hành Động", slug: "hanh-dong" }),
      expect.objectContaining({ name: "Tình Cảm", slug: "tinh-cam" }),
      expect.objectContaining({ name: "Hài Hước", slug: "hai-huoc" }),
    ]);
    await expect(provider.getCountries()).resolves.toHaveLength(3);
    await expect(provider.getYears()).resolves.toEqual([2026, 2025, 2024, 1911]);
  });
});
