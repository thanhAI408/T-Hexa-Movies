import { test, expect } from '@playwright/test';

test('store background refresh keeps filters and cached results during temporary failure', async ({ page }) => {
  let calls = 0;
  let fail = false;
  const queries: string[] = [];
  await page.clock.install();
  await page.route('**/api/stores/da-nguyet/discover?**', route => {
    calls++; queries.push(route.request().url());
    return route.fulfill(fail ? { status: 503, json: { error: 'Temporarily unavailable' } } : { json: { items: [{ provider: 'kkphim', providerMovieId: 'fixture', providerSlug: 'kkphim~fixture', title: `Updated ${calls}`, year: 2024, type: 'single' }], pagination: { currentPage: 1, totalPages: 1, totalItems: 1, itemsPerPage: 24 } } });
  });
  await page.goto('/stores/da-nguyet?year=2024');
  await expect(page.getByRole('heading', { name: 'Updated 1', exact: true })).toBeVisible();
  await page.clock.fastForward(61000);
  await expect(page.getByRole('heading', { name: 'Updated 2', exact: true })).toBeVisible();
  expect(queries.every(url => new URL(url).searchParams.get('year') === '2024')).toBe(true);
  fail = true;
  await page.clock.fastForward(61000);
  await expect(page.getByText('Chưa kiểm tra được dữ liệu mới.', { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Updated 2', exact: true })).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Cập nhật danh sách phim' }).click();
  await expect(page.getByRole('heading', { name: 'Updated 4', exact: true })).toBeVisible();
  await expect(page.getByText('Chưa kiểm tra được dữ liệu mới.', { exact: false })).toHaveCount(0);
});

test('global search refresh replaces results and recovers without losing the last success', async ({ page }) => {
  let fail = false;
  let calls = 0;
  await page.clock.install();
  await page.route('**/api/search/all?**', route => {
    calls++;
    return route.fulfill(fail ? { status: 503, json: { error: 'Unavailable' } } : { json: { query: 'test', partial: false, groups: [{ storeId: 'da-nguyet', storeName: 'Dạ Nguyệt', provider: 'kkphim', status: 'available', pagination: { currentPage: 1, totalPages: 1, totalItems: 1, itemsPerPage: 24 }, items: [{ id: 'one', title: `Result ${calls}`, href: '/stores/da-nguyet/movie/kkphim~fixture', storeName: 'Dạ Nguyệt' }] }] } });
  });
  await page.goto('/tim-kiem?q=test');
  await expect(page.getByRole('heading', { name: 'Result 1', exact: true })).toBeVisible();
  await page.clock.fastForward(61000);
  await expect(page.getByRole('heading', { name: 'Result 2', exact: true })).toBeVisible();
  fail = true; await page.clock.fastForward(61000);
  await expect(page.getByText('Chưa cập nhật được kết quả.', { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Result 2', exact: true })).toBeVisible();
  fail = false; await page.getByRole('button', { name: 'Cập nhật kết quả' }).click();
  await expect(page.getByRole('heading', { name: 'Result 4', exact: true })).toBeVisible();
});

test('filter dialog supports Escape and store theme is restored after leaving', async ({ page }) => {
  await page.goto('/stores');
  const original = await page.locator('body').evaluate(el => ({ background: el.style.background, color: el.style.color }));
  await page.getByRole('link', { name: /Dạ Nguyệt Đêm trăng/ }).click();
  await page.getByRole('button', { name: 'Bộ lọc', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Bộ lọc phim' })).toBeVisible();
  await page.keyboard.press('Tab');
  expect(await page.getByRole('dialog').evaluate(el => el.contains(document.activeElement))).toBe(true);
  await page.screenshot({ path: '.data/filter-dialog-audit.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link', { name: 'T-Hexa Movies — Kho phim', exact: true }).click();
  await expect(page).toHaveURL(/\/stores$/);
  await expect.poll(() => page.locator('body').evaluate(el => ({ background: el.style.background, color: el.style.color }))).toEqual(original);
});
