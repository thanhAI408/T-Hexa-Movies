import { describe, expect, it } from "vitest";
import fixture from "../../fixtures/kkphim/detail-v1.json";
import { normalizeKkphimDetail, kkphimDetailResponseSchema } from "@/providers/kkphim";
import { buildEpisodePlaybackSources, buildVidLinkEmbed, buildAutoEmbed, buildVidSrcMe, externalIds, getProviderFallbackOrder } from "@/lib/streaming/fallback";

const detail = () => normalizeKkphimDetail(kkphimDetailResponseSchema.parse(fixture));
describe("playback source regressions", () => {
  it("orders primary, real VidSrc, VidLink, then Vietnamese backups", () => {
    const { movie, episodes } = detail();
    movie.raw = { tmdb: { id: "123", type: "tv" } };
    const selected = { ...episodes[0], episodeNumber: 2 };
    const backup = { ...selected, provider: "ophim" as const, serverName: "Other source", streamUrl: null, embedUrl: "https://example.com/backup" };
    const sources = buildEpisodePlaybackSources(movie, selected, [selected, backup]);
    expect(sources.map(source => source.tier)).toEqual(["primary", "primary", "vidsrc", "vidlink", "backup_vn"]);
    expect(sources[2].embedUrl).toContain("https://vidsrc.me/embed/tv?");
    expect(sources.some(source => /autoembed|multiembed/.test(source.embedUrl || ""))).toBe(false);
  });
  it("removes duplicates from the provider fallback chain", () => {
    expect(getProviderFallbackOrder("ophim")).toEqual(["ophim", "vidsrc", "vidlink", "kkphim", "nguonc", "vsmov"]);
    expect(getProviderFallbackOrder("vidsrc")).toEqual(["vidsrc", "vidlink", "kkphim", "nguonc", "vsmov", "ophim"]);
  });
  it("keeps direct HLS and provider iframe as separate usable choices", () => {
    const { movie, episodes } = detail();
    const sources = buildEpisodePlaybackSources(movie, episodes[0], episodes);
    expect(sources[0].streamType).toBe("hls");
    expect(sources[0].streamUrl).toBe(episodes[0].streamUrl);
    expect(sources[0].embedUrl).toBeUndefined();
    expect(sources[1].streamType).toBe("embed");
    expect(sources[1].embedUrl).toBe(episodes[0].embedUrl);
  });
  it("does not pass IMDb IDs to TMDB-only services", () => {
    expect(buildVidLinkEmbed({ imdbId: "tt123456", type: "single" })).toBeNull();
    expect(buildAutoEmbed({ imdbId: "tt123456", type: "single" })).toBeNull();
    expect(buildVidSrcMe({ imdbId: "tt123456", type: "single" })).toContain("imdb=tt123456");
  });
  it("uses a feature-film URL for animation with movie metadata", () => {
    expect(buildVidLinkEmbed({ tmdbId: "123", type: "animation", mediaType: "movie" })).toContain("/movie/123?");
    expect(buildVidLinkEmbed({ tmdbId: "123", type: "animation" })).toBeNull();
  });
  it("retains normalized external IDs without raw metadata", () => {
    const { movie } = detail();
    movie.raw = {};
    movie.externalIds = { tmdbId: "123", imdbId: "tt456" };
    expect(externalIds(movie)).toMatchObject({ tmdbId: "123", imdbId: "tt456" });
  });
  it("keeps the selected season and excludes another season's same episode key", () => {
    const { movie, episodes } = detail();
    movie.raw = { tmdb: { id: "123", type: "tv", season: 3 } };
    const selected = { ...episodes[0], seasonNumber: 3, episodeNumber: 2 };
    const wrongSeason = { ...selected, seasonNumber: 1, serverName: "Wrong season", embedUrl: "https://example.com/wrong" };
    const sources = buildEpisodePlaybackSources(movie, selected, [selected, wrongSeason]);
    expect(sources.some(source => source.serverName === "Wrong season")).toBe(false);
    expect(sources.find(source => source.name === "Ngân Hà")?.embedUrl).toContain("/3/2?");
  });
});
