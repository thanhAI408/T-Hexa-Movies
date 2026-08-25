import Link from "next/link";
import { Sparkles, Film, Heart } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="relative border-t border-white/10 bg-[#040711] text-slate-400">
      <div className="page-shell py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 pb-10 border-b border-white/5">
          {/* Col 1: Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-white tracking-wider bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                T-HEXA MOVIES
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Trải nghiệm điện ảnh theo thời gian sống động và khác biệt nhất. Nguồn phim chất lượng cao, cập nhật hàng ngày.
            </p>
          </div>

          {/* Col 2: 4 Thời Gian */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Vũ trụ 4 Thời Gian
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/stores/binh-minh" className="transition hover:text-amber-400">
                  🌅 Bình Minh
                </Link>
              </li>
              <li>
                <Link href="/stores/ban-mai" className="transition hover:text-sky-400">
                  ☀️ Ban Mai
                </Link>
              </li>
              <li>
                <Link href="/stores/hoang-hon" className="transition hover:text-orange-400">
                  🌆 Hoàng Hôn
                </Link>
              </li>
              <li>
                <Link href="/stores/da-nguyet" className="transition hover:text-indigo-400">
                  🌙 Dạ Nguyệt
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Thể loại nổi bật */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Khám Phá
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/stores" className="transition hover:text-white">
                  Tất cả kho phim
                </Link>
              </li>
              <li>
                <Link href="/chieu-rap" className="transition hover:text-white">
                  Phim Chiếu Rạp
                </Link>
              </li>
              <li>
                <Link href="/tim-kiem" className="transition hover:text-white">
                  Tìm kiếm thông minh
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Tuyên bố */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Thông tin
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Dữ liệu được tổng hợp từ các API công khai phục vụ mục đích học tập và giải trí. Video phát trực tiếp từ các nguồn lưu trữ đám mây.
            </p>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} T-Hexa Movies. Thiết kế đỉnh cao bởi Antigravity.</p>
          <div className="flex items-center gap-1 text-slate-400">
            <span>Thưởng thức phim chất lượng tuyệt đỉnh</span>
            <Sparkles size={14} className="text-amber-400" />
          </div>
        </div>
      </div>
    </footer>
  );
}
