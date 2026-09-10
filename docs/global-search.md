# Tìm kiếm từ trang tổng

Ô tìm kiếm ở header và `/tim-kiem?q=...` sử dụng `/api/search/all`. API tìm đồng thời trên nguồn gốc của bốn kho: Bình Minh/VSMov, Ban Mai/OPhim, Hoàng Hôn/NguonC, Dạ Nguyệt/KKPhim, cùng VidSrc và VidLink. Không dùng fallback giữa các kho để tránh gắn sai nhãn nguồn; API tìm kiếm cơ sở dữ liệu cũ `/api/search` vẫn giữ nguyên.

Kết quả chia thành sáu nhóm. Mỗi phim giữ provider, tên kho và liên kết `/stores/{store}/movie/{provider}~{slug}`. Cùng một phim ở hai kho được giữ ở cả hai nhóm. Phân trang riêng từng kho qua tham số `store` và `page`, theo kích thước trang thực tế của nhà cung cấp.

Nguồn lỗi có trạng thái `unavailable`, phân biệt với nguồn tìm thành công nhưng không có kết quả. Nếu tất cả nguồn lỗi, API trả HTTP 503 cùng trạng thái từng kho. Mỗi yêu cầu upstream có timeout 6,5 giây, không retry; truy vấn hợp lệ được cache CDN 30 giây. Autocomplete đợi 300 ms, hiển thị tối đa hai gợi ý mỗi kho và hủy truy vấn cũ khi người dùng đổi từ khóa.


VidSrc và VidLink dùng danh mục TMDB, hiển thị riêng nhãn nguồn và phân trang bằng `store=vidsrc` / `store=vidlink`. Liên kết dùng giao diện chi tiết Ban Mai có sẵn, nhưng ID `vidsrc~movie-ID`, `vidlink~tv-ID` quyết định nguồn thực tế, không đổi sang OPhim. Kết quả danh mục không xác nhận video sẽ phát được. Tùy chọn trình phát ngoài và bảo vệ quảng cáo vẫn áp dụng khi xem.

Tìm quốc tế loại bỏ kết quả diễn viên trước khi phân trang; tối đa 20 trang TMDB được kiểm tra. Từ khóa quá rộng hoặc lỗi upstream trả trạng thái chưa kiểm tra được cho nguồn đó. Mỗi yêu cầu TMDB có timeout riêng; tổng thời gian có thể dài hơn một yêu cầu khi có nhiều trang.
