import { test, expect } from '@playwright/test';

const first = { id: 'dQw4w9WgXcQ', title: 'Bản nhạc đầu tiên', categoryId: '10', channelId: '', channelTitle: 'Nhạc', description: '' };
const second = { ...first, id: 'jNQXAC9IVRw', title: 'Bản nhạc tiếp theo' };

test.beforeEach(async ({ page }) => {
  await page.route('**/api/youtube?**', route => {
    const p = new URL(route.request().url()).searchParams;
    return route.fulfill({ json: { items: p.get('mode') === 'video' ? [p.get('id') === first.id ? first : second] : [first, second] } });
  });
  await page.route('https://www.youtube-nocookie.com/**', route => route.fulfill({ body: '<html>Controlled player</html>', contentType: 'text/html' }));
  await page.route('https://www.youtube.com/iframe_api', route => route.fulfill({ contentType: 'text/javascript', body: `
    window.playbackLog = [];
    window.YT = { Player: class {
      constructor(element, options) { this.element = element; this.events = options.events; this.state = -1; window.testPlayer = this; setTimeout(() => this.events.onReady(), 0); }
      playVideo() { window.playbackLog.push('play'); this.state = 1; this.events.onStateChange({data:1}); }
      pauseVideo() { window.playbackLog.push('pause'); this.state = 2; this.events.onStateChange({data:2}); }
      getCurrentTime() { return 42; }
      getPlayerState() { return this.state; }
      loadVideoById(value) { window.playbackLog.push(value); this.playVideo(); }
      destroy() { window.playbackLog.push('destroy'); this.element.remove(); }
    }}; window.onYouTubeIframeAPIReady();
  ` }));
});

test('one click starts playback, mini player survives browsing, and ending advances within category', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/youtube?category=10');
  await page.getByRole('heading', { name: first.title, exact: true }).click();
  await expect(page.locator('iframe')).toHaveAttribute('src', /autoplay=1/);
  await expect.poll(() => page.evaluate('!!window.playbackLog?.includes("play")')).toBe(true);
  const frame = await page.locator('iframe').elementHandle();
  await page.getByRole('button', { name: 'Thu nhỏ', exact: true }).click();
  await page.getByRole('link', { name: 'Kho phim', exact: true }).click();
  await expect(page).toHaveURL(/\/stores$/);
  expect(await frame!.evaluate(element => element.isConnected)).toBe(true);
  expect(await page.evaluate('window.playbackLog.includes("destroy")')).toBe(false);
  await page.evaluate('window.testPlayer.events.onStateChange({data:0})');
  await expect(page.locator('[data-youtube-player]')).toHaveAttribute('data-video-id', second.id);
  expect(await frame!.evaluate(element => element.isConnected)).toBe(true);
  expect(await page.evaluate('window.playbackLog.includes("destroy")')).toBe(false);
  await expect(page).toHaveURL(/\/stores$/);
  await page.getByRole('button', { name: 'Mở rộng', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(second.id));
  await expect(page.getByRole('heading', { name: second.title, exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Thu nhỏ', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Đóng video YouTube', exact: true }).click();
  await expect(page.locator('iframe')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('pause is respected, buffering recovery preserves progress, and autoplay can be disabled', async ({ page }) => {
  await page.goto(`/youtube?v=${first.id}`);
  await expect.poll(() => page.evaluate('!!window.testPlayer')).toBe(true);
  await page.clock.install();
  await page.evaluate('window.testPlayer.state=3; window.testPlayer.events.onStateChange({data:3})');
  await page.clock.fastForward(16000);
  expect(await page.evaluate('window.playbackLog.some(item => item.startSeconds === 42)')).toBe(true);
  await page.evaluate('window.testPlayer.pauseVideo()');
  const plays = await page.evaluate('window.playbackLog.filter(item => item === "play").length');
  await page.clock.fastForward(60000);
  expect(await page.evaluate('window.playbackLog.filter(item => item === "play").length')).toBe(plays);
  await page.getByRole('checkbox', { name: 'Tự chuyển tiếp' }).uncheck();
  await page.evaluate('window.testPlayer.events.onStateChange({data:0})');
  await expect(page.locator('iframe')).toHaveAttribute('src', new RegExp(first.id));
  await page.evaluate(() => { const video = document.createElement('video'); document.body.append(video); video.dispatchEvent(new Event('play')); });
  expect(await page.evaluate('window.playbackLog.at(-1)')).toBe('pause');
});
