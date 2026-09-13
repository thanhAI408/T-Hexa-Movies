import { test, expect } from "@playwright/test";

test("chat UI handles streaming, follow-up, stop, retry and mobile without overflow", async ({ page }) => {
  const questions: { message: string; conversationId: string | null; requestId: string }[] = [];
  let failNext = false;
  await page.route("**/api/movie-chat", async route => {
    if (route.request().method() === "DELETE") return route.fulfill({ json: { deleted: true } });
    const input = route.request().postDataJSON(); questions.push(input);
    if (failNext) { failNext = false; return route.fulfill({ status: 503, json: { error: "Nguồn tạm thời lỗi" } }); }
    const data = { message: "Có thể bạn đang tìm Kẻ Đánh Cắp Giấc Mơ.", movies: [{ id: "kkphim~ke-danh-cap-giac-mo", title: "Kẻ Đánh Cắp Giấc Mơ", originalTitle: "Inception", year: 2010, countries: ["Âu Mỹ"], genres: ["Khoa học"], href: "/stores/da-nguyet/movie/kkphim~ke-danh-cap-giac-mo", posterUrl: null, description: "Cobb đi vào giấc mơ.", evidenceQuote: "Cobb đi vào giấc mơ.", source: "Dạ Nguyệt · KKPhim" }], criteria: null, partial: false, followUps: ["Chỉ lấy phim năm 2010"], conversationId: "4615e2ee-70e4-420c-8a76-d0823be73d97", requestId: input.requestId };
    await route.fulfill({ contentType: "text/event-stream", body: `event: stage\ndata: {"stage":"searching"}\n\nevent: result\ndata: ${JSON.stringify(data)}\n\n` });
  });
  await page.goto("/tro-ly-phim");
  await page.getByRole("button", { name: /Tìm lại phim qua một cảnh/ }).click();
  await expect(page.getByRole("link", { name: /Kẻ Đánh Cắp Giấc Mơ/ })).toHaveCount(1);
  await page.getByRole("button", { name: "Chỉ lấy phim năm 2010", exact: true }).click();
  await expect.poll(() => questions.length).toBe(2);
  expect(questions[1].conversationId).toBe("4615e2ee-70e4-420c-8a76-d0823be73d97");
  await expect(page.getByRole("button", { name: "Dừng tìm kiếm" })).toHaveCount(0);
  failNext = true;
  await page.getByRole("textbox", { name: "Nhập câu hỏi tìm phim" }).fill("Phim tương tự");
  await page.getByRole("button", { name: "Gửi câu hỏi" }).click();
  await expect(page.locator(".chat-error")).toContainText("Nguồn tạm thời lỗi");
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect.poll(() => questions.length).toBe(4);
  expect(questions[2].requestId).toBe(questions[3].requestId);
  await expect(page.locator(".chat-error")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: ".data/movie-chat-mobile.png" });
  await page.getByRole("button", { name: "Xóa hội thoại", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hôm nay bạn muốn xem gì?" })).toBeVisible();
});

test("chat renders user HTML as inert text and Enter respects composition", async ({ page }) => {
  await page.route("**/api/movie-chat", async route => { await new Promise(r => setTimeout(r, 1000)); await route.fulfill({ status: 503, json: { error: "Thử lại" } }); });
  await page.goto("/tro-ly-phim");
  const box = page.getByRole("textbox", { name: "Nhập câu hỏi tìm phim" });
  await expect(box).toBeEnabled();
  await box.fill('<img src=x onerror="alert(1)">');
  await box.press("Shift+Enter");
  await expect(page.locator(".chat-entry.user")).toHaveCount(0);
  await box.press("Enter");
  await expect(page.locator(".chat-entry.user")).toContainText('<img src=x onerror="alert(1)">');
  await expect(page.locator(".chat-entry.user img")).toHaveCount(0);
  await page.getByRole("button", { name: "Dừng tìm kiếm" }).click();
  await expect(page.locator(".chat-error")).toContainText("Đã dừng");
});
