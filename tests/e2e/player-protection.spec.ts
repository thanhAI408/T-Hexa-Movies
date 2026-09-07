import { test, expect } from "@playwright/test";

const watchUrl = "/stores/ban-mai/watch/kkphim~cua-hang-sat-thu-phan-1";

test("direct mode never loads an external player, including after stream failure", async ({ page }) => {
  const embedRequests: string[] = [];
  page.on("request", request => { if (/vidsrc\.me|vidlink\.pro|player\.phimapi\.com|example\.com\/backup/.test(request.url())) embedRequests.push(request.url()); });
  await page.route("**/sources?**", route => route.fulfill({ json: { sources: [{ id: "embed", provider: "nguonc", tier: "backup_vn", streamType: "embed", name: "External", embedUrl: "https://example.com/backup" }] } }));
  await page.route("**/*.m3u8*", route => route.abort());
  await page.goto(watchUrl);
  await expect(page.getByRole("checkbox", { name: "Chỉ phát trực tiếp" })).toBeChecked();
  await expect(page.getByRole("heading", { name: "Tín hiệu luồng phát bị gián đoạn" })).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
  expect(embedRequests).toEqual([]);
});

test("sandbox blocks popup and parent navigation after user activation", async ({ page, context }) => {
  const downloads: string[] = [];
  page.on("download", download => downloads.push(download.suggestedFilename()));
  await page.route("**/sources?**", route => route.fulfill({ json: { sources: [] } }));
  await page.route("**/*.m3u8*", route => route.abort());
  await page.route("https://player.phimapi.com/**", route => route.fulfill({ contentType: "text/html", body: `<button id="attempt" style="margin:80px;padding:24px" disabled>Play</button><script>
    document.querySelector('#attempt').onclick = function () {
      try { const popup = window.open('https://example.com/unwanted-popup', '_blank'); this.dataset.popup = popup === null ? 'blocked' : 'opened'; }
      catch { this.dataset.popup = 'blocked'; }
      try { window.top.location.href = 'https://example.com/unwanted-navigation'; this.dataset.navigation = 'allowed'; }
      catch { this.dataset.navigation = 'blocked'; }
      const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob(['unwanted'])); link.download = 'unwanted.txt'; link.click();
    };
    document.querySelector('#attempt').disabled = false;
  </script>` }));
  await page.goto(watchUrl);
  await page.getByRole("checkbox", { name: "Chỉ phát trực tiếp" }).uncheck();
  const frame = page.frameLocator("iframe");
  await expect(page.getByText(/Đang kết nối tín hiệu/)).toHaveCount(0);
  await frame.getByRole("button", { name: "Play", exact: true }).press("Enter");
  await expect(frame.locator("#attempt")).toHaveAttribute("data-popup", "blocked");
  await expect(frame.locator("#attempt")).toHaveAttribute("data-navigation", "blocked");
  await expect(page).toHaveURL(new RegExp(watchUrl + "$"));
  expect(context.pages()).toHaveLength(1);
  expect(downloads).toEqual([]);
});

test("arrival of backups does not restart an active direct video", async ({ page }) => {
  let release!: () => void;
  const ready = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/sources?**", async route => { await ready; await route.fulfill({ json: { sources: [{ id: "later", provider: "nguonc", tier: "backup_vn", streamType: "mp4", streamUrl: "https://example.com/backup.mp4", name: "Later source" }] } }); });
  // Hold the manifest while checking the media instance remains attached.
  const manifests: string[] = [];
  let segmentStarted!: () => void;
  const segmentReady = new Promise<void>(resolve => { segmentStarted = resolve; });
  await page.route("**/*.m3u8*", async route => { manifests.push(route.request().url()); await route.fulfill({ contentType: "application/vnd.apple.mpegurl", headers: { "access-control-allow-origin": "*" }, body: "#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXT-X-MEDIA-SEQUENCE:0\n#EXTINF:6,\nhttps://example.com/segment.ts\n#EXT-X-ENDLIST\n" }); });
  await page.route("https://example.com/segment.ts", () => { segmentStarted(); return new Promise(() => {}); });
  await page.goto(watchUrl);
  await segmentReady;
  await expect(page.locator("video")).toHaveAttribute("src", /^(blob:|https:)/);
  const requestsBeforeBackups = manifests.length;
  const original = await page.locator("video").getAttribute("src");
  release();
  await expect(page.getByRole("button", { name: "Later source", exact: true })).toBeVisible();
  await expect(page.locator("video")).toHaveAttribute("src", original!);
  expect(manifests).toHaveLength(requestsBeforeBackups);
});

test("legacy player also requires opt-in and applies the sandbox", async ({ page }) => {
  await page.route("**/api/movie/protection-fixture", route => route.fulfill({ json: { id: "fixture", slug: "protection-fixture", title: "Protection fixture", type: "single", episodes: [{ id: "full", episodeKey: "full", episodeLabel: "Full", sources: [{ id: "outside", provider: "vidsrc", streamType: "embed", embedUrl: "https://example.com/legacy-player", health: "healthy", priorityScore: 10 }] }] } }));
  await page.route("https://example.com/legacy-player", route => route.fulfill({ contentType: "text/html", body: "<p>External player</p>" }));
  await page.goto("/xem/protection-fixture/full");
  const toggle = page.getByRole("checkbox", { name: /Chỉ phát trực tiếp/ });
  await expect(toggle).toBeChecked();
  await expect(page.getByText("Không có luồng phát trực tiếp phù hợp.", { exact: false })).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
  await toggle.uncheck();
  await expect(page.locator("iframe")).toHaveAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation");
});
