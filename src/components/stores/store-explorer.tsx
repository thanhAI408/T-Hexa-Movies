"use client";

import { useState, useEffect, useCallback, useMemo, Suspense, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Search, X, Loader2, Film, Filter, ChevronDown, ChevronUp, Star,
  Calendar, Sparkles, Play, Clock, TrendingUp, Globe, Check, SlidersHorizontal,
  Layers, RefreshCw
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
  genresCount: number;
  countries: TaxonomyItem[];
  countriesCount: number;
  years: number[];
  yearsCount: number;
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
  { value: "modified", label: "Mới cập nhật", icon: Clock, emoji: "✨" },
  { value: "year", label: "Năm mới nhất", icon: Calendar, emoji: "📅" },
  { value: "view", label: "Xem nhiều nhất", icon: TrendingUp, emoji: "🔥" },
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

  // Modal / Drawer state for full taxanomy
  const [activeModal, setActiveModal] = useState<"genre" | "country" | "all" | null>(null);
  const [modalSearch, setModalSearch] = useState("");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [localQuery, setLocalQuery] = useState(q);

  const gridRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setShowSortDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync local query when URL changes
  useEffect(() => {
    setLocalQuery(q);
  }, [q]);

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
  const updateFilter = useCallback((key: string, value: string, shouldScroll = true) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    if (key !== "page") {
      newParams.set("page", "1");
    }
    router.push(`${pathname}?${newParams.toString()}`, { scroll: false });
    
    if (shouldScroll && gridRef.current) {
      const yOffset = -100;
      const y = gridRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
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
    router.push(`${pathname}?${newParams.toString()}`, { scroll: false });
  }, [localQuery, router, pathname, searchParams]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    const newParams = new URLSearchParams();
    newParams.set("kind", kind);
    newParams.set("page", "1");
    router.push(`${pathname}?${newParams.toString()}`, { scroll: false });
    setLocalQuery("");
  }, [router, pathname, kind]);

  // Active filters count
  const activeFiltersCount = [genre, country, year, q].filter(Boolean).length;

  const currentCategory = exploreData?.categories.find(c => c.id === kind);

  // Top popular genres & countries to showcase in quick bar without flooding the screen
  const popularGenres = useMemo(() => {
    if (!exploreData?.genres) return [];
    return exploreData.genres.slice(0, 10);
  }, [exploreData]);

  const popularCountries = useMemo(() => {
    if (!exploreData?.countries) return [];
    const prioritySlugs = ["viet-nam", "han-quoc", "trung-quoc", "au-my", "nhat-ban", "thai-lan", "hong-kong", "dai-loan", "anh", "phap"];
    const prioritized = exploreData.countries.filter(c => prioritySlugs.includes(c.slug));
    const others = exploreData.countries.filter(c => !prioritySlugs.includes(c.slug));
    return [...prioritized, ...others].slice(0, 8);
  }, [exploreData]);

  const popularYears = useMemo(() => {
    if (!exploreData?.years) return [];
    return exploreData.years.slice(0, 7);
  }, [exploreData]);

  // Filtered modal items based on search
  const filteredModalGenres = useMemo(() => {
    if (!exploreData?.genres) return [];
    if (!modalSearch.trim()) return exploreData.genres;
    return exploreData.genres.filter(g => 
      g.name.toLowerCase().includes(modalSearch.toLowerCase()) || 
      g.slug.toLowerCase().includes(modalSearch.toLowerCase())
    );
  }, [exploreData, modalSearch]);

  const filteredModalCountries = useMemo(() => {
    if (!exploreData?.countries) return [];
    if (!modalSearch.trim()) return exploreData.countries;
    return exploreData.countries.filter(c => 
      c.name.toLowerCase().includes(modalSearch.toLowerCase()) || 
      c.slug.toLowerCase().includes(modalSearch.toLowerCase())
    );
  }, [exploreData, modalSearch]);

  if (loadingExplore) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-4">
        <div 
          className="h-12 w-12 rounded-full border-3 border-transparent animate-spin"
          style={{ borderTopColor: store.theme.primary, borderRightColor: store.theme.secondary }}
        />
        <p className="text-sm font-medium tracking-wide" style={{ color: store.theme.textMuted }}>
          Đang chuẩn bị kho phim {store.name}...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-7" ref={gridRef}>
      {/* 1. TOP CONTROLS: Search Bar & Primary Category Tabs */}
      <div className="space-y-4">
        {/* Search Bar with Glass effect */}
        <form onSubmit={handleSearch} className="relative">
          <div
            className="group relative flex items-center rounded-2xl border transition-all duration-300 backdrop-blur-xl"
            style={{
              background: store.theme.surface,
              borderColor: q ? store.theme.primary : store.theme.border,
              boxShadow: q 
                ? `0 0 0 3px ${store.theme.primaryMuted}, ${store.theme.shadowSm}` 
                : store.theme.shadowSm,
            }}
          >
            <Search 
              size={20} 
              className="absolute left-4.5 transition-colors duration-300 group-focus-within:scale-110" 
              style={{ color: q ? store.theme.primary : store.theme.textMuted }} 
            />
            <input
              type="text"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              placeholder="Tìm kiếm phim, diễn viên, đạo diễn..."
              className="w-full rounded-2xl border-0 bg-transparent py-4 pl-12.5 pr-28 text-base font-normal outline-none transition-all"
              style={{ color: store.theme.text }}
            />
            <div className="absolute right-3 flex items-center gap-1.5">
              {localQuery && (
                <button
                  type="button"
                  onClick={() => { setLocalQuery(""); updateFilter("q", ""); }}
                  className="rounded-full p-1.5 transition-transform hover:scale-110"
                  style={{ color: store.theme.textMuted, background: `${store.theme.border}` }}
                  title="Xóa tìm kiếm"
                >
                  <X size={15} />
                </button>
              )}
              <button
                type="submit"
                className="rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-300 hover:scale-105"
                style={{
                  background: store.theme.gradientAccent,
                  color: store.theme.textInverse,
                  boxShadow: `0 2px 10px ${store.theme.glow}`,
                }}
              >
                Tìm
              </button>
            </div>
          </div>
        </form>

        {/* Category Tabs: Scrollable Pill Group */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {exploreData?.categories.map((cat) => {
            const isActive = kind === cat.id;
            return (
              <button
                type="button"
                key={cat.id}
                onClick={(e) => { e.preventDefault(); updateFilter("kind", cat.id); }}
                className="group relative flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold whitespace-nowrap transition-all duration-300 hover:scale-105 active:scale-95"
                style={{
                  background: isActive ? store.theme.gradientAccent : store.theme.surface,
                  color: isActive ? store.theme.textInverse : store.theme.textSecondary,
                  border: `1px solid ${isActive ? "transparent" : store.theme.border}`,
                  boxShadow: isActive ? `0 4px 18px ${store.theme.glow}` : store.theme.shadowSm,
                }}
              >
                <span className="text-base transition-transform group-hover:scale-110">{cat.emoji}</span>
                <span>{cat.name.replace(/^[^\s]+\s/, "")}</span>
                {isActive && (
                  <span 
                    className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. REFINED FILTER SYSTEM: Curated Quick Bars + Expandable All-Taxonomy Modal */}
      <div 
        className="rounded-2xl border p-4 sm:p-5 backdrop-blur-xl space-y-3.5"
        style={{
          background: store.theme.surface,
          borderColor: store.theme.border,
          boxShadow: store.theme.shadowSm,
        }}
      >
        {/* Row A: Curated Quick Genres */}
        {exploreData?.genres && exploreData.genres.length > 0 && (
          <div className="flex items-center gap-2">
            <div 
              className="flex shrink-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-wider min-w-[76px]"
              style={{ color: store.theme.textMuted }}
            >
              <Sparkles size={13} style={{ color: store.theme.primary }} />
              <span>Thể loại</span>
            </div>

            <div className="flex flex-1 items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {popularGenres.map((g) => {
                const isActive = genre === g.slug;
                return (
                  <button
                    type="button"
                    key={g.slug}
                    onClick={(e) => { e.preventDefault(); updateFilter("genre", isActive ? "" : g.slug); }}
                    className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{
                      background: isActive ? store.theme.primary : `${store.theme.primaryMuted}`,
                      color: isActive ? store.theme.textInverse : store.theme.textSecondary,
                      border: `1px solid ${isActive ? "transparent" : store.theme.border}`,
                    }}
                  >
                    {g.name}
                  </button>
                );
              })}

              {/* Button to open All 45 Genres Modal */}
              <button
                type="button"
                onClick={() => { setModalSearch(""); setActiveModal("genre"); }}
                className="shrink-0 flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all hover:scale-105"
                style={{
                  background: `${store.theme.surface}`,
                  color: store.theme.primary,
                  border: `1px dashed ${store.theme.primary}`,
                }}
              >
                <span>+{exploreData.genresCount - popularGenres.length} khác</span>
                <ChevronDown size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Row B: Curated Quick Countries */}
        {exploreData?.countries && exploreData.countries.length > 0 && (
          <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: `${store.theme.border}` }}>
            <div 
              className="flex shrink-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-wider min-w-[76px]"
              style={{ color: store.theme.textMuted }}
            >
              <Globe size={13} style={{ color: store.theme.secondary }} />
              <span>Quốc gia</span>
            </div>

            <div className="flex flex-1 items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {popularCountries.map((c) => {
                const isActive = country === c.slug;
                return (
                  <button
                    type="button"
                    key={c.slug}
                    onClick={(e) => { e.preventDefault(); updateFilter("country", isActive ? "" : c.slug); }}
                    className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{
                      background: isActive ? store.theme.secondary : "transparent",
                      color: isActive ? store.theme.textInverse : store.theme.textSecondary,
                      border: `1px solid ${isActive ? "transparent" : store.theme.border}`,
                    }}
                  >
                    {c.name}
                  </button>
                );
              })}

              {/* Button to open All 187 Countries Modal with Search */}
              <button
                type="button"
                onClick={() => { setModalSearch(""); setActiveModal("country"); }}
                className="shrink-0 flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all hover:scale-105"
                style={{
                  background: `${store.theme.surface}`,
                  color: store.theme.secondary,
                  border: `1px dashed ${store.theme.secondary}`,
                }}
              >
                <span>+{exploreData.countriesCount - popularCountries.length} quốc gia</span>
                <ChevronDown size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Row C: Quick Years & Advanced Filter / Sort Hub */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t" style={{ borderColor: `${store.theme.border}` }}>
          {/* Quick Years */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <div 
              className="flex shrink-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
              style={{ color: store.theme.textMuted }}
            >
              <Calendar size={13} style={{ color: store.theme.accent }} />
              <span>Năm:</span>
            </div>
            {popularYears.map((y) => {
              const isActive = year === String(y);
              return (
                <button
                  type="button"
                  key={y}
                  onClick={(e) => { e.preventDefault(); updateFilter("year", isActive ? "" : String(y)); }}
                  className="rounded-lg px-2.5 py-1 text-xs font-medium transition-all hover:scale-105"
                  style={{
                    background: isActive ? store.theme.accent : "transparent",
                    color: isActive ? store.theme.textInverse : store.theme.textSecondary,
                    border: `1px solid ${isActive ? "transparent" : store.theme.border}`,
                  }}
                >
                  {y}
                </button>
              );
            })}
          </div>

          {/* Action Tools: All Filters & Sort Dropdown */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Full Filter Modal Trigger */}
            <button
              type="button"
              onClick={() => { setModalSearch(""); setActiveModal("all"); }}
              className="flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all duration-200 hover:scale-105"
              style={{
                background: activeFiltersCount > 0 ? store.theme.primaryMuted : store.theme.surface,
                borderColor: activeFiltersCount > 0 ? store.theme.primary : store.theme.border,
                color: activeFiltersCount > 0 ? store.theme.primary : store.theme.text,
              }}
            >
              <SlidersHorizontal size={14} />
              <span>Bộ lọc</span>
              {activeFiltersCount > 0 && (
                <span
                  className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-bold"
                  style={{ background: store.theme.primary, color: store.theme.textInverse }}
                >
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Sort Dropdown */}
            <div className="relative" ref={sortDropdownRef}>
              <button
                type="button"
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all duration-200 hover:scale-105"
                style={{
                  background: store.theme.surface,
                  borderColor: store.theme.border,
                  color: store.theme.text,
                }}
              >
                <span>{SORT_OPTIONS.find(s => s.value === sort)?.emoji}</span>
                <span className="hidden sm:inline">{SORT_OPTIONS.find(s => s.value === sort)?.label}</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${showSortDropdown ? "rotate-180" : ""}`} />
              </button>

              {showSortDropdown && (
                <div
                  className="absolute right-0 top-full z-50 mt-2 min-w-[190px] overflow-hidden rounded-2xl border p-1.5 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150"
                  style={{ background: store.theme.surface, borderColor: store.theme.border }}
                >
                  {SORT_OPTIONS.map((option) => {
                    const isSelected = sort === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          updateFilter("sort", option.value);
                          setShowSortDropdown(false);
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                        style={{
                          background: isSelected ? store.theme.primaryMuted : "transparent",
                          color: isSelected ? store.theme.primary : store.theme.text,
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <span>{option.emoji}</span>
                          <span>{option.label}</span>
                        </span>
                        {isSelected && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. ACTIVE FILTER CHIPS BAR (If any filters applied) */}
      {(genre || country || year || q) && (
        <div className="flex flex-wrap items-center gap-2 pt-1 animate-in fade-in duration-200">
          <span className="text-xs font-medium" style={{ color: store.theme.textMuted }}>
            Đang lọc:
          </span>

          {genre && (
            <button
              type="button"
              onClick={() => updateFilter("genre", "")}
              className="group flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all hover:scale-105"
              style={{ background: store.theme.primaryMuted, color: store.theme.primary, border: `1px solid ${store.theme.border}` }}
            >
              <Sparkles size={12} />
              <span>{exploreData?.genres.find(g => g.slug === genre)?.name || genre}</span>
              <X size={12} className="opacity-70 group-hover:opacity-100" />
            </button>
          )}

          {country && (
            <button
              type="button"
              onClick={() => updateFilter("country", "")}
              className="group flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all hover:scale-105"
              style={{ background: `${store.theme.secondary}25`, color: store.theme.secondary, border: `1px solid ${store.theme.border}` }}
            >
              <Globe size={12} />
              <span>{exploreData?.countries.find(c => c.slug === country)?.name || country}</span>
              <X size={12} className="opacity-70 group-hover:opacity-100" />
            </button>
          )}

          {year && (
            <button
              type="button"
              onClick={() => updateFilter("year", "")}
              className="group flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all hover:scale-105"
              style={{ background: `${store.theme.accent}25`, color: store.theme.accent, border: `1px solid ${store.theme.border}` }}
            >
              <Calendar size={12} />
              <span>Năm {year}</span>
              <X size={12} className="opacity-70 group-hover:opacity-100" />
            </button>
          )}

          {q && (
            <button
              type="button"
              onClick={() => { setLocalQuery(""); updateFilter("q", ""); }}
              className="group flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all hover:scale-105"
              style={{ background: store.theme.primaryMuted, color: store.theme.primary, border: `1px solid ${store.theme.border}` }}
            >
              <Search size={12} />
              <span>"{q}"</span>
              <X size={12} className="opacity-70 group-hover:opacity-100" />
            </button>
          )}

          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs font-semibold underline underline-offset-4 transition-opacity hover:opacity-75 ml-2"
            style={{ color: store.theme.textMuted }}
          >
            <RefreshCw size={12} />
            <span>Xóa tất cả</span>
          </button>
        </div>
      )}

      {/* 4. RESULTS HEADER */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: store.theme.text }}>
            {currentCategory?.emoji} {currentCategory?.name.replace(/^[^\s]+\s/, "") || "Tất cả phim"}
          </h2>
          <p className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: store.theme.textMuted }}>
            {loadingMovies ? (
              <span className="flex items-center gap-1.5">
                <Loader2 size={13} className="animate-spin" />
                Đang tìm phim phù hợp...
              </span>
            ) : (
              <span>
                Tìm thấy <strong style={{ color: store.theme.text }}>{pagination.totalItems.toLocaleString()}</strong> phim
                {q && <span> với từ khóa "<span style={{ color: store.theme.primary }}>{q}</span>"</span>}
              </span>
            )}
          </p>
        </div>

        {pagination.totalPages > 1 && (
          <span className="text-xs font-medium px-3 py-1 rounded-full border" style={{ borderColor: store.theme.border, color: store.theme.textMuted }}>
            Trang {pagination.currentPage} / {pagination.totalPages}
          </span>
        )}
      </div>

      {/* 5. MOVIE GRID / SKELETON */}
      {loadingMovies ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="space-y-2.5">
              <div className="aspect-[2/3] rounded-2xl skeleton" />
              <div className="h-4 w-4/5 rounded-md skeleton" />
              <div className="h-3 w-1/2 rounded-md skeleton" />
            </div>
          ))}
        </div>
      ) : movies.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-3.5 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {movies.map((movie: any) => {
              const movieSlug = movie.providerSlug || movie.slug;
              const poster = movie.posterUrl || movie.thumb_url || movie.poster_url;
              const title = movie.title || movie.name;
              const quality = movie.quality || (movie.tmdb?.vote_average ? `⭐ ${movie.tmdb.vote_average.toFixed(1)}` : null);

              return (
                <a
                  key={movie.providerMovieId || movieSlug}
                  href={`/stores/${store.slug}/movie/${movieSlug}`}
                  className="group relative flex flex-col rounded-2xl transition-all duration-400 hover:-translate-y-2 focus-visible:outline-none"
                  style={{
                    boxShadow: "none",
                  }}
                >
                  {/* Poster Image Container */}
                  <div
                    className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border transition-all duration-400 group-hover:shadow-2xl"
                    style={{
                      borderColor: store.theme.border,
                      background: store.theme.surface,
                    }}
                  >
                    {poster ? (
                      <img
                        src={poster}
                        alt={title || "Movie"}
                        className="h-full w-full object-cover transition-transform duration-600 cubic-bezier(0.4, 0, 0.2, 1) group-hover:scale-108"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center" style={{ background: store.theme.surface }}>
                        <Film size={36} style={{ color: store.theme.textMuted }} />
                      </div>
                    )}

                    {/* Gradient Overlay for Depth */}
                    <div 
                      className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-85" 
                    />

                    {/* Hover Center Play Button */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 transition-all duration-300 group-hover:opacity-100 backdrop-blur-[2px]">
                      <div
                        className="flex h-13 w-13 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110"
                        style={{ 
                          background: store.theme.gradientAccent, 
                          boxShadow: `0 0 25px ${store.theme.glow}` 
                        }}
                      >
                        <Play size={22} fill="white" className="ml-1 text-white" />
                      </div>
                      <span className="rounded-full bg-black/60 px-3 py-1 text-[11px] font-bold text-white tracking-wide backdrop-blur-md">
                        Xem chi tiết
                      </span>
                    </div>

                    {/* Quality Badge (Top-Left) */}
                    {quality && (
                      <span
                        className="absolute left-2.5 top-2.5 rounded-lg px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-md shadow-md"
                        style={{ background: store.theme.gradientAccent }}
                      >
                        {quality}
                      </span>
                    )}

                    {/* Type Badge (Top-Right) */}
                    {(movie.type === "series" || movie.type === "hoathinh" || movie.type === "tvshows") && (
                      <span className="absolute right-2.5 top-2.5 rounded-lg bg-black/75 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md border border-white/10">
                        {movie.type === "series" ? "📺 Bộ" : movie.type === "hoathinh" ? "🎨 Hoạt hình" : "📡 Show"}
                      </span>
                    )}

                    {/* Episode label at bottom if available */}
                    {(movie.episode_current || movie.latestEpisodeLabel) && (
                      <span className="absolute bottom-2 left-2 right-2 truncate rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-medium text-white/90 text-center backdrop-blur-sm border border-white/10">
                        {movie.episode_current || movie.latestEpisodeLabel}
                      </span>
                    )}
                  </div>

                  {/* Title & Meta Info */}
                  <div className="mt-2.5 px-0.5 space-y-1">
                    <h3
                      className="line-clamp-1 text-sm font-semibold leading-tight transition-colors duration-200 group-hover:text-amber-500"
                      style={{ color: store.theme.text }}
                      title={title}
                    >
                      {title}
                    </h3>
                    <div className="flex items-center justify-between text-xs" style={{ color: store.theme.textMuted }}>
                      <span>{movie.year || "—"}</span>
                      {movie.category && movie.category[0] && (
                        <span className="truncate max-w-[100px] text-[11px] opacity-80">
                          {movie.category[0].name}
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>

          {/* 6. MODERN PAGINATION */}
          {pagination.totalPages > 1 && (
            <div className="mt-12 flex flex-wrap items-center justify-center gap-2 pt-6 border-t" style={{ borderColor: store.theme.border }}>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); updateFilter("page", String(page - 1)); }}
                disabled={page <= 1}
                className="flex h-10 px-4 items-center justify-center rounded-xl border text-xs font-semibold transition-all disabled:opacity-40 hover:scale-105 active:scale-95"
                style={{ borderColor: store.theme.border, color: store.theme.text, background: store.theme.surface }}
              >
                ‹ Trang trước
              </button>

              <div className="flex items-center gap-1.5">
                {(() => {
                  const pages: number[] = [];
                  const total = pagination.totalPages;
                  const current = page;

                  if (total <= 7) {
                    for (let i = 1; i <= total; i++) pages.push(i);
                  } else {
                    if (current <= 4) {
                      pages.push(1, 2, 3, 4, 5, -1, total);
                    } else if (current >= total - 3) {
                      pages.push(1, -1, total - 4, total - 3, total - 2, total - 1, total);
                    } else {
                      pages.push(1, -1, current - 1, current, current + 1, -2, total);
                    }
                  }

                  return pages.map((p, idx) => {
                    if (p < 0) {
                      return (
                        <span key={`ellipsis-${idx}`} className="px-2 text-xs font-bold" style={{ color: store.theme.textMuted }}>
                          •••
                        </span>
                      );
                    }

                    const isActive = page === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={(e) => { e.preventDefault(); updateFilter("page", String(p)); }}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border text-xs font-bold transition-all hover:scale-105 active:scale-95"
                        style={{
                          background: isActive ? store.theme.gradientAccent : store.theme.surface,
                          borderColor: isActive ? "transparent" : store.theme.border,
                          color: isActive ? store.theme.textInverse : store.theme.text,
                          boxShadow: isActive ? `0 4px 16px ${store.theme.glow}` : "none",
                        }}
                      >
                        {p}
                      </button>
                    );
                  });
                })()}
              </div>

              <button
                type="button"
                onClick={(e) => { e.preventDefault(); updateFilter("page", String(page + 1)); }}
                disabled={page >= pagination.totalPages}
                className="flex h-10 px-4 items-center justify-center rounded-xl border text-xs font-semibold transition-all disabled:opacity-40 hover:scale-105 active:scale-95"
                style={{ borderColor: store.theme.border, color: store.theme.text, background: store.theme.surface }}
              >
                Trang sau ›
              </button>
            </div>
          )}
        </>
      ) : (
        /* Empty State */
        <div 
          className="flex flex-col items-center justify-center py-24 px-4 text-center rounded-3xl border backdrop-blur-xl"
          style={{ background: store.theme.surface, borderColor: store.theme.border }}
        >
          <div 
            className="flex h-20 w-20 items-center justify-center rounded-3xl mb-4"
            style={{ background: store.theme.primaryMuted, color: store.theme.primary }}
          >
            <Film size={40} />
          </div>
          <h3 className="text-xl font-bold tracking-tight" style={{ color: store.theme.text }}>
            Không tìm thấy phim phù hợp
          </h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed" style={{ color: store.theme.textMuted }}>
            Thử tìm kiếm với từ khóa khác hoặc xóa bớt các bộ lọc thể loại, quốc gia, năm phát hành.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-6 flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold transition-all duration-300 hover:scale-105"
            style={{
              background: store.theme.gradientAccent,
              color: store.theme.textInverse,
              boxShadow: `0 4px 20px ${store.theme.glow}`,
            }}
          >
            <RefreshCw size={16} />
            <span>Xóa tất cả bộ lọc</span>
          </button>
        </div>
      )}

      {/* 7. ALL-IN-ONE FILTER & TAXONOMY MODAL / DRAWER (Cleans up the screen!) */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="relative flex flex-col w-full max-w-2xl max-h-[85vh] rounded-3xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            style={{ background: store.theme.surface, borderColor: store.theme.border }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: store.theme.border }}>
              <div className="flex items-center gap-2.5">
                <div 
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: store.theme.primaryMuted, color: store.theme.primary }}
                >
                  <SlidersHorizontal size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold" style={{ color: store.theme.text }}>
                    {activeModal === "genre" && `Tất cả Thể Loại (${exploreData?.genresCount || 0})`}
                    {activeModal === "country" && `Tất cả Quốc Gia (${exploreData?.countriesCount || 0})`}
                    {activeModal === "all" && "Bộ Lọc Khám Phá Toàn Diện"}
                  </h3>
                  <p className="text-xs" style={{ color: store.theme.textMuted }}>
                    Chọn tiêu chí để tìm kiếm phim chính xác
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                style={{ color: store.theme.textMuted }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Search Input for taxonomy */}
            <div className="p-4 border-b" style={{ borderColor: store.theme.border, background: `${store.theme.background}60` }}>
              <div className="relative flex items-center">
                <Search size={16} className="absolute left-3.5" style={{ color: store.theme.textMuted }} />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder={
                    activeModal === "genre" ? "Tìm nhanh thể loại (ví dụ: Hành động, Kinh dị...)" :
                    activeModal === "country" ? "Tìm nhanh quốc gia (ví dụ: Hàn Quốc, Mỹ, Pháp...)" :
                    "Tìm kiếm nhanh trong bộ lọc..."
                  }
                  className="w-full rounded-xl border bg-transparent py-2.5 pl-10 pr-9 text-sm outline-none transition-all"
                  style={{ borderColor: store.theme.border, color: store.theme.text }}
                />
                {modalSearch && (
                  <button
                    type="button"
                    onClick={() => setModalSearch("")}
                    className="absolute right-3 text-xs"
                    style={{ color: store.theme.textMuted }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Modal Content Scroll Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Show Genres if activeModal is 'genre' or 'all' */}
              {(activeModal === "genre" || activeModal === "all") && (
                <div>
                  <h4 className="flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-3" style={{ color: store.theme.textMuted }}>
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={14} style={{ color: store.theme.primary }} />
                      Thể Loại ({filteredModalGenres.length})
                    </span>
                    {genre && (
                      <button 
                        type="button"
                        onClick={() => updateFilter("genre", "")}
                        className="text-[11px] text-red-500 font-semibold"
                      >
                        Bỏ chọn
                      </button>
                    )}
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {filteredModalGenres.map((g) => {
                      const isActive = genre === g.slug;
                      return (
                        <button
                          key={g.slug}
                          type="button"
                          onClick={() => {
                            updateFilter("genre", isActive ? "" : g.slug);
                            if (activeModal === "genre") setActiveModal(null);
                          }}
                          className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium text-left transition-all hover:scale-102"
                          style={{
                            background: isActive ? store.theme.primary : store.theme.surface,
                            color: isActive ? store.theme.textInverse : store.theme.text,
                            border: `1px solid ${isActive ? "transparent" : store.theme.border}`,
                          }}
                        >
                          <span className="truncate">{g.name}</span>
                          {isActive && <Check size={14} />}
                        </button>
                      );
                    })}
                  </div>
                  {filteredModalGenres.length === 0 && (
                    <p className="text-xs text-center py-4" style={{ color: store.theme.textMuted }}>
                      Không có thể loại khớp với "{modalSearch}"
                    </p>
                  )}
                </div>
              )}

              {/* Show Countries if activeModal is 'country' or 'all' */}
              {(activeModal === "country" || activeModal === "all") && (
                <div>
                  <h4 className="flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-3" style={{ color: store.theme.textMuted }}>
                    <span className="flex items-center gap-1.5">
                      <Globe size={14} style={{ color: store.theme.secondary }} />
                      Quốc Gia ({filteredModalCountries.length})
                    </span>
                    {country && (
                      <button 
                        type="button"
                        onClick={() => updateFilter("country", "")}
                        className="text-[11px] text-red-500 font-semibold"
                      >
                        Bỏ chọn
                      </button>
                    )}
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {filteredModalCountries.map((c) => {
                      const isActive = country === c.slug;
                      return (
                        <button
                          key={c.slug}
                          type="button"
                          onClick={() => {
                            updateFilter("country", isActive ? "" : c.slug);
                            if (activeModal === "country") setActiveModal(null);
                          }}
                          className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium text-left transition-all hover:scale-102"
                          style={{
                            background: isActive ? store.theme.secondary : store.theme.surface,
                            color: isActive ? store.theme.textInverse : store.theme.text,
                            border: `1px solid ${isActive ? "transparent" : store.theme.border}`,
                          }}
                        >
                          <span className="truncate">{c.name}</span>
                          {isActive && <Check size={14} />}
                        </button>
                      );
                    })}
                  </div>
                  {filteredModalCountries.length === 0 && (
                    <p className="text-xs text-center py-4" style={{ color: store.theme.textMuted }}>
                      Không có quốc gia khớp với "{modalSearch}"
                    </p>
                  )}
                </div>
              )}

              {/* Show Years if activeModal is 'all' */}
              {activeModal === "all" && exploreData?.years && (
                <div>
                  <h4 className="flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-3" style={{ color: store.theme.textMuted }}>
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} style={{ color: store.theme.accent }} />
                      Năm Phát Hành
                    </span>
                    {year && (
                      <button 
                        type="button"
                        onClick={() => updateFilter("year", "")}
                        className="text-[11px] text-red-500 font-semibold"
                      >
                        Bỏ chọn
                      </button>
                    )}
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {exploreData.years.map((y) => {
                      const isActive = year === String(y);
                      return (
                        <button
                          key={y}
                          type="button"
                          onClick={() => updateFilter("year", isActive ? "" : String(y))}
                          className="rounded-xl px-3 py-2 text-xs font-medium transition-all text-center"
                          style={{
                            background: isActive ? store.theme.accent : store.theme.surface,
                            color: isActive ? store.theme.textInverse : store.theme.text,
                            border: `1px solid ${isActive ? "transparent" : store.theme.border}`,
                          }}
                        >
                          {y}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t" style={{ borderColor: store.theme.border, background: `${store.theme.background}80` }}>
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold underline underline-offset-4"
                style={{ color: store.theme.textMuted }}
              >
                Xóa tất cả lọc
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-xl px-6 py-2.5 text-xs font-bold tracking-wide transition-all hover:scale-105"
                style={{
                  background: store.theme.gradientAccent,
                  color: store.theme.textInverse,
                  boxShadow: `0 2px 10px ${store.theme.glow}`,
                }}
              >
                Xem kết quả
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function StoreExplorer(props: StoreExplorerProps) {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-28 gap-3">
        <Loader2 size={36} className="animate-spin" style={{ color: props.store.theme.primary }} />
        <p className="text-xs font-medium" style={{ color: props.store.theme.textMuted }}>
          Đang tải kho phim...
        </p>
      </div>
    }>
      <StoreExplorerContent {...props} />
    </Suspense>
  );
}