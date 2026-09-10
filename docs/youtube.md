# YouTube trên T-Hexa

## Nguồn tham khảo

- https://github.com/niladri-1/YouTube_Clone — ví dụ Next.js sử dụng YouTube Data API và iframe. T-Hexa triển khai riêng, không sao chép mã nguồn hoặc đưa API key vào trình duyệt.
- https://developers.google.com/youtube/v3/getting-started
- https://developers.google.com/youtube/v3/docs/search/list
- https://developers.google.com/youtube/v3/docs/videos/list
- https://developers.google.com/youtube/iframe_api_reference

## Có gì

`/youtube` có giao diện riêng và liên kết từ menu / trang kho phim: video phổ biến tại Việt Nam theo danh mục; tìm kiếm và sắp xếp liên quan/mới nhất/lượt xem; phân trang; trang kênh; iframe chính thức; mô tả; bình luận công khai tải theo yêu cầu; chia sẻ; Xem sau và lịch sử đã mở trên thiết bị (tối đa 100 mục). Không mô phỏng lượt thích, đăng ký kênh hoặc gửi bình luận. Các thao tác này dẫn sang YouTube.

`/api/youtube` gọi YouTube Data API v3 từ máy chủ. Chỉ nhận mode và tham số đã kiểm tra; không nhận URL upstream tùy ý. API key không trả về client hoặc ghi log. Timeout 8 giây, cache 5 phút, lỗi không cache. Nội dung lấy từ YouTube theo yêu cầu; không có bản sao toàn bộ video và không tái tạo đề xuất cá nhân hóa của YouTube. Kết quả phụ thuộc quota và quyền xem/nhúng của từng video.

Không có key: thông báo danh mục chưa kết nối; vẫn mở iframe khi dán URL video. Không có dữ liệu mẫu trong production. Test browser dùng fixture riêng và không chứng minh API thật hoạt động hoặc video phát thành công.

## Kích hoạt dữ liệu thật

1. Trong Google Cloud Console chọn/tạo dự án của chủ website; bật **YouTube Data API v3**.
2. Tại APIs & Services → Credentials tạo API key và giới hạn API được phép dùng là YouTube Data API v3.
3. Trong Vercel → t-hexa-movies → Settings → Environment Variables thêm **YOUTUBE_API_KEY** cho Production (và Preview nếu cần). Không dùng tiền tố NEXT_PUBLIC_. Không gửi key qua chat hay commit Git.
4. Redeploy để tiến trình nhận biến môi trường mới. Với local thêm biến vào `.env.local` rồi khởi động lại server.
5. Kiểm tra `/api/youtube?mode=popular`, tìm một video, mở kênh và bình luận bằng dữ liệu thật. Theo dõi quota trong Google Cloud. Chưa cấu hình OAuth nên không có đăng nhập/tác vụ tài khoản Google trong ứng dụng.

## Kiểm thử

- `vitest run tests/unit/youtube.test.ts`: kiểm tra tham số, URL video, phân trang, không lộ khóa, lỗi cấu hình/upstream và bình luận.
- `playwright test tests/e2e/youtube.spec.ts`: giao diện/điều hướng, tìm/sắp xếp, phân trang không trùng, thư viện sau reload, bình luận hiển thị dạng text, mobile và trạng thái thiếu cấu hình.
- Kiểm tra tìm phim cũ với `tests/e2e/global-search.spec.ts` sau thay đổi header/footer.
