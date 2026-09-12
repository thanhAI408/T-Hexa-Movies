import { test, expect } from "@playwright/test";
const path = "/stores/ban-mai/watch/kkphim~cua-hang-sat-thu-phan-1";
async function openPlaying(page: import("@playwright/test").Page) {
  await page.goto(path);
  const video = page.locator("video");
  await expect
    .poll(() => video.evaluate((v) => (v as HTMLVideoElement).readyState), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  await video.evaluate(async (v) => {
    const m = v as HTMLVideoElement;
    m.muted = true;
    await m.play();
  });
  await expect
    .poll(() => video.evaluate((v) => (v as HTMLVideoElement).currentTime), {
      timeout: 30000,
    })
    .toBeGreaterThan(1);
  return video;
}
test("resume, bookmarks, mobile seek/lock and reduced effects survive navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let video = await openPlaying(page);
  await video.evaluate((v) => {
    const m = v as HTMLVideoElement;
    m.currentTime = 80;
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("thexa-movies-v1") || "[]")[0]
            ?.position,
      ),
    )
    .toBeGreaterThan(79);
  await video.evaluate((v) => (v as HTMLVideoElement).pause());
  await page.getByRole("button", { name: "♡ Yêu thích", exact: true }).click();
  await page.getByRole("button", { name: "+ Xem sau", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Tiếp tục xem" }),
  ).toBeVisible();
  video = page.locator("video");
  await expect
    .poll(() => video.evaluate((v) => (v as HTMLVideoElement).readyState), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: /Xem tiếp từ/ }).click();
  await expect
    .poll(() => video.evaluate((v) => (v as HTMLVideoElement).currentTime))
    .toBeGreaterThan(79);
  await video.evaluate((v) => (v as HTMLVideoElement).pause());
  const before = await video.evaluate(
    (v) => (v as HTMLVideoElement).currentTime,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "+10 giây", exact: true }).click();
  expect(
    await video.evaluate((v) => (v as HTMLVideoElement).currentTime),
  ).toBeCloseTo(before + 10, 0);
  await page.getByRole("button", { name: "−10 giây", exact: true }).click();
  expect(
    await video.evaluate((v) => (v as HTMLVideoElement).currentTime),
  ).toBeCloseTo(before, 0);
  await page
    .getByRole("button", { name: "Khóa thao tác", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "+10 giây", exact: true }),
  ).toBeDisabled();
  expect(await video.evaluate((v) => (v as HTMLVideoElement).controls)).toBe(
    false,
  );
  await page
    .getByRole("button", { name: "Mở khóa thao tác", exact: true })
    .click();
  expect(await video.evaluate((v) => (v as HTMLVideoElement).controls)).toBe(
    true,
  );
  await page.getByRole("checkbox", { name: /Giảm hiệu ứng/ }).check();
  await expect(page.locator("html")).toHaveAttribute(
    "data-reduced-effects",
    "true",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator(".movie-session-tools")
    .screenshot({ path: ".data/movie-tools-mobile.png" });
  await page.goto("/stores");
  const library = page.getByRole("region", { name: "Thư viện phim cá nhân" });
  await expect(library.locator("article")).toHaveCount(1);
  await expect(library.locator("article a")).toHaveAttribute(
    "href",
    /episode=/,
  );
  await library.getByRole("button", { name: "Yêu thích", exact: true }).click();
  await expect(library.locator("article")).toHaveCount(1);
  await library.getByRole("button", { name: "Xem sau", exact: true }).click();
  await expect(library.locator("article")).toHaveCount(1);
  await library.getByRole("button", { name: /Bỏ .* khỏi danh sách/ }).click();
  await expect(library.locator("article")).toHaveCount(0);
  await library.getByRole("button", { name: "Yêu thích", exact: true }).click();
  await expect(library.locator("article")).toHaveCount(1);
  await expect(page.locator("html")).toHaveAttribute(
    "data-reduced-effects",
    "true",
  );
  await library.screenshot({ path: ".data/movie-library-mobile.png" });
  expect(errors).toEqual([]);
});
test("next episode countdown can be cancelled and then follows the exact next link", async ({
  page,
}) => {
  const video = await openPlaying(page);
  const target = await page
    .getByRole("link", { name: /Tập tiếp theo:/ })
    .getAttribute("href");
  expect(target).toContain("episode=");
  await video.evaluate((v) => {
    (v as HTMLVideoElement).pause();
    v.dispatchEvent(new Event("ended"));
  });
  await expect(
    page.getByRole("button", { name: "Hủy chuyển tập" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hủy chuyển tập" }).click();
  await expect(
    page.getByRole("button", { name: "Hủy chuyển tập" }),
  ).toHaveCount(0);
  await video.evaluate((v) => v.dispatchEvent(new Event("ended")));
  await expect(page).toHaveURL(target!, { timeout: 30000 });
  await expect(
    page.getByRole("button", { name: "Hủy chuyển tập" }),
  ).toHaveCount(0);
});
test("report failure is retryable and successful report includes playback context", async ({
  page,
}) => {
  await openPlaying(page);
  await page.getByRole("button", { name: "Báo lỗi video" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "Mô tả thêm" })
    .fill("Kiểm thử báo lỗi tự động");
  await page.route(
    "**/api/playback-report",
    (route) => route.fulfill({ status: 503, json: { error: "temporary" } }),
    { times: 1 },
  );
  await dialog.getByRole("button", { name: "Gửi báo lỗi" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Chưa gửi được");
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/api/playback-report") && r.status() === 201,
  );
  await dialog.getByRole("button", { name: "Gửi báo lỗi" }).click();
  const r = await response;
  expect(r.request().postDataJSON()).toMatchObject({
    provider: "kkphim",
    description: "Kiểm thử báo lỗi tự động",
  });
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("status").filter({ hasText: "Đã ghi nhận báo lỗi" }),
  ).toBeVisible();
});

test("changing a direct source preserves time and verifies the new source only after playback", async ({
  page,
}) => {
  await page.route("**/sources?**", (route) =>
    route.fulfill({
      json: {
        sources: [
          {
            id: "same-episode-backup",
            provider: "kkphim",
            tier: "backup_vn",
            streamType: "hls",
            streamUrl:
              "https://s2.phim1280.tv/20240119/NQjPZFfo/index.m3u8?alternate=1",
            serverName: "Test backup",
            name: "Same episode backup",
          },
        ],
      },
    }),
  );
  const video = await openPlaying(page);
  await video.evaluate((v) => {
    const m = v as HTMLVideoElement;
    m.currentTime = 65;
  });
  await expect
    .poll(() => video.evaluate((v) => (v as HTMLVideoElement).currentTime))
    .toBeGreaterThan(64);
  await page
    .getByRole("button", { name: "Same episode backup", exact: true })
    .click();
  await expect
    .poll(() => video.evaluate((v) => (v as HTMLVideoElement).readyState), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  await video.evaluate(async (v) => {
    const m = v as HTMLVideoElement;
    m.muted = true;
    await m.play();
  });
  await expect
    .poll(() => video.evaluate((v) => (v as HTMLVideoElement).currentTime))
    .toBeGreaterThan(64);
  await expect
    .poll(() =>
      page.evaluate(() =>
        Object.entries(
          JSON.parse(localStorage.getItem("thexa-source-health-v1") || "{}"),
        ).some(
          ([key, value]) =>
            key.includes("Test backup") &&
            (value as { success: boolean }).success,
        ),
      ),
    )
    .toBe(true);
});
