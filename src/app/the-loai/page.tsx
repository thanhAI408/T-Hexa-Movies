import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { ArrowLeft, Clapperboard, Loader2 } from "lucide-react";
import { getTaxonomyOptions, listMovies } from "@/lib/catalog/repository";
import { MovieRow } from "@/components/movie/movie-row";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thể loại phim",
  description: "Khám phá phim theo thể loại: hành động, tình cảm, kinh dị, hoạt hình và nhiều hơn nữa.",
};

interface Props {
  params: Promise<{ slug?: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function GenrePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));
  const offset = (currentPage - 1) * 24;

  const genres = await getTaxonomyOptions("genres");

  if (!slug) {
    // Genre list page
    return (
      <div className="container py-8">
        <h1 className="mb-6 text-2xl font-bold text-white">Thể loại phim</h1>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {genres.map((genre) => (
            <Link
              key={genre.slug}
              href={`/the-loai/${genre.slug}`}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 text-white transition hover:border-white/25 hover:bg-white/[0.08]"
            >
              <span className="font-medium">{genre.name}</span>
              <span className="text-sm text-[#8896a9]">{genre.movieCount}</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const genre = genres.find((g) => g.slug === slug);
  const movies = await listMovies({ genre: slug, limit: 24, offset });

  return (
    <div className="container py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm">
        <Link href="/the-loai" className="text-[#8896a9] hover:text-white">
          Thể loại
        </Link>
        <span className="text-[#5a6577]">/</span>
        <span className="text-white">{genre?.name ?? slug}</span>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-white">
        {genre?.name ?? slug}
        <span className="ml-3 text-lg font-normal text-[#8896a9]">
          ({movies.total.toLocaleString()} phim)
        </span>
      </h1>

      {movies.items.length > 0 ? (
        <>
          <MovieRow title="" href="" movies={movies.items} />

          {/* Pagination */}
          {movies.total > 24 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {currentPage > 1 && (
                <Link
                  href={`/the-loai/${slug}?page=${currentPage - 1}`}
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
                  href={`/the-loai/${slug}?page=${currentPage + 1}`}
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
          <Clapperboard size={64} className="mb-6 text-[#4a5568]" />
          <h2 className="mb-3 text-xl font-semibold text-white">Chưa có phim</h2>
          <p className="text-[#8896a9]">Không tìm thấy phim nào trong thể loại này.</p>
        </div>
      )}
    </div>
  );
}
