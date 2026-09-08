# Tìm kiếm từ trang tổng

Ô tìm kiếm ở header và `/tim-kiem?q=...` sử dụng `/api/search/all`. API tìm đồng thời trên nguồn gốc của bốn kho: Bình Minh/VSMov, Ban Mai/OPhim, Hoàng Hôn/NguonC, Dạ Nguyệt/KKPhim. Không dùng fallback giữa các kho để tránh gắn sai nhãn nguồn; API tìm kiếm cơ sở dữ liệu cũ `/api/search` vẫn giữ nguyên.

Kết quả chia thành bốn nhóm. Mỗi phim giữ provider, tên kho và liên kết `/stores/{store}/movie/{provider}~{slug}`. Cùng một phim ở hai kho được giữ ở cả hai nhóm. Phân trang riêng từng kho qua tham số `store` và `page`, theo kích thước trang thực tế của nhà cung cấp.

Nguồn lỗi có trạng thái `unavailable`, phân biệt với nguồn tìm thành công nhưng không có kết quả. Nếu tất cả nguồn lỗi, API trả HTTP 503 cùng trạng thái từng kho. Mỗi yêu cầu upstream có timeout 6,5 giây, không retry; truy vấn hợp lệ được cache CDN 30 giây. Autocomplete đợi 300 ms, hiển thị tối đa hai gợi ý mỗi kho và hủy truy vấn cũ khi người dùng đổi từ khóa.
