import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-white/8 bg-[#080b10]/80">
      <div className="page-shell flex flex-col gap-4 py-10 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-white">T-Hexa Movies</p>
          <p className="mt-1">Dữ liệu được tổng hợp từ các API công khai. Video phát trực tiếp từ nguồn.</p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Liên kết cuối trang">
          <Link href="/chieu-rap" className="transition hover:text-white">
            Phim chiếu rạp
          </Link>
          <Link href="/tim-kiem" className="transition hover:text-white">
            Tìm kiếm
          </Link>
          {process.env.NODE_ENV === "development" ? (
            <Link href="/dev/providers" className="transition hover:text-white">
              Tình trạng nguồn
            </Link>
          ) : null}
        </nav>
      </div>
    </footer>
  );
}
