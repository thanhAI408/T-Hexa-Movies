"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Search, X, Loader2, Film, Filter, ChevronDown, ChevronUp, Star,
  Calendar, Sparkles, Play, Clock, TrendingUp, Award, Globe,
  Clapperboard, Tv, Flame
} from "lucide-react";
import type { StoreConfig } from "@/lib/stores/config";

interface TaxonomyItem {
  id: string;
  name: string;
  slug: string;
}

interface ExploreData {
  provider: string;
  store: string;
  categories: { id: string; name: string; slug: string; emoji: string }[];
  genres: TaxonomyItem[];
  countries: TaxonomyItem[];
  years: number[];
  regions?: { slug: string; name: string; emoji: string }[];
  filters: {
    hasGenres: boolean;
    hasCountries: boolean;
    hasYears: boolean;
    hasRegions: boolean;
    hasQuality: boolean;
    hasSort: boolean;
  };
}

interface StoreExplorerProps {
  store: StoreConfig;
}

const SORT_OPTIONS = [
  { value: "modified", label: "✨ Mới cập nhật", icon: Clock },
  { value: "year", label: "📅 Năm mới nhất", icon: Calendar },
  { value: "view", label: "👁️ Xem nhiều", icon: TrendingUp },
];

function StoreExplorerContent({ store }: StoreExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const kind = searchParams.get("kind") || "latest";
  const genre = searchParams.get("genre") || "";
  const country = searchParams.get("country") || "";
  const year = searchParams.get("year") || "";
  const sort = searchParams.get("sort") || "modified";
  const q = searchParams.get("q") || "";

  const [exploreData, setExploreData] = useState<ExploreData | null>(null);
  const [loadingExplore, setLoadingExplore] = useState(true);
  const [movies, setMovies] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 24 });
  const [loadingMovies, setLoadingMovies] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [localQuery, setLocalQuery] = useState(q);

  // Fetch explore data
  useEffect(() => {
    async function fetchExplore() {
      try {
        const response = await fetch(`/api/stores/${store.slug}/explore`);
        if (response.ok) {
          const data = await response.json();
          setExploreData(data);
        }
      } catch (error) {
        console.error("Failed to fetch explore:", error);
      } finally {
        setLoadingExplore(false);
      }
    }

    fetchExplore();
  }, [store.slug]);

  // Fetch movies with ALL filters
  const fetchMovies = useCallback(async () => {
    setLoadingMovies(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "24",
        sort: sort,
      });

      if (kind && kind !== "latest") params.set("kind", kind);
      if (genre) params.set("genre", genre);
      if (country) params.set("country", country);
      if (year) params.set("year", year);
      if (q) params.set("q", q);

      const response = await fetch(`/api/stores/${store.slug}/discover?${params}`);

      if (response.ok) {
        const data = await response.json();
        setMovies(data.items || []);
        setPagination(data.pagination || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 24 });
      }
    } catch (error) {
      console.error("Failed to fetch movies:", error);
    } finally {
      setLoadingMovies(false);
    }
  }, [store.slug, page, kind, genre, country, year, sort, q]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  // Update filter
  const updateFilter = useCallback((key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.set("page", "1");
    router.push(`${pathname}?${newParams.toString()}`);
  }, [router, pathname, searchParams]);

  // Search
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams.toString());
    if (localQuery.trim()) {
      newParams.set("q", localQuery.trim());
    } else {
      newParams.delete("q");
    }
    newParams.set("page", "1");
    router.push(`${pathname}?${newParams.toString()}`);
  }, [localQuery, router, pathname, searchParams]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    const newParams = new URLSearchParams();
    newParams.set("kind", kind);
    newParams.set("page", "1");
    router.push(`${pathname}?${newParams.toString()}`);
  }, [router, pathname, kind]);

  // Active filters count
  const activeFiltersCount = [genre, country, year, q].filter(Boolean).length;

  const currentCategory = exploreData?.categories.find(c => c.id === kind);

  if (loadingExplore) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin" style={{ color: store.theme.primary }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <form onSubmit={handleSearch}>
        <div
          className="relative flex items-center rounded-2xl border transition-all duration-300"
          style={{
            background: store.theme.surface,
            borderColor: q ? store.theme.primary : store.theme.border,
            boxShadow: q ? `0 0 0 3px ${store.theme.primaryMuted}` : store.theme.shadowSm,
          }}
        >
          <Search size={20} className="absolute left-4" style={{ color: store.theme.textMuted }} />
          <input
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Tìm kiếm phim theo tên, diễn viên..."
            className="w-full rounded-2xl border-0 bg-transparent px-12 py-4 text-base outline-none"
            style={{ color: store.theme.text, background: "transparent" }}
          />
          {localQuery && (
            <button
              type="button"
              onClick={() => { setLocalQuery(""); updateFilter("q", ""); }}
              className="absolute right-4 rounded-full p-1 hover:bg-white/10"
              style={{ color: store.theme.textMuted }}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </form>

      {/* Category Tabs */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-2">
          {exploreData?.categories.map((cat) => {
            const isActive = kind === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => updateFilter("kind", cat.id)}
                className="group shrink-0 rounded-full px-5 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-300 hover:scale-105"
                style={{
                  background: isActive ? store.theme.gradientAccent : "transparent",
                  color: isActive ? store.theme.textInverse : store.theme.textSecondary,
                  border: `1px solid ${isActive ? "transparent" : store.theme.border}`,
                  boxShadow: isActive ? `0 4px 20px ${store.theme.glow}` : "none",
                }}
              >
                <span className="mr-2">{cat.emoji}</span>
                {cat.name.replace(/^[^\s]+\s/, "")}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Genre Filters - Always Visible */}
      {exploreData?.genres && exploreData.genres.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium" style={{ color: store.theme.textMuted }}>
            <Sparkles size={14} />
            <span>Thể loại nhanh</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {exploreData.genres.slice(0, 8).map((g) => {
              const isActive = genre === g.slug;
              return (
                <button
                  key={g.slug}
                  onClick={() => updateFilter("genre", isActive ? "" : g.slug)}
                  className="rounded-full px-3 py-1.5 text-xs font-medium transition-all hover:scale-105"
                  style={{
                    background: isActive ? store.theme.primary : `${store.theme.primaryMuted}`,
                    color: isActive ? store.theme.textInverse : store.theme.textSecondary,
                  }}
                >
                  {g.name}
                </button>
              );
            })}
            {exploreData.genres.length > 8 && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="rounded-full px-3 py-1.5 text-xs font-medium transition-all hover:scale-105"
                style={{
                  background: "transparent",
                  color: store.theme.primary,
                  border: `1px solid ${store.theme.primary}`,
                }}
              >
                +{exploreData.genres.length - 8} thể loại
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quick Country Filters - Always Visible */}
      {exploreData?.countries && exploreData.countries.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium" style={{ color: store.theme.textMuted }}>
            <Globe size={14} />
            <span>Quốc gia</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {exploreData.countries.slice(0, 6).map((c) => {
              const isActive = country === c.slug;
              return (
                <button
                  key={c.slug}
                  onClick={() => updateFilter("country", isActive ? "" : c.slug)}
                  className="rounded-full px-3 py-1.5 text-xs font-medium transition-all hover:scale-105"
                  style={{
                    background: isActive ? store.theme.secondary : "transparent",
                    color: isActive ? store.theme.textInverse : store.theme.textSecondary,
                    border: `1px solid ${store.theme.border}`,
                  }}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all hover:scale-105"
          style={{
            background: showFilters ? store.theme.primaryMuted : store.theme.surface,
            borderColor: showFilters ? store.theme.primary : store.theme.border,
            color: showFilters ? store.theme.primary : store.theme.text,
          }}
        >
          <Filter size={18} />
          <span>Bộ lọc nâng cao</span>
          {activeFiltersCount > 0 && (
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
              style={{ background: store.theme.primary, color: store.theme.textInverse }}
            >
              {activeFiltersCount}
            </span>
          )}
          {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {/* Sort */}
        <div className="relative">
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all hover:scale-105"
            style={{
              background: store.theme.surface,
              borderColor: store.theme.border,
              color: store.theme.text,
            }}
          >
            <Star size={18} style={{ color: store.theme.primary }} />
            <span>{SORT_OPTIONS.find(s => s.value === sort)?.label}</span>
            <ChevronDown size={18} />
          </button>

          {showSortDropdown && (
            <div
              className="absolute left-0 top-full z-50 mt-2 min-w-[200px] overflow-hidden rounded-2xl border shadow-xl"
              style={{ background: store.theme.surface, borderColor: store.theme.border }}
            >
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => { updateFilter("sort", option.value); setShowSortDropdown(false); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-white/5"
                  style={{
                    background: sort === option.value ? store.theme.primaryMuted : "transparent",
                    color: sort === option.value ? store.theme.primary : store.theme.text,
                  }}
                >
                  <option.icon size={16} />
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active Filter Pills */}
        {genre && exploreData?.genres.find(g => g.slug === genre) && (
          <button
            onClick={() => updateFilter("genre", "")}
            className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all hover:scale-105"
            style={{ background: `${store.theme.primaryMuted}`, color: store.theme.primary }}
          >
            <Sparkles size={14} />
            {exploreData.genres.find(g => g.slug === genre)?.name}
            <X size={14} />
          </button>
        )}

        {country && exploreData?.countries.find(c => c.slug === country) && (
          <button
            onClick={() => updateFilter("country", "")}
            className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all hover:scale-105"
            style={{ background: `${store.theme.secondary}30`, color: store.theme.secondary }}
          >
            <Globe size={14} />
            {exploreData.countries.find(c => c.slug === country)?.name}
            <X size={14} />
          </button>
        )}

        {year && (
          <button
            onClick={() => updateFilter("year", "")}
            className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all hover:scale-105"
            style={{ background: `${store.theme.accent}30`, color: store.theme.accent }}
          >
            <Calendar size={14} />
            {year}
            <X size={14} />
          </button>
        )}

        {activeFiltersCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-sm underline transition-colors hover:opacity-80"
            style={{ color: store.theme.textMuted }}
          >
            Xóa tất cả
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div
          className="rounded-2xl border p-6 backdrop-blur-xl"
          style={{ background: `${store.theme.surface}f0`, borderColor: store.theme.border }}
        >
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Genres */}
            {exploreData?.filters.hasGenres && exploreData.genres.length > 0 && (
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: store.theme.text }}>
                  <Sparkles size={16} style={{ color: store.theme.primary }} />
                  Thể loại
                  <span className="ml-auto text-xs font-normal" style={{ color: store.theme.textMuted }}>
                    {exploreData.genres.length}
                  </span>
                </h4>
                <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto pr-2">
                  {exploreData.genres.map((g) => {
                    const isActive = genre === g.slug;
                    return (
                      <button
                        key={g.slug}
                        onClick={() => updateFilter("genre", isActive ? "" : g.slug)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:scale-105"
                        style={{
                          background: isActive ? store.theme.primary : `${store.theme.primaryMuted}`,
                          color: isActive ? store.theme.textInverse : store.theme.textSecondary,
                        }}
                      >
                        {g.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Countries */}
            {exploreData?.filters.hasCountries && exploreData.countries.length > 0 && (
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: store.theme.text }}>
                  <Globe size={16} style={{ color: store.theme.secondary }} />
                  Quốc gia
                  <span className="ml-auto text-xs font-normal" style={{ color: store.theme.textMuted }}>
                    {exploreData.countries.length}
                  </span>
                </h4>
                <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto pr-2">
                  {exploreData.countries.slice(0, 30).map((c) => {
                    const isActive = country === c.slug;
                    return (
                      <button
                        key={c.slug}
                        onClick={() => updateFilter("country", isActive ? "" : c.slug)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:scale-105"
                        style={{
                          background: isActive ? store.theme.secondary : `${store.theme.secondary}15`,
                          color: isActive ? store.theme.textInverse : store.theme.textSecondary,
                        }}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Years */}
            {exploreData?.filters.hasYears && exploreData.years.length > 0 && (
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: store.theme.text }}>
                  <Calendar size={16} style={{ color: store.theme.accent }} />
                  Năm phát hành
                </h4>
                <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto pr-2">
                  {exploreData.years.map((y) => {
                    const isActive = year === String(y);
                    return (
                      <button
                        key={y}
                        onClick={() => updateFilter("year", isActive ? "" : String(y))}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:scale-105"
                        style={{
                          background: isActive ? store.theme.accent : `${store.theme.accent}15`,
                          color: isActive ? store.theme.textInverse : store.theme.textSecondary,
                        }}
                      >
                        {y}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Show empty state if no filters available */}
            {!exploreData?.filters.hasGenres && !exploreData?.filters.hasCountries && !exploreData?.filters.hasYears && (
              <div className="col-span-full py-8 text-center">
                <p style={{ color: store.theme.textMuted }}>
                  Kho phim này chưa hỗ trợ bộ lọc nâng cao. Sử dụng category và sắp xếp để khám phá.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: store.theme.text }}>
            {currentCategory?.emoji} {currentCategory?.name.replace(/^[^\s]+\s/, "") || "Tất cả phim"}
          </h2>
          <p className="text-sm" style={{ color: store.theme.textMuted }}>
            {loadingMovies ? "Đang tải..." : `${pagination.totalItems.toLocaleString()} phim`}
            {q && <span> cho "<span style={{ color: store.theme.primary }}>{q}</span>"</span>}
          </p>
        </div>
      </div>

      {/* Loading State */}
      {loadingMovies && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-[2/3] rounded-2xl animate-pulse" style={{ background: store.theme.surface }} />
              <div className="h-4 w-3/4 rounded animate-pulse" style={{ background: store.theme.surface }} />
            </div>
          ))}
        </div>
      )}

      {/* Movies Grid */}
      {!loadingMovies && movies.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {movies.map((movie: any) => (
              <a
                key={movie.providerMovieId || movie.providerSlug || movie.slug}
                href={`/stores/${store.slug}/movie/${movie.providerSlug || movie.slug}`}
                className="group block transition-transform hover:scale-105"
              >
                <div
                  className="relative aspect-[2/3] overflow-hidden rounded-2xl border"
                  style={{ borderColor: store.theme.border }}
                >
                  {(movie.posterUrl || movie.thumb_url || movie.poster_url) ? (
                    <img
                      src={movie.posterUrl || movie.thumb_url || movie.poster_url}
                      alt={movie.title || movie.name || "Movie"}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center" style={{ background: store.theme.surface }}>
                      <Film size={32} style={{ color: store.theme.textMuted }} />
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 transition-all group-hover:opacity-100"
                    style={{ background: `linear-gradient(to top, ${store.theme.background}ee 0%, transparent 100%)` }}
                  >
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-full"
                      style={{ background: store.theme.gradientAccent, boxShadow: `0 4px 20px ${store.theme.glow}` }}
                    >
                      <Play size={24} fill="white" className="ml-0.5" style={{ color: "white" }} />
                    </div>
                    <span className="text-sm font-semibold text-white">Xem ngay</span>
                  </div>

                  {/* Quality Badge */}
                  {(movie.quality || (movie.tmdb && movie.tmdb.vote_average)) && (
                    <span
                      className="absolute left-2 top-2 rounded-md px-2 py-0.5 text-xs font-bold text-white"
                      style={{ background: store.theme.primary }}
                    >
                      {movie.quality || `⭐ ${movie.tmdb.vote_average}`}
                    </span>
                  )}

                  {/* Type Badge */}
                  {(movie.type === "series" || movie.type === "hoathinh" || movie.type === "tvshows") && (
                    <span className="absolute right-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-xs text-white">
                      {movie.type === "series" ? "📺 Bộ" : "🎨"}
                    </span>
                  )}
                </div>

                <h3
                  className="mt-2 line-clamp-2 text-sm font-medium leading-tight"
                  style={{ color: store.theme.text }}
                >
                  {movie.title || movie.name}
                </h3>
                {movie.year && (
                  <p className="mt-1 text-xs" style={{ color: store.theme.textMuted }}>
                    {movie.year}
                  </p>
                )}
              </a>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => updateFilter("page", String(page - 1))}
                disabled={page <= 1}
                className="flex h-10 w-10 items-center justify-center rounded-xl border transition-all disabled:opacity-50 hover:scale-105"
                style={{ borderColor: store.theme.border, color: store.theme.text, background: store.theme.surface }}
              >
                ‹
              </button>

              {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) pageNum = i + 1;
                else if (page <= 3) pageNum = i + 1;
                else if (page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                else pageNum = page - 2 + i;

                const isActive = page === pageNum;
                return (
                  <button
                    key={pageNum}
                    onClick={() => updateFilter("page", String(pageNum))}
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

              <button
                onClick={() => updateFilter("page", String(page + 1))}
                disabled={page >= pagination.totalPages}
                className="flex h-10 w-10 items-center justify-center rounded-xl border transition-all disabled:opacity-50 hover:scale-105"
                style={{ borderColor: store.theme.border, color: store.theme.text, background: store.theme.surface }}
              >
                ›
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!loadingMovies && movies.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Film size={64} style={{ color: store.theme.textMuted }} />
          <p className="mt-4 text-lg font-semibold" style={{ color: store.theme.text }}>
            Không tìm thấy phim
          </p>
          <p className="mt-2 text-sm" style={{ color: store.theme.textMuted }}>
            Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
          </p>
        </div>
      )}
    </div>
  );
}

export function StoreExplorer(props: StoreExplorerProps) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin" />
      </div>
    }>
      <StoreExplorerContent {...props} />
    </Suspense>
  );
}