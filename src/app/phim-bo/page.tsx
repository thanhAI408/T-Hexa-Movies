import type { Metadata } from "next";
import Link from "next/link";

import { Tv2 } from "lucide-react";
import { listMovies } from "@/lib/catalog/repository";
import { MovieRow } from "@/components/movie/movie-row";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Phim bộ",
  description: "Danh sách phim bộ (drama, sitcom, web drama) với nhiều tập.",
};

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function SeriesPage({ searchParams }: Props) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));
  const offset = (currentPage - 1) * 24;
  const movies = await listMovies({ type: "series", limit: 24, offset });

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center gap-3">
        <Tv2 size={28} className="text-[#4b9cf5]" />
        <h1 className="text-2xl font-bold text-white">Phim bộ</h1>
      </div>

      {movies.items.length > 0 ? (
        <>
          <MovieRow title="" href="" movies={movies.items} />

          {/* Pagination */}
          {movies.total > 24 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {currentPage > 1 && (
                <Link
                  href={`/phim-bo?page=${currentPage - 1}`}
                  className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
                >
                  Trang trước
                </Link>
              )}
              <span className="px-4 text-sm text-[#8896a9]">
                Trang {currentPage} / {Math.ceil(movies.total / 24)}
              </span>
              {currentPage < Math.ceil(movies.total / 24) && (
                <Link
                  href={`/phim-bo?page=${currentPage + 1}`}
                  className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
                >
                  Trang sau
                </Link>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Tv2 size={64} className="mb-6 text-[#4a5568]" />
          <h2 className="mb-3 text-xl font-semibold text-white">Chưa có phim bộ</h2>
          <p className="text-[#8896a9]">Chạy sync để tải phim về database.</p>
        </div>
      )}
    </div>
  );
}
