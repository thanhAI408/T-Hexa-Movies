import type { EpisodeSourceView, SourceHealth, StreamType } from "@/types/catalog";

const FORMAT_SCORE: Record<StreamType, number> = {
  hls: 34,
  mp4: 30,
  embed: 14,
  unknown: 0,
};

const HEALTH_SCORE: Record<SourceHealth, number> = {
  healthy: 26,
  degraded: 6,
  unknown: 12,
  unavailable: -100,
};

export function scoreSource(source: EpisodeSourceView) {
  const attempts = source.successCount + source.failureCount;
  const successRate = attempts > 0 ? source.successCount / attempts : 0.6;
  const latencyPenalty = source.startupLatencyMs
    ? Math.min(22, source.startupLatencyMs / 300)
    : 4;
  const qualityBonus = /4k|2160/i.test(source.quality ?? "")
    ? 8
    : /1080|fhd/i.test(source.quality ?? "")
      ? 5
      : /720|hd/i.test(source.quality ?? "")
        ? 3
        : 0;

  return (
    FORMAT_SCORE[source.streamType] +
    HEALTH_SCORE[source.health] +
    successRate * 30 +
    qualityBonus -
    latencyPenalty +
    source.priorityScore
  );
}

export function rankSources(sources: EpisodeSourceView[], excluded = new Set<string>()) {
  return sources
    .filter(
      (source) =>
        !excluded.has(source.id) &&
        source.health !== "unavailable" &&
        Boolean(source.streamUrl || source.embedUrl),
    )
    .sort((left, right) => scoreSource(right) - scoreSource(left));
}

export function selectNextSource(
  sources: EpisodeSourceView[],
  attemptedSourceIds: ReadonlySet<string>,
) {
  return rankSources(sources, new Set(attemptedSourceIds))[0] ?? null;
}
