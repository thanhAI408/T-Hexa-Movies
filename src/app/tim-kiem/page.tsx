"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";

import { Search, Film, Loader2 } from "lucide-react";
import { MovieRow } from "@/components/movie/movie-row";
import type { CanonicalMovieView } from "@/types/catalog";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") ?? "";
  const [result, setResult] = useState<{
    query: string;
    movies: CanonicalMovieView[];
    total: number;
  }>({ query: "", movies: [], total: 0 });
  const hasQuery = query.trim().length > 0;
  const hasCurrentResult = hasQuery && result.query === query;
  const movies = hasCurrentResult ? result.movies : [];
  const total = hasCurrentResult ? result.total : 0;
  const loading = hasQuery && !hasCurrentResult;

  useEffect(() => {
    if (!hasQuery) return;

    const controller = new AbortController();

    fetch(`/api/search?q=${encodeURIComponent(query)}&limit=60`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        setResult({
          query,
          movies: data.items ?? [],
          total: data.total ?? 0,
        });
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Search error:", err);
          setResult({ query, movies: [], total: 0 });
        }
      });

    return () => controller.abort();
  }, [hasQuery, query]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const q = formData.get("q") as string;
    if (q.trim()) {
      router.push(`/tim-kiem?q=${encodeURIComponent(q.trim())}`);
    }
  };

  return (
    <div className="container py-8">
      {/* Search form */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search
              size={20}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8793a5]"
            />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Tìm tên phim, diễn viên, đạo diễn..."
              autoFocus
              className="h-12 w-full rounded-full border border-white/10 bg-white/[0.055] pl-12 pr-4 text-white outline-none transition placeholder:text-[#778396] hover:border-white/16 focus:border-[#f4b55e]/60 focus:bg-[#121923]"
            />
          </div>
          <button
            type="submit"
            className="rounded-full bg-white px-6 font-bold text-[#0b1017] transition hover:bg-[#f2f4f8]"
          >
            Tìm kiếm
          </button>
        </div>
      </form>

      {/* Results */}
      {hasQuery && loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[#f4b55e]" />
        </div>
      ) : hasCurrentResult ? (
        <>
          <div className="mb-6 flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">Kết quả tìm kiếm</h1>
            <span className="text-sm text-[#8896a9]">
              &quot;{query}&quot; — {total.toLocaleString()} phim
            </span>
          </div>

          {movies.length > 0 ? (
            <MovieRow title="Kết quả" href="" movies={movies} />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Film size={64} className="mb-6 text-[#4a5568]" />
              <h2 className="mb-3 text-xl font-semibold text-white">
                Không tìm thấy phim nào
              </h2>
              <p className="mb-6 text-[#8896a9]">
                Thử tìm kiếm với từ khóa khác hoặc kiểm tra chính tả.
              </p>
              <Link
                href="/"
                className="rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Quay về trang chủ
              </Link>
            </div>
          )}
        </>
      ) : !hasQuery ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search size={64} className="mb-6 text-[#4a5568]" />
          <h2 className="mb-3 text-xl font-semibold text-white">
            Tìm kiếm phim
          </h2>
          <p className="text-[#8896a9]">
            Nhập từ khóa để tìm kiếm trong kho phim.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 size={32} className="animate-spin text-[#f4b55e]" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
