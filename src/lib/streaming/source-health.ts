import { readLocal, writeLocal } from "@/lib/movie-library";
import type { PlaybackSource } from "./fallback";
export const HEALTH_KEY = "thexa-source-health-v1";
export type SourceHealth = Record<
  string,
  { success: boolean; checked: number }
>;
export function sourceKey(source: PlaybackSource) {
  let host = "";
  try {
    host = new URL(source.streamUrl || source.embedUrl || "").host;
  } catch {}
  return `${source.provider}:${source.serverName}:${source.streamType}:${host}`;
}
export function readHealth(): SourceHealth {
  try {
    const raw = JSON.parse(readLocal(HEALTH_KEY, "{}"));
    return Object.fromEntries(
      Object.entries(raw)
        .filter(
          ([, value]) =>
            typeof value === "object" &&
            value !== null &&
            typeof (value as { success: unknown }).success === "boolean" &&
            Number.isFinite((value as { checked: number }).checked),
        )
        .slice(-100),
    ) as SourceHealth;
  } catch {
    return {};
  }
}
export function markSource(source: PlaybackSource, success: boolean) {
  const health = readHealth();
  health[sourceKey(source)] = { success, checked: Date.now() };
  writeLocal(
    HEALTH_KEY,
    JSON.stringify(
      Object.fromEntries(
        Object.entries(health)
          .sort((a, b) => a[1].checked - b[1].checked)
          .slice(-100),
      ),
    ),
  );
}
export function rankSources(
  sources: PlaybackSource[],
  health: SourceHealth,
  now = Date.now(),
) {
  const score = (source: PlaybackSource) => {
    const record = health[sourceKey(source)];
    const fresh =
      record &&
      now - record.checked < (record.success ? 7 * 86400000 : 30 * 60000);
    return (
      (fresh ? (record.success ? 20 : -20) : 0) + (source.streamUrl ? 5 : 0)
    );
  };
  return [...sources].sort((a, b) => score(b) - score(a));
}
