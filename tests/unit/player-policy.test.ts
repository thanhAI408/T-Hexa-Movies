import { describe, expect, it } from "vitest";
import { PLAYER_SANDBOX, PLAYER_PERMISSIONS, safePlaybackUrl } from "@/lib/streaming/player-policy";

describe("player restrictions", () => {
  it.each(["javascript:alert(1)", "data:text/html,ads", "http://example.com/player", "//example.com/player", "https://user:password@example.com/player", "not a url"])("rejects unsafe media URL %s", value => {
    expect(safePlaybackUrl(value)).toBeNull();
  });
  it("preserves signed HTTPS stream query parameters", () => {
    expect(safePlaybackUrl("https://example.com/video.m3u8?token=a%2Bb&expires=123")).toBe("https://example.com/video.m3u8?token=a%2Bb&expires=123");
  });
  it("does not grant popup, navigation, download or clipboard permissions", () => {
    expect(PLAYER_SANDBOX.split(" ")).toEqual(["allow-scripts", "allow-same-origin", "allow-presentation"]);
    expect(PLAYER_PERMISSIONS).not.toMatch(/clipboard|web-share|camera|microphone/);
  });
});
