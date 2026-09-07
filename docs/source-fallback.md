# Thứ tự nguồn của các kho phim

Nguồn chính → VidSrc → VidLink → các nguồn Việt Nam còn lại.

Mặc định trình phát bật **Chỉ phát trực tiếp**: không tạo iframe hoặc tự tải player ngoài khi HLS lỗi. VidSrc/VidLink và các server chỉ có iframe bị bỏ qua trong chế độ này. Người xem có thể bỏ chọn để dùng lại chuỗi đầy đủ. Chế độ trực tiếp không loại bỏ quảng cáo đã được ghép vào nội dung video và có thể không phát được nguồn không cho phép CORS.

Player ngoài được bật thủ công dùng sandbox chặn popup, điều hướng trang cha, tải tệp, biểu mẫu và hộp thoại; không được cấp clipboard/web-share. Không bảo đảm loại bỏ quảng cáo hiển thị bên trong iframe. Chính sách này cũng áp dụng cho trang xem cũ `/xem`.

Nguồn chính của Bình Minh là VSMov, Ban Mai là OPhim, Hoàng Hôn là NguonC, Dạ Nguyệt là KKPhim. Nhóm Việt Nam dự phòng theo thứ tự KKPhim → NguonC → VSMov → OPhim, bỏ nguồn chính và loại trùng. Cấu hình chung nằm ở `getProviderFallbackOrder` trong `src/lib/streaming/fallback.ts`.

- **Danh mục:** thử từng nguồn theo thứ tự. Nguồn lỗi hoặc không hỗ trợ trọn bộ điều kiện lọc được bỏ qua; không bỏ điều kiện để trả phim khác. API trả `attempts` với trạng thái `available`, `unavailable`, `unsupported`. Kết quả rỗng hợp lệ kết thúc truy vấn. VidSrc/VidLink dùng metadata TMDB; metadata có sẵn không chứng minh video phát được.
- **Định danh:** liên kết giữ provider, slug; quốc tế dùng `vidsrc~movie-ID`, `vidsrc~tv-ID` (tương tự VidLink). Không lấy số trong slug tiếng Việt làm TMDB ID. Slug văn bản chỉ khớp một tiêu đề chính xác; ID cũ chỉ dùng khi phân biệt được phim lẻ/phim bộ.
- **Trình phát:** giữ HLS và iframe gốc trong tầng nguồn chính, sau đó VidSrc (`vidsrc.me`), VidLink, rồi nguồn Việt Nam. AutoEmbed/MultiEmbed không nằm trong chuỗi này. Chỉ tạo URL quốc tế khi có định danh phù hợp; dùng số tập từ metadata mùa phim, không tự đặt 12 tập.
- **Nguồn Việt Nam:** tải qua `/api/stores/[storeId]/movie/[slug]/sources` sau khi trang xem mở; đối chiếu external ID hoặc tiêu đề/năm/loại phim, rồi khớp mùa và tập. Không làm chậm khởi động nguồn chính. Nếu chuỗi đã hết trước khi dữ liệu dự phòng về, trình phát tiếp tục khi tìm được nguồn phù hợp.
- **Lỗi phát:** HLS/video/iframe báo lỗi thì chuyển tới nguồn kế tiếp; người xem cũng chọn nguồn thủ công được. Iframe khác miền có thể hiển thị lỗi bên trong mà không phát sự kiện lỗi ra ngoài, nên không bảo đảm tự phát hiện mọi lỗi của nhà cung cấp.

Phạm vi: các tuyến `/stores`. Các tuyến danh mục cũ dùng cơ sở dữ liệu không chuyển sang kiến trúc này trong bản sửa.
