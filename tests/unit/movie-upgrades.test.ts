import { describe, it, expect, vi } from "vitest";
import {
  parseLibrary,
  updateMovie,
  readLocal,
  LIBRARY_KEY,
} from "@/lib/movie-library";
import { rankSources, sourceKey } from "@/lib/streaming/source-health";
import type { PlaybackSource } from "@/lib/streaming/fallback";
import { POST } from "@/app/api/playback-report/route";
const movie = {
  id: "ban-mai:test",
  title: "Movie",
  href: "/stores/ban-mai/watch/kkphim~test?episode=2",
  detailHref: "/stores/ban-mai/movie/kkphim~test",
};
describe("personal playback data", () => {
  it("rejects corrupt or external history links while retaining valid progress", () => {
    const valid = { ...movie, position: 53, updated: 1 };
    expect(
      parseLibrary(
        JSON.stringify([
          valid,
          { ...valid, href: "https://evil.example" },
          { ...valid, position: -1 },
        ]),
      ),
    ).toEqual([valid]);
    expect(parseLibrary("{broken")).toEqual([]);
  });
  it("preserves current session changes when storage quota is exceeded", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => JSON.stringify([{ ...movie, position: 30, updated: 1 }]),
        setItem: () => {
          throw new Error("QuotaExceeded");
        },
      },
      dispatchEvent: vi.fn(),
    });
    expect(updateMovie(movie, { position: 80, favorite: true })).toBe(false);
    expect(parseLibrary(readLocal(LIBRARY_KEY))[0]).toMatchObject({
      position: 80,
      favorite: true,
    });
    updateMovie(movie, { later: true });
    expect(parseLibrary(readLocal(LIBRARY_KEY))[0]).toMatchObject({
      position: 80,
      favorite: true,
      later: true,
    });
  });
});
describe("source preference", () => {
  const a: PlaybackSource = {
    id: "a",
    provider: "kkphim",
    tier: "primary",
    name: "A",
    serverName: "A",
    streamType: "hls",
    streamUrl: "https://a.example/file.m3u8",
  };
  const b = {
    ...a,
    id: "b",
    serverName: "B",
    streamUrl: "https://b.example/file.m3u8",
  };
  it("prefers verified playback, avoids a fresh failure and expires old failures without altering sources", () => {
    const now = 10000000;
    expect(
      rankSources(
        [a, b],
        { [sourceKey(b)]: { success: true, checked: now } },
        now,
      ),
    ).toEqual([b, a]);
    expect(
      rankSources(
        [a, b],
        { [sourceKey(a)]: { success: false, checked: now } },
        now,
      ),
    ).toEqual([b, a]);
    expect(
      rankSources(
        [a, b],
        { [sourceKey(a)]: { success: false, checked: now - 1800001 } },
        now,
      ),
    ).toEqual([a, b]);
    expect(a.streamUrl).toBe("https://a.example/file.m3u8");
  });
});
describe("playback reports", () => {
  const payload = {
    movie: "Movie",
    path: movie.href,
    episode: "2",
    provider: "kkphim",
    source: "A",
    position: 82,
    reason: "buffering",
    description: "Test report",
    errorCode: "MEDIA_3",
  };
  const request = (body: unknown, origin = "http://localhost") =>
    new Request("http://localhost/api/playback-report", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  it("records a traceable report with episode/source/position", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const response = await POST(request(payload));
    expect(response.status).toBe(201);
    const { reportId } = await response.json();
    expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({
      ...payload,
      reportId,
      event: "playback-report",
    });
  });
  it("rejects cross-origin submissions and invalid playback locations", async () => {
    expect(
      (await POST(request(payload, "https://elsewhere.example"))).status,
    ).toBe(403);
    expect((await POST(request({ ...payload, position: -1 }))).status).toBe(
      400,
    );
    expect(
      (await POST(request({ ...payload, path: "https://elsewhere.example" })))
        .status,
    ).toBe(400);
  });
});
