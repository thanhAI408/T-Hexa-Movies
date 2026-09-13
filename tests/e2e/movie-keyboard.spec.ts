import { test, expect } from "@playwright/test";

test("movie keyboard seeks, repeats, pauses and respects editing and lock", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/stores/ban-mai/watch/kkphim~cua-hang-sat-thu-phan-1");
  const video = page.locator("video");
  await expect.poll(() => video.evaluate(v => (v as HTMLVideoElement).readyState), { timeout: 45000 }).toBeGreaterThan(0);
  await video.evaluate(v => { const m = v as HTMLVideoElement; m.pause(); m.currentTime = 100; m.focus(); });
  const time = () => video.evaluate(v => (v as HTMLVideoElement).currentTime);
  await page.keyboard.press("ArrowRight");
  expect(await time()).toBeCloseTo(110, 0);
  await page.keyboard.press("ArrowLeft");
  expect(await time()).toBeCloseTo(100, 0);
  for (const key of ["ArrowRight", "ArrowLeft"]) {
    const before = await time();
    await page.keyboard.down(key);
    for (let i = 0; i < 3; i++) {
      await page.waitForTimeout(150);
      await page.keyboard.down(key);
    }
    await page.keyboard.up(key);
    expect(await time()).toBeCloseTo(before + (key === "ArrowRight" ? 40 : -40), 0);
    const released = await time();
    await page.waitForTimeout(250);
    expect(await time()).toBeCloseTo(released, 0);
  }
  await page.keyboard.press("Space");
  await expect.poll(() => video.evaluate(v => (v as HTMLVideoElement).paused)).toBe(false);
  await page.keyboard.down("Space");
  await page.keyboard.down("Space");
  await page.keyboard.up("Space");
  expect(await video.evaluate(v => (v as HTMLVideoElement).paused)).toBe(true);
  await video.evaluate(v => { (v as HTMLVideoElement).currentTime = 3; });
  await page.keyboard.press("ArrowLeft");
  expect(await time()).toBe(0);
  await page.getByRole("button", { name: "Khóa thao tác", exact: true }).click();
  await video.focus();
  await page.keyboard.press("ArrowRight");
  expect(await time()).toBe(0);
  await page.getByRole("button", { name: "Mở khóa thao tác", exact: true }).click();
  await page.getByRole("button", { name: "Báo lỗi video", exact: true }).click();
  await page.locator("textarea").fill("Mô tả");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Space");
  expect(await time()).toBe(0);
  expect(await video.evaluate(v => (v as HTMLVideoElement).paused)).toBe(true);
});
