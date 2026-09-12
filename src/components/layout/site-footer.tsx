"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { StoreLogo } from "@/components/stores/store-logo";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/youtube" || pathname.startsWith("/youtube/")) return null;
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
              Tìm và xem phim từ nhiều nguồn. Chọn kho hoặc dùng bộ lọc để tìm phim bạn muốn xem.
            </p>
          </div>

          {/* Col 2: 4 Thời Gian */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Các kho phim
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/stores/binh-minh" className="flex items-center gap-2 transition hover:text-amber-400 group">
                  <StoreLogo slug="binh-minh" size="sm" showGlow={false} className="h-5 w-5" />
                  <span>Kho Bình Minh</span>
                </Link>
              </li>
              <li>
                <Link href="/stores/ban-mai" className="flex items-center gap-2 transition hover:text-sky-400 group">
                  <StoreLogo slug="ban-mai" size="sm" showGlow={false} className="h-5 w-5" />
                  <span>Kho Ban Mai</span>
                </Link>
              </li>
              <li>
                <Link href="/stores/hoang-hon" className="flex items-center gap-2 transition hover:text-orange-400 group">
                  <StoreLogo slug="hoang-hon" size="sm" showGlow={false} className="h-5 w-5" />
                  <span>Kho Hoàng Hôn</span>
                </Link>
              </li>
              <li>
                <Link href="/stores/da-nguyet" className="flex items-center gap-2 transition hover:text-indigo-400 group">
                  <StoreLogo slug="da-nguyet" size="sm" showGlow={false} className="h-5 w-5" />
                  <span>Kho Dạ Nguyệt</span>
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
                  Phim chiếu rạp
                </Link>
              </li>
              <li>
                <Link href="/tim-kiem" className="transition hover:text-white">
                  Tìm phim
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
              Thông tin phim và video được cung cấp bởi các nguồn bên ngoài. Nội dung và chất lượng phát có thể thay đổi tùy nguồn.
            </p>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} T-Hexa Movies.</p>
          <div className="flex items-center gap-1 text-slate-400">
            <span>Chúc bạn xem phim vui vẻ.</span>
            <Sparkles size={14} className="text-amber-400" />
          </div>
        </div>
      </div>
    </footer>
  );
}
