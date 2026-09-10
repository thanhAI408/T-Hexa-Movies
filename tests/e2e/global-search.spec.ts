import { test, expect } from "@playwright/test";

const stores = [["binh-minh", "Bình Minh", "vsmov"], ["ban-mai", "Ban Mai", "ophim"], ["hoang-hon", "Hoàng Hôn", "nguonc"], ["da-nguyet", "Dạ Nguyệt", "kkphim"], ["vidsrc", "VidSrc", "vidsrc"], ["vidlink", "VidLink", "vidlink"]];

test("live global search preserves provider identity through the movie detail link", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const result = await request.get(`/api/search/all?q=${encodeURIComponent("sát thủ")}`);
  expect(result.ok()).toBe(true);
  const payload = await result.json();
  expect(payload.groups.map((group: { storeId: string }) => group.storeId)).toEqual(stores.map(([id]) => id));
  const group = payload.groups.find((item: { storeId: string; status: string }) => item.storeId === "da-nguyet" && item.status === "available");
  expect(group.items.length).toBeGreaterThan(0);
  const first = group.items[0];
  const detail = await request.get(`/api/stores/${first.storeId}/movie/${first.id}`);
  expect(detail.ok()).toBe(true);
  expect((await detail.json()).movie).toMatchObject({ provider: group.provider, title: first.title });
  await page.goto(`/tim-kiem?q=${encodeURIComponent("sát thủ")}`);
  await expect(page.getByRole("region", { name: "Kết quả Dạ Nguyệt" }).getByRole("link").first()).toHaveAttribute("href", first.href);
  const poster = page.getByRole("region", { name: "Kết quả Dạ Nguyệt" }).locator("img").first();
  await poster.scrollIntoViewIfNeeded();
  await expect.poll(() => poster.evaluate(node => (node as HTMLImageElement).naturalWidth), { timeout: 20000 }).toBeGreaterThan(0);
  expect(errors).toEqual([]);
  await page.screenshot({ path: ".data/global-search-preview.png", fullPage: true });
});
function response(q: string, only?: string | null, page = 1, failed?: string) {
  return { query: q, partial: Boolean(failed), groups: stores.filter(([id]) => !only || id === only).map(([storeId, storeName, provider]) => ({
    storeId, storeName, provider, status: failed === storeId ? "unavailable" : "available",
    pagination: failed === storeId ? null : { currentPage: page, totalPages: 2, totalItems: 2, itemsPerPage: 1 },
    items: failed === storeId ? [] : [{ id: `${provider}~film-${page}`, title: `${q} ${page}`, originalTitle: null, posterUrl: null, year: 2024, quality: "HD", storeId, storeName, href: `/stores/${storeId.startsWith("vid") ? "ban-mai" : storeId}/movie/${provider}~film-${page}` }],
  })) };
}

test("home search labels every store and View all never follows a hovered suggestion", async ({ page }) => {
  await page.route("**/api/search/all?**", route => route.fulfill({ json: response(new URL(route.request().url()).searchParams.get("q")!) }));
  await page.goto("/stores");
  const input = page.getByRole("combobox", { name: "Tìm phim" });
  await input.fill("Sát thủ");
  for (const [, name] of stores) await expect(page.getByRole("option").filter({ hasText: `Nguồn ${name}` })).toBeVisible();
  await page.getByRole("option").first().hover();
  await page.getByRole("button", { name: /Xem tất cả kết quả/ }).click();
  await expect(page).toHaveURL(/\/tim-kiem\?q=/);
  for (const [id, name, provider] of stores) {
    const group = page.getByRole("region", { name: `Kết quả ${name}` });
    await expect(group.getByRole("link")).toHaveAttribute("href", `/stores/${id.startsWith("vid") ? "ban-mai" : id}/movie/${provider}~film-1`);
    await expect(group.getByText(`Nguồn ${name}`, { exact: true })).toBeVisible();
  }
});

test("per-store pagination preserves other results and reports a failed source", async ({ page }) => {
  await page.route("**/api/search/all?**", route => {
    const p = new URL(route.request().url()).searchParams;
    return route.fulfill({ json: response(p.get("q")!, p.get("store"), Number(p.get("page") || 1), p.get("store") === "ban-mai" ? undefined : "ban-mai") });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tim-kiem?q=Phim");
  await expect(page.getByText("Nguồn Ban Mai đang gián đoạn.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Xem thêm từ Bình Minh", exact: true }).click();
  await expect(page.getByRole("region", { name: "Kết quả Bình Minh" }).getByRole("link")).toHaveCount(2);
  await expect(page.getByRole("region", { name: "Kết quả Hoàng Hôn" }).getByRole("link")).toHaveCount(1);
  await page.getByRole("button", { name: "Thử lại nguồn này", exact: true }).click();
  await expect(page.getByText(/6\/6 nguồn có kết quả/)).toBeVisible();
  await expect(page.getByText("Một số nguồn đang gián đoạn", { exact: false })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("stale autocomplete responses cannot replace a newer query", async ({ page }) => {
  let release!: () => void;
  const delayed = new Promise<void>(resolve => { release = resolve; });
  let oldStarted!: () => void;
  const started = new Promise<void>(resolve => { oldStarted = resolve; });
  await page.route("**/api/search/all?**", async route => {
    const q = new URL(route.request().url()).searchParams.get("q")!;
    if (q === "Old") { oldStarted(); await delayed; }
    await route.fulfill({ json: response(q) });
  });
  await page.goto("/stores");
  const input = page.getByRole("combobox", { name: "Tìm phim" });
  await input.fill("Old"); await started;
  await input.fill("New");
  await expect(page.getByRole("option").first()).toContainText("New");
  release();
  await input.fill("New ");
  await expect(page.getByRole("option").first()).toContainText("New");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/tim-kiem\?q=New$/);
});


test("international results open the correct provider detail", async ({ request }) => {
  const response = await request.get("/api/search/all?q=Inception");
  expect(response.ok()).toBe(true);
  const payload = await response.json();
  for (const provider of ["vidsrc", "vidlink"]) {
    const group = payload.groups.find((item: { storeId: string }) => item.storeId === provider);
    expect(group.status).toBe("available");
    const movie = group.items.find((item: { id: string }) => item.id === `${provider}~movie-27205`);
    expect(movie).toBeTruthy();
    const detail = await request.get(`/api${movie.href}`);
    expect(detail.ok()).toBe(true);
    expect((await detail.json()).movie).toMatchObject({ provider, providerSlug: "movie-27205" });
  }
});
