import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/youtube/route";
import {
  inferMusicGenre,
  musicQuery,
  rankMusic,
  matchesMusicGenre,
} from "@/lib/youtube/music";
import type { YoutubeVideo } from "@/lib/youtube/types";
const now = Date.parse("2026-09-12T12:00:00Z");
const video = (
  id: string,
  views: string,
  days: number,
  categoryId = "10",
): YoutubeVideo => ({
  id,
  views,
  categoryId,
  title: "Lofi Music",
  publishedAt: new Date(now - days * 86400000).toISOString(),
  channelId: "",
  channelTitle: "",
  description: "",
  thumbnail: "",
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("music discovery and ranking", () => {
  it("distinguishes hot momentum from lifetime views, deduplicates and excludes other categories", () => {
    const old = video("old", "1000000", 365),
      recent = video("recent", "100000", 2),
      gaming = video("game", "999999999", 1, "20");
    expect(
      rankMusic([old, recent, gaming, recent], "hot", now).map((v) => v.id),
    ).toEqual(["recent", "old"]);
    expect(rankMusic([recent, old], "viewCount", now).map((v) => v.id)).toEqual(
      ["old", "recent"],
    );
    expect(rankMusic([old, recent], "relevance", now).map((v) => v.id)).toEqual(
      ["old", "recent"],
    );
  });
  it("recognizes listening intent and keeps exact song or artist queries", () => {
    expect(inferMusicGenre({ title: "Nhạc học tập Lofi - tập trung" })).toBe(
      "study",
    );
    expect(inferMusicGenre({ title: "Ness REMIX 2026" })).toBe("remix");
    expect(inferMusicGenre({ title: "Ballad buồn" })).toBe("ballad");
    expect(musicQuery("all", "  Sơn Tùng   Lạc Trôi  ")).toBe(
      "Sơn Tùng Lạc Trôi",
    );
    expect(musicQuery("lofi", "Sơn Tùng")).toContain("lofi");
  });
  it("sends genre, duration, hot cutoff and pagination upstream, then ranks hydrated music only", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "server-only-test");
    const a = video("dQw4w9WgXcQ", "1000", 20),
      b = video("jNQXAC9IVRw", "9000", 3),
      game = video("aaaaaaaaaaa", "999999", 1, "20");
    const row = (v: YoutubeVideo) => ({
      id: v.id,
      snippet: {
        title: v.title,
        categoryId: v.categoryId,
        publishedAt: v.publishedAt,
      },
      statistics: { viewCount: v.views },
      contentDetails: { duration: "PT1H" },
    });
    const fetch = vi.fn(async (input: string) =>
      new URL(input).pathname.endsWith("/search")
        ? Response.json({
            items: [row(a), row(game), row(b)],
            nextPageToken: "page3",
          })
        : Response.json({ items: [row(b), row(game), row(a)] }),
    );
    vi.stubGlobal("fetch", fetch);
    const response = await GET(
      new Request(
        "https://local/api/youtube?mode=music&music=lofi&q=piano&order=hot&duration=long&page=page2&exclude=dQw4w9WgXcQ",
      ),
    );
    expect(response.status).toBe(200);
    const params = new URL(fetch.mock.calls[0][0]).searchParams;
    expect(Object.fromEntries(params)).toMatchObject({
      type: "video",
      videoCategoryId: "10",
      videoEmbeddable: "true",
      videoSyndicated: "true",
      videoDuration: "long",
      order: "relevance",
      pageToken: "page2",
      relevanceLanguage: "en",
      regionCode: "VN",
    });
    expect(params.get("q")).toContain("piano lofi");
    expect(params.get("publishedAfter")).toMatch(/T00:00:00Z$/);
    const body = await response.text();
    expect(body).not.toContain("server-only-test");
    expect(JSON.parse(body)).toMatchObject({
      nextPageToken: "page3",
      items: [{ id: b.id, views: "9000", duration: "PT1H" }],
    });
    expect(JSON.parse(body).items).toHaveLength(1);
  });
  it("uses the music chart for default discovery and rejects unknown genres before API calls", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "server-only-test");
    const fetch = vi.fn().mockResolvedValue(Response.json({ items: [] }));
    vi.stubGlobal("fetch", fetch);
    await GET(new Request("https://local/api/youtube?mode=music"));
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.pathname).toContain("/videos");
    expect(url.searchParams.get("videoCategoryId")).toBe("10");
    fetch.mockClear();
    expect(
      (
        await GET(
          new Request("https://local/api/youtube?mode=music&music=gaming"),
        )
      ).status,
    ).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});

it("filters non-English songs and broad non-lofi matches before sorting", () => {
  const item = video("sample", "100", 1);
  expect(
    matchesMusicGenre(
      { ...item, title: "Official MV", defaultAudioLanguage: "ko" },
      "uk-us",
    ),
  ).toBe(false);
  expect(
    matchesMusicGenre(
      { ...item, title: "Official MV", defaultAudioLanguage: "en-US" },
      "uk-us",
    ),
  ).toBe(true);
  expect(
    matchesMusicGenre({ ...item, title: "English pop songs" }, "uk-us"),
  ).toBe(true);
  expect(
    matchesMusicGenre({ ...item, title: "Relax House Radio" }, "lofi"),
  ).toBe(false);
  expect(
    matchesMusicGenre(
      { ...item, title: "1 AM study session [lofi hip hop]" },
      "lofi",
    ),
  ).toBe(true);
});
