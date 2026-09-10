import { test, expect } from '@playwright/test';
const video = { id: 'dQw4w9WgXcQ', title: 'Một chuyến đi thật đẹp', description: 'Khám phá thế giới\nMỗi ngày một điều mới.', channelId: 'UCabcdefghijklmnopqrstuv', channelTitle: 'Khám phá', publishedAt: '2026-09-01T00:00:00Z', views: '123400', duration: 'PT4M12S' };
test('YouTube navigation, search, watch later, comments, history and mobile layout', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.route('**/api/youtube?**', route => {
    const q = new URL(route.request().url()).searchParams;
    return route.fulfill({ json: q.get('mode') === 'comments' ? { items: [], comments: [{ id: 'c1', author: 'Người xem', text: '<script>test</script>', likes: 2 }] } : { items: [video], nextPageToken: q.has('page') ? undefined : q.get('mode') === 'video' ? undefined : 'page2' } });
  });
  await page.route('https://www.youtube-nocookie.com/**', route => route.fulfill({ body: '<html><body>Player fixture</body></html>', contentType: 'text/html' }));
  await page.goto('/stores'); await page.getByRole('link', { name: /Khám phá YouTube/ }).click();
  await expect(page).toHaveURL(/\/youtube$/);
  await expect(page.getByRole('heading', { name: video.title })).toBeVisible();
  await page.getByRole('button', { name: `Xem sau: ${video.title}`, exact: true }).click();
  await page.getByRole('link', { name: 'Xem sau', exact: true }).click(); await expect(page.getByRole('heading', { name: video.title })).toBeVisible();
  await page.reload(); await expect(page.getByRole('heading', { name: video.title })).toBeVisible();
  await page.getByRole('heading', { name: video.title }).click();
  await expect(page.locator('iframe')).toHaveAttribute('src', /youtube-nocookie.com\/embed\/dQw4w9WgXcQ/);
  await page.getByRole('button', { name: 'Tải bình luận', exact: true }).click();
  await expect(page.getByText('<script>test</script>', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Lịch sử', exact: true }).click(); await expect(page.getByRole('heading', { name: video.title })).toBeVisible();
  await page.getByRole('button', { name: 'Xóa lịch sử', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Danh sách còn trống' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Tìm trên YouTube' }).fill('âm nhạc'); await page.getByRole('button', { name: 'Tìm video', exact: true }).click();
  await expect(page).toHaveURL(/q=/); await page.getByLabel('Sắp xếp video').selectOption('date'); await expect(page).toHaveURL(/order=date/);
  await page.getByRole('button', { name: 'Xem thêm video', exact: true }).click(); await expect(page.getByRole('heading', { name: video.title })).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 }); await page.getByRole('button', { name: 'Mở danh mục' }).click();
  await expect(page.getByRole('link', { name: 'Lịch sử', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đóng danh mục', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.data/youtube-mobile.png', fullPage: true }); expect(errors).toEqual([]);
});
test('missing API configuration keeps direct YouTube URL playback accessible', async ({ page }) => {
  await page.route('**/api/youtube?**', route => route.fulfill({ status: 503, json: { error: 'Danh mục chưa kết nối. Dán liên kết để xem.', code: 'NOT_CONFIGURED' } }));
  await page.goto('/youtube'); await expect(page.locator('.yt-empty[role=alert]')).toContainText('Danh mục chưa kết nối');
  await page.getByRole('textbox', { name: 'Tìm trên YouTube' }).fill('https://youtu.be/dQw4w9WgXcQ'); await page.getByRole('button', { name: 'Tìm video', exact: true }).click();
  await expect(page.locator('iframe')).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0');
  await expect(page.getByRole('link', { name: 'Xem trên YouTube', exact: false })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
});
test('desktop catalog preview uses independent YouTube chrome', async ({ page }) => {
  await page.route('**/api/youtube?**', route => route.fulfill({ json: { items: Array.from({ length: 4 }, (_, i) => ({ ...video, id: ['dQw4w9WgXcQ', 'jNQXAC9IVRw', 'aqz-KE-bpKQ', 'M7lc1UVf-VE'][i % 4], title: ['Khám phá những điều mới mỗi ngày', 'Âm nhạc cho một buổi chiều bình yên', 'Cùng học một điều thú vị', 'Một hành trình đáng nhớ'][i % 4] })) } }));
  await page.goto('/youtube'); await expect(page.locator('.yt-card')).toHaveCount(4);
  await expect(page.getByRole('combobox', { name: 'Tìm phim' })).toHaveCount(0);
  await expect.poll(() => page.locator('.yt-thumbnail img').first().evaluate(img => (img as HTMLImageElement).naturalWidth), { timeout: 20000 }).toBeGreaterThan(0);
  await page.screenshot({ path: '.data/youtube-desktop.png', fullPage: true });
});
