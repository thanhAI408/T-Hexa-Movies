"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Play, Star, Loader2, Search, X, ArrowUpDown, ChevronDown, Film } from "lucide-react";
import type { StoreConfig } from "@/lib/stores/config";
import type { ProviderMovieInput, Pagination } from "@/types/catalog";
import { StoreFilters } from "./store-filters";

interface MovieGridProps {
  store: StoreConfig;
}

interface MovieState {
  items: ProviderMovieInput[];
  pagination: Pagination;
  loading: boolean;
  error: string | null;
}

type SortOption = "updated" | "year_desc" | "year_asc" | "title";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "updated", label: "✨ Mới cập nhật" },
  { value: "year_desc", label: "📅 Năm mới nhất" },
  { value: "year_asc", label: "📅 Năm cũ nhất" },
  { value: "title", label: "🔤 A-Z" },
];

function MovieGridContent({ store }: MovieGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get all filter params from URL
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const searchQuery = searchParams.get("q") ?? "";
  const kind = searchParams.get("kind") || "latest";
  const sortBy = (searchParams.get("sort") ?? "updated") as SortOption;

  const [state, setState] = useState<MovieState>({
    items: [],
    pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 24 },
    loading: true,
    error: null,
  });
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());
  const gridRef = useRef<HTMLDivElement>(null);

  const fetchMovies = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "24",
        sort: sortBy,
      });

      // Add kind filter (provider-specific category)
      if (kind && kind !== "latest") {
        params.set("kind", kind);
      }

      // Add search query
      if (searchQuery) {
        params.set("q", searchQuery);
      }

      const response = await fetch(`/api/stores/${store.slug}/movies?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();

      setState({
        items: data.items || [],
        pagination: data.pagination || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 24 },
        loading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load movies",
      }));
    }
  }, [store.slug, page, searchQuery, sortBy, kind]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  // Animate items on scroll
  useEffect(() => {
    if (state.items.length === 0 || state.loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const key = entry.target.getAttribute("data-key");
            if (key) {
              setVisibleItems((prev) => new Set([...prev, key]));
            }
          }
        });
      },
      { threshold: 0.1, rootMargin: "50px" }
    );

    const items = gridRef.current?.querySelectorAll("[data-key]");
    items?.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [state.items, state.loading]);

  // Sync local query with URL
  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const newParams = new URLSearchParams(searchParams.toString());
      if (localQuery.trim()) {
        newParams.set("q", localQuery.trim());
        newParams.set("page", "1");
      } else {
        newParams.delete("q");
        newParams.set("page", "1");
      }
      router.push(`${pathname}?${newParams.toString()}`);
    },
    [localQuery, router, pathname, searchParams]
  );

  const clearSearch = useCallback(() => {
    setLocalQuery("");
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.delete("q");
    newParams.set("page", "1");
    router.push(`${pathname}?${newParams.toString()}`);
  }, [router, pathname, searchParams]);

  const handleSortChange = useCallback(
    (newSort: SortOption) => {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set("sort", newSort);
      newParams.set("page", "1");
      setShowSortDropdown(false);
      router.push(`${pathname}?${newParams.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set("page", String(newPage));
      router.push(`${pathname}?${newParams.toString()}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [router, pathname, searchParams]
  );

  // Loading skeleton
  if (state.loading) {
    return (
      <div>
        {/* Search skeleton */}
        <div className="mb-6 flex gap-4">
          <div className="h-12 flex-1 rounded-2xl animate-pulse" style={{ background: store.theme.surface }} />
          <div className="h-12 w-40 rounded-2xl animate-pulse" style={{ background: store.theme.surface }} />
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-[2/3] rounded-2xl animate-pulse" style={{ background: store.theme.surface }} />
              <div className="h-4 w-3/4 rounded animate-pulse" style={{ background: store.theme.surface }} />
              <div className="h-3 w-1/2 rounded animate-pulse" style={{ background: store.theme.surface }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (state.error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div
          className="rounded-2xl border p-8 text-center transition-all duration-300 hover:scale-105"
          style={{
            borderColor: `${store.theme.primary}40`,
            background: `${store.theme.surface}80`,
          }}
        >
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: `${store.theme.primary}15` }}
          >
            <X size={32} style={{ color: store.theme.primary }} />
          </div>
          <p className="text-lg font-semibold" style={{ color: store.theme.text }}>
            Đã xảy ra lỗi
          </p>
          <p className="mt-2 text-sm" style={{ color: store.theme.textMuted }}>
            {state.error}
          </p>
          <button
            onClick={fetchMovies}
            className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium transition-all hover:scale-105"
            style={{
              background: store.theme.primary,
              color: store.theme.textInverse,
            }}
          >
            <Loader2 size={18} className="animate-spin" />
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div
          className="relative flex items-center rounded-2xl border transition-all duration-300 focus-within:scale-[1.01]"
          style={{
            background: store.theme.surface,
            borderColor: searchQuery ? store.theme.primary : store.theme.border,
            boxShadow: searchQuery ? `0 0 0 3px ${store.theme.primaryMuted}` : store.theme.shadowSm,
          }}
        >
          <Search size={20} className="absolute left-4" style={{ color: store.theme.textMuted }} />
          <input
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Tìm kiếm phim..."
            className="w-full rounded-2xl border-0 bg-transparent px-12 py-4 text-base outline-none transition-all"
            style={{ color: store.theme.text, background: "transparent" }}
          />
          {localQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-4 rounded-full p-1 transition-colors hover:bg-white/10"
              style={{ color: store.theme.textMuted }}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </form>

      {/* Category Tabs & Filters */}
      <StoreFilters store={store} />

      {/* Results Info */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm" style={{ color: store.theme.textMuted }}>
          {searchQuery ? (
            <>
              Kết quả cho <span className="font-semibold" style={{ color: store.theme.primary }}>"{searchQuery}"</span>
              {" "}- {state.pagination.totalItems} phim
            </>
          ) : (
            <>
              <span className="font-semibold" style={{ color: store.theme.primary }}>{state.pagination.totalItems}</span> phim
            </>
          )}
        </p>

        {/* Sort Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all duration-300 hover:scale-[1.02]"
            style={{
              background: store.theme.surface,
              borderColor: store.theme.border,
              color: store.theme.text,
            }}
          >
            <ArrowUpDown size={16} style={{ color: store.theme.primary }} />
            <span>{SORT_OPTIONS.find((s) => s.value === sortBy)?.label}</span>
            <ChevronDown size={16} className={`transition-transform ${showSortDropdown ? "rotate-180" : ""}`} />
          </button>

          {showSortDropdown && (
            <div
              className="absolute right-0 top-full z-50 mt-2 min-w-[180px] overflow-hidden rounded-2xl border shadow-xl"
              style={{
                background: store.theme.surface,
                borderColor: store.theme.border,
                boxShadow: store.theme.shadowLg,
              }}
            >
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSortChange(option.value)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-white/5"
                  style={{
                    background: option.value === sortBy ? `${store.theme.primaryMuted}` : "transparent",
                    color: option.value === sortBy ? store.theme.primary : store.theme.text,
                    fontWeight: option.value === sortBy ? 600 : 400,
                  }}
                >
                  {option.value === sortBy && (
                    <div className="h-2 w-2 rounded-full" style={{ background: store.theme.primary }} />
                  )}
                  <span className={option.value === sortBy ? "ml-4" : ""}>{option.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Empty State */}
      {state.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Film size={64} className="mb-4" style={{ color: store.theme.textMuted }} />
          <p className="text-lg font-semibold" style={{ color: store.theme.text }}>
            Không tìm thấy phim
          </p>
          <p className="mt-2 text-sm" style={{ color: store.theme.textMuted }}>
            {searchQuery ? "Thử từ khóa khác" : "Danh sách đang cập nhật"}
          </p>
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium transition-all hover:scale-105"
              style={{
                background: store.theme.primary,
                color: store.theme.textInverse,
              }}
            >
              <X size={18} />
              Xóa tìm kiếm
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Movie Grid */}
          <div
            ref={gridRef}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          >
            {state.items.map((movie, index) => (
              <Link
                key={movie.providerMovieId || movie.providerSlug}
                href={`/stores/${store.slug}/movie/${movie.providerSlug}`}
                data-key={movie.providerSlug}
                className="group block transition-all duration-500"
                style={{
                  transform: visibleItems.has(movie.providerSlug) ? "translateY(0)" : "translateY(20px)",
                  opacity: visibleItems.has(movie.providerSlug) ? 1 : 0,
                  transitionDelay: `${(index % 12) * 50}ms`,
                }}
              >
                {/* Poster */}
                <div
                  className="relative aspect-[2/3] overflow-hidden rounded-2xl border transition-all duration-500 group-hover:scale-105"
                  style={{
                    borderColor: store.theme.border,
                    boxShadow: store.theme.shadowSm,
                  }}
                >
                  {/* Poster Image */}
                  {movie.posterUrl ? (
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center"
                      style={{ background: store.theme.surface }}
                    >
                      <Film size={48} style={{ color: store.theme.textMuted }} />
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-0 transition-all duration-300 group-hover:opacity-100"
                    style={{
                      background: `linear-gradient(to top, ${store.theme.background}ee 0%, ${store.theme.background}99 50%, transparent 100%)`,
                    }}
                  >
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110"
                      style={{
                        background: store.theme.gradientAccent,
                        boxShadow: `0 8px 30px ${store.theme.glow}`,
                      }}
                    >
                      <Play size={28} fill="white" className="ml-1" style={{ color: "white" }} />
                    </div>
                    <span className="text-sm font-semibold text-white">Xem ngay</span>
                  </div>

                  {/* Quality Badge */}
                  {movie.quality && (
                    <span
                      className="absolute left-2 top-2 rounded-md px-2 py-1 text-xs font-bold text-white"
                      style={{
                        background: store.theme.primary,
                        boxShadow: `0 2px 10px ${store.theme.glow}`,
                      }}
                    >
                      {movie.quality}
                    </span>
                  )}

                  {/* Type Badge */}
                  {movie.type && (
                    <span
                      className="absolute right-2 top-2 rounded-md px-2 py-1 text-xs font-medium text-white"
                      style={{ background: "rgba(0,0,0,0.7)" }}
                    >
                      {movie.type === "series" ? "Bộ" : movie.type === "animation" ? "Anime" : "Lẻ"}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="mt-3">
                  <h3
                    className="line-clamp-2 text-sm font-semibold leading-tight transition-colors group-hover:opacity-80"
                    style={{
                      color: store.theme.text,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {movie.title}
                  </h3>
                  {movie.year && (
                    <p className="mt-1 text-xs" style={{ color: store.theme.textMuted }}>
                      {movie.year}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {state.pagination.totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-2">
              {/* Previous */}
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                style={{
                  borderColor: store.theme.border,
                  color: page <= 1 ? store.theme.textMuted : store.theme.text,
                  background: store.theme.surface,
                }}
              >
                <ChevronDown size={18} className="rotate-90" />
              </button>

              {/* Page numbers */}
              {[...Array(Math.min(5, state.pagination.totalPages))].map((_, i) => {
                let pageNum;
                if (state.pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= state.pagination.totalPages - 2) {
                  pageNum = state.pagination.totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                const isActive = page === pageNum;

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className="flex h-10 min-w-[40px] items-center justify-center rounded-xl border px-3 text-sm font-medium transition-all hover:scale-105"
                    style={{
                      background: isActive ? store.theme.gradientAccent : store.theme.surface,
                      borderColor: isActive ? "transparent" : store.theme.border,
                      color: isActive ? store.theme.textInverse : store.theme.text,
                      boxShadow: isActive ? store.theme.shadowGlow : "none",
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {/* Next */}
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= state.pagination.totalPages}
                className="flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                style={{
                  borderColor: store.theme.border,
                  color: page >= state.pagination.totalPages ? store.theme.textMuted : store.theme.text,
                  background: store.theme.surface,
                }}
              >
                <ChevronDown size={18} className="-rotate-90" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Wrap with Suspense for useSearchParams
export function MovieGrid(props: MovieGridProps) {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-[2/3] rounded-2xl animate-pulse" style={{ background: props.store.theme.surface }} />
              <div className="h-4 w-3/4 rounded animate-pulse" style={{ background: props.store.theme.surface }} />
            </div>
          ))}
        </div>
      }
    >
      <MovieGridContent {...props} />
    </Suspense>
  );
}
