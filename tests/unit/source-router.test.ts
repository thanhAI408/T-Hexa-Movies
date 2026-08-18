import { describe, expect, it } from "vitest";

import {
  rankSources,
  scoreSource,
  selectNextSource,
} from "@/lib/source-router";
import type { EpisodeSourceView } from "@/types/catalog";

function source(
  overrides: Partial<EpisodeSourceView> = {},
): EpisodeSourceView {
  return {
    id: "source-hls",
    provider: "ophim",
    serverName: "Server 1",
    streamType: "hls",
    streamUrl: "https://video.example.test/index.m3u8",
    embedUrl: "https://video.example.test/embed/1",
    quality: "1080p",
    language: "Vietsub",
    health: "healthy",
    successCount: 9,
    failureCount: 1,
    startupLatencyMs: 900,
    priorityScore: 20,
    ...overrides,
  };
}

describe("source scoring and failover", () => {
  it("ranks a healthy direct HLS source above an equivalent embed", () => {
    const hls = source();
    const embed = source({
      id: "source-embed",
      streamType: "embed",
      streamUrl: null,
      priorityScore: 5,
    });

    expect(scoreSource(hls)).toBeGreaterThan(scoreSource(embed));
    expect(rankSources([embed, hls]).map((item) => item.id)).toEqual([
      "source-hls",
      "source-embed",
    ]);
  });

  it("rewards real success history and lower startup latency", () => {
    const reliable = source({ id: "reliable", startupLatencyMs: 500 });
    const unreliable = source({
      id: "unreliable",
      successCount: 1,
      failureCount: 9,
      startupLatencyMs: 5_000,
    });

    expect(scoreSource(reliable)).toBeGreaterThan(scoreSource(unreliable));
  });

  it("excludes unavailable, attempted, and URL-less sources", () => {
    const unavailable = source({ id: "unavailable", health: "unavailable" });
    const attempted = source({ id: "attempted" });
    const empty = source({ id: "empty", streamUrl: null, embedUrl: null });

    expect(rankSources([unavailable, attempted, empty], new Set(["attempted"]))).toEqual(
      [],
    );
  });

  it("never loops back to a previously attempted source", () => {
    const first = source({ id: "first" });
    const second = source({
      id: "second",
      provider: "kkphim",
      priorityScore: 10,
      startupLatencyMs: 1_200,
    });
    const attempted = new Set<string>();

    const selectedFirst = selectNextSource([second, first], attempted);
    expect(selectedFirst?.id).toBe("first");
    attempted.add(selectedFirst!.id);

    const selectedSecond = selectNextSource([second, first], attempted);
    expect(selectedSecond?.id).toBe("second");
    attempted.add(selectedSecond!.id);

    expect(selectNextSource([second, first], attempted)).toBeNull();
  });
});
