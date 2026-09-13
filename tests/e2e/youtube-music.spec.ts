import { test, expect, type Page } from "@playwright/test";
const first = {
  id: "dQw4w9WgXcQ",
  title: "Lofi cho ngày bình yên",
  categoryId: "10",
  channelId: "UCabcdefghijklmnopqrstuv",
  channelTitle: "Lofi Studio",
  description: "Music",
  views: "100000",
  publishedAt: "2026-09-01T00:00:00Z",
  duration: "PT1H",
};
const second = { ...first, id: "jNQXAC9IVRw", title: "Lofi đêm yên tĩnh" };
test.beforeEach(async ({ page }) => {
  await page.route("**/api/youtube?**", (route) => {
    const p = new URL(route.request().url()).searchParams;
    return route.fulfill({
      json: {
        items:
          p.get("mode") === "video"
            ? [p.get("id") === first.id ? first : second]
            : [first, second],
        ...(p.get("mode") === "channel"
          ? { channel: { title: "Lofi Studio", videoCount: "25" } }
          : {}),
      },
    });
  });
  await page.route("https://www.youtube-nocookie.com/**", (r) =>
    r.fulfill({
      body: "<html>Player fixture</html>",
      contentType: "text/html",
    }),
  );
  await page.route("https://www.youtube.com/iframe_api", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: `window.YT={Player:class{constructor(element,options){this.events=options.events;window.testPlayer=this;this.state=-1;setTimeout(()=>this.events.onReady(),0);}playVideo(){this.state=1;this.events.onStateChange({data:1});}pauseVideo(){this.state=2;}getCurrentTime(){return 42;}getPlayerState(){return this.state;}loadVideoById(v){window.loadedVideo=v.videoId;this.playVideo();}destroy(){window.destroyed=true;}}};window.onYouTubeIframeAPIReady();`,
    }),
  );
});
async function aligned(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const slot = document
          .querySelector("[data-youtube-slot]")
          ?.getBoundingClientRect();
        const video = document
          .querySelector("[data-youtube-player] iframe")
          ?.getBoundingClientRect();
        if (!slot || !video) return Infinity;
        return Math.max(
          Math.abs(slot.top - video.top),
          Math.abs(slot.left - video.left),
          Math.abs(slot.width - video.width),
          Math.abs(slot.height - video.height),
        );
      }),
    )
    .toBeLessThan(2);
}
test("player stays at the top when long recommendations arrive, scroll, theater and resize preserve the same iframe", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1000 });
  let release!: () => void;
  const ready = new Promise<void>((resolve) => (release = resolve));
  await page.route(
    "**/api/youtube?mode=music&music=lofi&exclude=**",
    async (r) => {
      await ready;
      await r.fulfill({
        json: {
          items: Array.from({ length: 18 }, (_, i) => ({
            ...second,
            id: "vid" + String(i).padStart(8, "0"),
            title: "Lofi track " + i,
          })),
        },
      });
    },
  );
  await page.goto("/youtube?v=" + first.id + "&music=lofi");
  await expect(page.locator("iframe")).toHaveCount(1);
  const original = await page.locator("iframe").elementHandle();
  release();
  await expect(page.locator(".yt-next .yt-card")).toHaveCount(16);
  await aligned(page);
  expect(
    await page
      .locator("[data-youtube-slot]")
      .evaluate((e) => e.getBoundingClientRect().top),
  ).toBeLessThan(110);
  expect(
    await page.evaluate(() =>
      Math.abs(
        document.querySelector(".yt-next")!.getBoundingClientRect().top -
          document.querySelector("[data-youtube-slot]")!.getBoundingClientRect()
            .top,
      ),
    ),
  ).toBeLessThan(2);
  await page.evaluate(() => scrollTo(0, 420));
  await aligned(page);
  await page.evaluate(() => scrollTo(0, 0));
  await page
    .getByRole("button", { name: "Chế độ rạp hát", exact: true })
    .click();
  await aligned(page);
  await page
    .getByRole("button", { name: "Chế độ mặc định", exact: true })
    .click();
  await aligned(page);
  await page.screenshot({
    path: ".data/music-watch-desktop.png",
    fullPage: true,
  });
  await aligned(page);
  await page.locator(".yt-channel-link").click();
  await expect(page.locator(".yt-channel-heading")).toContainText("25 video");
  expect(await original!.evaluate((e) => e.isConnected)).toBe(true);
  await page.getByRole("button", { name: "Mở rộng", exact: true }).click();
  await aligned(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await aligned(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: ".data/music-watch-mobile.png" });
  expect(await original!.evaluate((e) => e.isConnected)).toBe(true);
});
test("music chips and hot/views/duration filters preserve the search intent and survive reload", async ({
  page,
}) => {
  const queries: URLSearchParams[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/youtube?"))
      queries.push(new URL(r.url()).searchParams);
  });
  await page.goto("/youtube");
  const genres = page.getByRole("navigation", { name: "Thể loại nhạc" });
  await expect(genres.getByRole("link")).toHaveCount(16);
  await genres
    .getByRole("link", { name: "Nhạc làm việc", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Nhạc làm việc", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Sắp xếp video").selectOption("hot");
  await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
  await page.getByLabel("Thời lượng video").selectOption("long");
  await expect
    .poll(() =>
      queries.some(
        (q) =>
          q.get("mode") === "music" &&
          q.get("music") === "work" &&
          q.get("order") === "hot" &&
          q.get("duration") === "long",
      ),
    )
    .toBe(true);
  await page.getByLabel("Sắp xếp video").selectOption("viewCount");
  await page.reload();
  await expect(page.getByLabel("Sắp xếp video")).toHaveValue("viewCount");
  await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
  await expect(page.getByLabel("Thời lượng video")).toHaveValue("long");
  await page.getByRole("textbox", { name: "Tìm trên YouTube" }).fill("piano");
  await page.getByRole("button", { name: "Tìm video", exact: true }).click();
  await expect(page).toHaveURL(/q=piano&music=work/);
  await expect
    .poll(() =>
      queries.some(
        (q) =>
          q.get("mode") === "music" &&
          q.get("q") === "piano" &&
          q.get("music") === "work",
      ),
    )
    .toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: ".data/music-discovery-mobile.png" });
});
test("lofi context and the iframe survive mini player browsing and automatic next track", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/youtube?music=lofi");
  await page.getByRole("heading", { name: first.title, exact: true }).click();
  await expect(page).toHaveURL(/music=lofi/);
  await expect.poll(() => page.evaluate("!!window.testPlayer")).toBe(true);
  await expect(page.locator(".yt-next")).toContainText(second.title);
  const original = await page.locator("iframe").elementHandle();
  await page.getByRole("button", { name: "Thu nhỏ", exact: true }).click();
  await page.getByRole("link", { name: "Kho phim", exact: true }).click();
  await expect(page).toHaveURL(/\/stores$/);
  await page.evaluate("window.testPlayer.events.onStateChange({data:0})");
  await expect(page.locator("[data-youtube-player]")).toHaveAttribute(
    "data-video-id",
    second.id,
  );
  await expect(page).toHaveURL(/\/stores$/);
  expect(await original!.evaluate((e) => e.isConnected)).toBe(true);
  await page.getByRole("button", { name: "Mở rộng", exact: true }).click();
  await expect(page).toHaveURL(new RegExp("v=" + second.id + "&music=lofi"));
  await aligned(page);
  expect(errors).toEqual([]);
});

test("recommendations wait for music metadata instead of briefly showing general trending videos", async ({
  page,
}) => {
  let release!: () => void;
  const ready = new Promise<void>((resolve) => (release = resolve));
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/youtube?")) requests.push(r.url());
  });
  await page.route("**/api/youtube?mode=video&**", async (route) => {
    await ready;
    await route.fulfill({ json: { items: [first] } });
  });
  await page.goto("/youtube?v=" + first.id + "&music=lofi");
  await expect(page.locator("iframe")).toHaveCount(1);
  expect(requests.some((url) => url.includes("mode=popular"))).toBe(false);
  await expect(page.locator(".yt-next .yt-card")).toHaveCount(0);
  release();
  await expect(page.locator(".yt-next .yt-card")).toHaveCount(1);
  expect(requests.some((url) => url.includes("mode=popular"))).toBe(false);
});
