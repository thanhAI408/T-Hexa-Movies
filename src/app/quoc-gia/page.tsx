import type { Metadata } from "next";
import Link from "next/link";

import { Globe, Clapperboard } from "lucide-react";
import { getTaxonomyOptions, listMovies } from "@/lib/catalog/repository";
import { MovieRow } from "@/components/movie/movie-row";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quốc gia",
  description: "Khám phá phim theo quốc gia sản xuất: Việt Nam, Mỹ, Hàn Quốc, Trung Quốc và nhiều hơn nữa.",
};

interface Props {
  params: Promise<{ slug?: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function CountryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));
  const offset = (currentPage - 1) * 24;

  const countries = await getTaxonomyOptions("countries");

  if (!slug) {
    // Country list page
    return (
      <div className="container py-8">
        <h1 className="mb-6 text-2xl font-bold text-white">Quốc gia</h1>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {countries.map((country) => (
            <Link
              key={country.slug}
              href={`/quoc-gia/${country.slug}`}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 text-white transition hover:border-white/25 hover:bg-white/[0.08]"
            >
              <span className="font-medium">{country.name}</span>
              <span className="text-sm text-[#8896a9]">{country.movieCount}</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const country = countries.find((c) => c.slug === slug);
  const movies = await listMovies({ country: slug, limit: 24, offset });

  return (
    <div className="container py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm">
        <Link href="/quoc-gia" className="text-[#8896a9] hover:text-white">
          Quốc gia
        </Link>
        <span className="text-[#5a6577]">/</span>
        <span className="text-white">{country?.name ?? slug}</span>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-white">
        {country?.name ?? slug}
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
                  href={`/quoc-gia/${slug}?page=${currentPage - 1}`}
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
                  href={`/quoc-gia/${slug}?page=${currentPage + 1}`}
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
          <Globe size={64} className="mb-6 text-[#4a5568]" />
          <h2 className="mb-3 text-xl font-semibold text-white">Chưa có phim</h2>
          <p className="text-[#8896a9]">Không tìm thấy phim nào từ quốc gia này.</p>
        </div>
      )}
    </div>
  );
}
