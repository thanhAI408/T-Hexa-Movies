import Link from "next/link";

import { Clapperboard, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <Clapperboard size={72} className="mb-6 text-[#4a5568]" />
      <h1 className="mb-3 text-4xl font-bold text-white">404</h1>
      <h2 className="mb-4 text-xl font-semibold text-[#b8c1cf]">Không tìm thấy trang</h2>
      <p className="mb-8 max-w-md text-[#8896a9]">
        Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#0b1017] transition hover:bg-[#f2f4f8]"
        >
          <Home size={18} />
          Trang chủ
        </Link>
        <Link
          href="/tim-kiem"
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
        >
          <Search size={18} />
          Tìm kiếm
        </Link>
      </div>
    </div>
  );
}
