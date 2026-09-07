import { describe, expect, it, vi } from "vitest";
import { vidsrcProvider, UnsupportedInternationalQuery } from "@/providers/vidsrc";
import { vidlinkProvider } from "@/providers/vidlink";
import { discoverMovies, discoverQuerySchema } from "@/lib/stores/discover";
import { sameMovie, getVietnamesePlaybackBackups } from "@/lib/stores/actions";
import { kkphimProvider, normalizeKkphimDetail, kkphimDetailResponseSchema } from "@/providers/kkphim";
import { ophimProvider } from "@/providers/ophim";
import { nguoncProvider } from "@/providers/nguonc";
import { vsmovProvider } from "@/providers/vsmov";
import fixture from "../../fixtures/kkphim/detail-v1.json";

const json = (data: unknown) => new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
const tmdbMovie = { id: 123, title: "Test Film", original_title: "Test Film", release_date: "2024-01-01", genres: [{ id: 28, name: "Action" }] };
const detail = () => normalizeKkphimDetail(kkphimDetailResponseSchema.parse(fixture));

describe("international source identity and metadata", () => {
  it.each([vidsrcProvider, vidlinkProvider])("uses the correct embed and provider for $id", async provider => {
    vi.stubGlobal("fetch", vi.fn(async () => json(tmdbMovie)));
    const result = await provider.getMovie("movie-123");
    expect(result?.movie.provider).toBe(provider.id);
    expect(result?.movie.providerSlug).toBe("movie-123");
    expect(result?.movie.raw.tmdb).toMatchObject({ id: "123", type: "movie" });
    expect(result?.episodes[0].provider).toBe(provider.id);
    expect(result?.episodes[0].embedUrl).toContain(provider.id === "vidsrc" ? "vidsrc.me/embed/movie?tmdb=123" : "vidlink.pro/movie/123?");
  });
  it("uses real season episode counts, including seasons beyond five", async () => {
    const paths: string[] = [];
    const fetcher = vi.fn(async (input: string) => { paths.push(new URL(input).pathname); return json({ id: 123, name: "Test TV", first_air_date: "2024-01-01", seasons: [{ season_number: 0, episode_count: 2 }, { season_number: 1, episode_count: 3 }, { season_number: 6, episode_count: 1 }] }); });
    vi.stubGlobal("fetch", fetcher);
    const result = await vidsrcProvider.getMovie("tv-123");
    expect(paths).toEqual(["/3/tv/123"]);
    expect(result?.episodes.map(ep => ep.episodeKey)).toEqual(["1:1", "1:2", "1:3", "6:1"]);
    expect(result?.episodes[3].embedUrl).toContain("season=6&episode=1");
  });
  it("never extracts a year or episode number from a Vietnamese slug", async () => {
    const paths: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async input => { paths.push(new URL(String(input)).pathname); return json({ results: [], total_results: 0, total_pages: 0 }); }));
    expect(await vidsrcProvider.getMovie("phim-2024-tap-2")).toBeNull();
    expect(paths).toEqual(["/3/search/multi"]);
  });
  it("rejects ambiguous legacy numeric IDs instead of preferring movie over TV", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(tmdbMovie)));
    expect(await vidsrcProvider.getMovie("123")).toBeNull();
  });
  it("distinguishes an upstream failure from a valid empty catalog", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("offline", { status: 503 })));
    await expect(vidsrcProvider.getLatest()).rejects.toThrow("unavailable");
    vi.stubGlobal("fetch", vi.fn(async () => json({ results: [], total_results: 0, total_pages: 0 })));
    expect((await vidsrcProvider.getLatest()).pagination).toMatchObject({ totalItems: 0, totalPages: 1 });
  });
  it("re-pages a 20-row upstream into 24-row pages with no gaps", async () => {
    const pages: number[] = [];
    vi.stubGlobal("fetch", vi.fn(async input => {
      const page = Number(new URL(String(input)).searchParams.get("page"));
      pages.push(page);
      return json({ results: Array.from({ length: 20 }, (_, i) => ({ ...tmdbMovie, id: (page - 1) * 20 + i + 1 })), total_results: 100, total_pages: 5 });
    }));
    const result = await vidlinkProvider.getFilteredList({ kind: "single", page: 2, limit: 24 });
    expect(pages).toEqual([2, 3]);
    expect(result.items.map(item => item.providerSlug)).toEqual(Array.from({ length: 24 }, (_, i) => `movie-${i + 25}`));
    expect(result.pagination).toMatchObject({ itemsPerPage: 24, currentPage: 2, totalPages: 5, totalItems: 100 });
    expect(result.items.every(item => item.provider === "vidlink")).toBe(true);
  });
  it.each([{ kind: "series", genre: "hanh-dong" }, { kind: "single", q: "test", country: "han-quoc" }, { kind: "cinema" }])("skips unsupported semantics without dropping filters: %j", async filters => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(vidsrcProvider.getFilteredList(filters)).rejects.toBeInstanceOf(UnsupportedInternationalQuery);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("ordered catalog failover", () => {
  it.each(["vidsrc", "vidlink"] as const)("reaches %s before any Vietnamese backup", async winner => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async input => { calls.push(new URL(String(input)).hostname); return new Response("offline", { status: 404 }); }));
    const value = { items: [detail().movie], pagination: { currentPage: 1, totalPages: 1, totalItems: 1, itemsPerPage: 24 } };
    vi.spyOn(vidsrcProvider, "getFilteredList").mockImplementation(async () => { calls.push("vidsrc"); if (winner !== "vidsrc") throw new Error("offline"); return value; });
    vi.spyOn(vidlinkProvider, "getFilteredList").mockImplementation(async () => { calls.push("vidlink"); return value; });
    const result = await discoverMovies("ban-mai", discoverQuerySchema.parse({}));
    expect(result.provider).toBe(winner);
    expect(calls).toEqual(winner === "vidsrc" ? ["ophim1.com", "vidsrc"] : ["ophim1.com", "vidsrc", "vidlink"]);
  });
  it("continues past a failed KKPhim primary through the whole chain", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("offline", { status: 404 })));
    vi.spyOn(vidsrcProvider, "getFilteredList").mockRejectedValue(new Error("offline"));
    vi.spyOn(vidlinkProvider, "getFilteredList").mockRejectedValue(new Error("offline"));
    await expect(discoverMovies("da-nguyet", discoverQuerySchema.parse({}))).rejects.toThrow("All catalog sources");
    expect(vidsrcProvider.getFilteredList).toHaveBeenCalledOnce();
    expect(vidlinkProvider.getFilteredList).toHaveBeenCalledOnce();
  });
});

