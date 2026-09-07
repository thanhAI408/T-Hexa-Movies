import { test, expect } from "@playwright/test";

test("player fails over from primary to VidSrc, VidLink, then a Vietnamese backup", async ({ page }) => {
  let releaseBackups!: () => void;
  const backupsReady = new Promise<void>(resolve => { releaseBackups = resolve; });
  await page.route("**/sources?**", async route => {
    await backupsReady;
    await route.fulfill({ json: { sources: [{ id: "test-vn", tier: "backup_vn", name: "Nguồn Việt Nam thử nghiệm", provider: "nguonc", serverName: "NguonC", streamType: "embed", embedUrl: "https://example.com/backup-player" }] } });
  });
  await page.route(/https:\/\/(vidsrc\.me|vidlink\.pro|player\.phimapi\.com|example\.com)\//, route => route.fulfill({ contentType: "text/html", body: "<html><body>Controlled source response</body></html>" }));
  await page.route("**/*.m3u8*", route => route.abort());
  await page.goto("/stores/ban-mai/watch/kkphim~cua-hang-sat-thu-phan-1");
  const active = page.locator('[data-playback-source][aria-pressed="true"]');
  await expect(page.locator("iframe").first()).toHaveAttribute("src", /player\.phimapi\.com/);
  await page.locator("iframe").first().dispatchEvent("error");
  await expect(active).toHaveAttribute("data-playback-source", "vidsrc");
  await expect(page.locator("iframe").first()).toHaveAttribute("src", /vidsrc\.me\/embed\/tv\?.*season=1&episode=1/);
  await page.locator("iframe").first().dispatchEvent("error");
  await expect(active).toHaveAttribute("data-playback-source", "vidlink");
  await expect(page.locator("iframe").first()).toHaveAttribute("src", /vidlink\.pro\/tv\/\d+\/1\/1/);
  await page.locator("iframe").first().dispatchEvent("error");
  await expect(page.getByRole("heading", { name: "Tín hiệu luồng phát bị gián đoạn" })).toBeVisible();
  releaseBackups();
  await expect(active).toHaveAttribute("data-playback-source", "backup_vn");
  await expect(page.locator("iframe").first()).toHaveAttribute("src", "https://example.com/backup-player");
});

for (const store of ["binh-minh", "ban-mai", "hoang-hon", "da-nguyet"]) {
  test(`${store}: compound filters and source detail`, async ({ request }) => {
    const response = await request.get(`/api/stores/${store}/discover?kind=series&genre=hanh-dong&country=han-quoc&year=2024`);
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.items.length).toBeGreaterThan(0);
    for (const movie of result.items) {
      expect(movie.type).toBe("series");
      expect(movie.year).toBe(2024);
      expect(movie.countries.some((item: { slug: string }) => item.slug === "han-quoc")).toBeTruthy();
      expect(movie.genres.some((item: { slug: string }) => item.slug === "hanh-dong")).toBeTruthy();
    }
    const first = result.items[0];
    const detailResponse = await request.get(`/api/stores/${store}/movie/${first.providerSlug}`);
    expect(detailResponse.ok()).toBeTruthy();
    const detail = await detailResponse.json();
    expect(detail.movie.provider).toBe(first.provider);
    expect(detail.movie.title).toBe(first.title);
    expect(detail.episodes.some((episode: { streamUrl?: string; embedUrl?: string }) => episode.streamUrl || episode.embedUrl)).toBeTruthy();
  });
}

test("filter controls, clear all, and mobile layout", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/stores/ban-mai");
  for (const [name, key, value] of [["📺 Phim bộ", "kind", "series"], ["Hành Động", "genre", "hanh-dong"], ["Hàn Quốc", "country", "han-quoc"], ["2024", "year", "2024"]]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${key}=${value}`));
  }
  await expect(page.locator('a[href*="/movie/kkphim~"]').filter({ has: page.locator("h3") }).first()).toBeVisible();
  await expect(page.getByText("Tìm thấy", { exact: false }).first()).toContainText("9");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.getByRole("button", { name: "Xóa tất cả", exact: true }).click();
  await expect(page).not.toHaveURL(/kind=|genre=|country=|year=/);
  expect(errors).toEqual([]);
});

test("an old response cannot overwrite the latest filter or hide a network error", async ({ page }) => {
  let releaseOld!: () => void;
  const oldResponse = new Promise<void>(resolve => { releaseOld = resolve; });
  await page.route("**/api/stores/da-nguyet/discover?**", async route => {
    const query = new URL(route.request().url()).searchParams;
    const year = query.get("year");
    if (year === "2023") await oldResponse;
    if (year === "2022") { await route.fulfill({ status: 503, json: { error: "Nguồn tạm lỗi thử nghiệm" } }); return; }
    await route.fulfill({ json: { items: [{ provider: "kkphim", providerMovieId: year || "default", providerSlug: "kkphim~fixture", title: `Kết quả ${year || "mới"}`, year: Number(year || 2026), type: "single", quality: "HD" }], pagination: { currentPage: 1, totalPages: 1, totalItems: 1, itemsPerPage: 24 } } });
  });
  await page.goto("/stores/da-nguyet");
  await page.getByRole("button", { name: "2023", exact: true }).click();
  await expect(page).toHaveURL(/year=2023/);
  await page.getByRole("button", { name: "2024", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Kết quả 2024", exact: true })).toBeVisible();
  releaseOld();
  await page.waitForTimeout(300);
  await expect(page.getByRole("heading", { name: "Kết quả 2023", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "2022", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Nguồn tạm lỗi thử nghiệm" })).toContainText("Nguồn tạm lỗi thử nghiệm");
  await expect(page.getByRole("button", { name: "Thử lại", exact: true })).toBeVisible();
});

test("player loads media and preserves selected episode/server in navigation", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/stores/ban-mai/watch/kkphim~cua-hang-sat-thu-phan-1");
  await expect(page.getByRole("heading", { name: "Cửa Hàng Sát Thủ (Phần 1)", exact: true })).toBeVisible();
  await expect.poll(async () => {
    for (const frame of page.frames()) {
      const video = frame.locator("video").first();
      if (await video.count()) {
        const ready = await video.evaluate(async node => {
          const element = node as HTMLVideoElement;
          element.muted = true;
          await element.play().catch(() => {});
          return element.readyState >= 2 && element.currentTime > 0;
        }).catch(() => false);
        if (ready) return true;
      }
    }
    return false;
  }, { timeout: 45000 }).toBe(true);
  const episode = page.locator('a[href*="episode="]').filter({ hasText: "Tập 02" }).first();
  await expect(episode).toHaveAttribute("href", /server=Vietsub&season=1/);
  await episode.click();
  await expect(page).toHaveURL(/episode=0%3A2.*server=Vietsub/);
  expect(errors).toEqual([]);
});