describe("Vietnamese playback identity", () => {
  it("rejects a remake and a mismatched external identity", () => {
    const { movie } = detail();
    expect(sameMovie({ ...movie, year: 2024, raw: {}, externalIds: { tmdbId: null, imdbId: null } }, { ...movie, year: 2023, raw: {}, externalIds: { tmdbId: null, imdbId: null } })).toBe(false);
    expect(sameMovie({ ...movie, raw: { tmdb: { id: "1", type: "tv" } }, externalIds: { tmdbId: "1", imdbId: null } }, { ...movie, raw: { tmdb: { id: "2", type: "tv" } }, externalIds: { tmdbId: "2", imdbId: null } })).toBe(false);
  });
  it("adds only matched Vietnamese movies and the selected episode", async () => {
    const original = detail();
    original.movie.raw = { tmdb: { id: "123", type: "tv", season: 1 } };
    original.movie.externalIds = { tmdbId: "123", imdbId: null };
    const selected = { ...original.episodes[0], episodeNumber: 2, seasonNumber: 1 };
    original.episodes = [selected];
    vi.spyOn(kkphimProvider, "getMovie").mockResolvedValue(original);
    vi.spyOn(ophimProvider, "getMovie").mockResolvedValue(null);
    vi.spyOn(vsmovProvider, "getMovie").mockResolvedValue({ ...original, movie: { ...original.movie, externalIds: { tmdbId: "999", imdbId: null } } });
    vi.spyOn(nguoncProvider, "getMovie").mockResolvedValue({ movie: { ...original.movie, provider: "nguonc" }, episodes: [1, 2, 3].map(number => ({ ...selected, provider: "nguonc", episodeNumber: number, episodeKey: `tap-${number}`, serverName: "NguonC", streamUrl: null, embedUrl: `https://example.com/${number}` })) });
    const sources = await getVietnamesePlaybackBackups("da-nguyet", `kkphim~${original.movie.providerSlug}`, selected.episodeKey, selected.serverName, 1);
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ provider: "nguonc", tier: "backup_vn", embedUrl: "https://example.com/2" });
  });
});
