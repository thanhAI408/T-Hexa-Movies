"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Filter, X, ChevronDown, Loader2, Grid, List, LayoutGrid } from "lucide-react";
import type { StoreConfig } from "@/lib/stores/config";

interface TaxonomyItem {
  id: string;
  name: string;
  slug: string;
}

interface StoreFeatures {
  genres: TaxonomyItem[];
  countries: TaxonomyItem[];
  years: number[];
  categories: { slug: string; name: string; id: string }[];
}

interface StoreFiltersProps {
  store: StoreConfig;
}

// Provider-specific category configurations
const PROVIDER_CATEGORIES: Record<string, { slug: string; name: string; kind: string }[]> = {
  vsmov: [
    { slug: "latest", name: "✨ Mới cập nhật", kind: "latest" },
    { slug: "single", name: "🎬 Phim lẻ", kind: "single" },
    { slug: "series", name: "📺 Phim bộ", kind: "series" },
    { slug: "animation", name: "🎨 Hoạt hình", kind: "animation" },
    { slug: "tvshow", name: "📡 TV Shows", kind: "tvshow" },
    { slug: "cinema", name: "🎥 Phim chiếu rạp", kind: "cinema" },
  ],
  ophim: [
    { slug: "latest", name: "✨ Phim mới cập nhật", kind: "latest" },
    { slug: "single", name: "🎬 Phim lẻ", kind: "single" },
    { slug: "series", name: "📺 Phim bộ", kind: "series" },
    { slug: "animation", name: "🎨 Hoạt hình", kind: "animation" },
    { slug: "tvshow", name: "📡 TV Shows", kind: "tvshow" },
    { slug: "cinema", name: "🎥 Phim chiếu rạp", kind: "cinema" },
  ],
  nguonc: [
    { slug: "latest", name: "✨ Phim mới cập nhật", kind: "latest" },
    { slug: "single", name: "🎬 Phim lẻ", kind: "single" },
    { slug: "series", name: "📺 Phim bộ", kind: "series" },
    { slug: "animation", name: "🎨 Hoạt hình", kind: "animation" },
    { slug: "tvshow", name: "📡 TV Shows", kind: "tvshow" },
  ],
  kkphim: [
    { slug: "latest", name: "✨ Phim mới cập nhật", kind: "latest" },
    { slug: "single", name: "🎬 Phim lẻ", kind: "single" },
    { slug: "series", name: "📺 Phim bộ", kind: "series" },
    { slug: "animation", name: "🎨 Hoạt hình", kind: "animation" },
    { slug: "tvshow", name: "📡 TV Shows", kind: "tvshow" },
    { slug: "cinema", name: "🎥 Phim chiếu rạp", kind: "cinema" },
  ],
};

export function StoreFilters({ store }: StoreFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get current filters from URL
  const currentKind = searchParams.get("kind") || "latest";
  const currentGenre = searchParams.get("genre") || "";
  const currentCountry = searchParams.get("country") || "";
  const currentYear = searchParams.get("year") || "";
  const currentSort = searchParams.get("sort") || "updated";

  // UI states
  const [showFilters, setShowFilters] = useState(false);
  const [features, setFeatures] = useState<StoreFeatures | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch store features (genres, countries, years)
  useEffect(() => {
    async function fetchFeatures() {
      try {
        const response = await fetch(`/api/stores/${store.slug}/features`);
        if (response.ok) {
          const data = await response.json();
          setFeatures(data);
        }
      } catch (error) {
        console.error("Failed to fetch features:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchFeatures();
  }, [store.slug]);

  // Get categories for this provider
  const apiId = store.slug.replace("binh-minh", "vsmov")
    .replace("ban-mai", "ophim")
    .replace("hoang-hon", "nguonc")
    .replace("da-nguyet", "kkphim");
  const categories = PROVIDER_CATEGORIES[apiId] || PROVIDER_CATEGORIES.vsmov;

  // Update URL with filters
  const updateFilter = useCallback((key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.set("page", "1"); // Reset to page 1
    router.push(`${pathname}?${newParams.toString()}`);
  }, [router, pathname, searchParams]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    const newParams = new URLSearchParams();
    newParams.set("kind", currentKind);
    newParams.set("page", "1");
    router.push(`${pathname}?${newParams.toString()}`);
  }, [router, pathname, currentKind]);

  // Check if any filters are active
  const hasActiveFilters = currentGenre || currentCountry || currentYear;

  return (
    <div className="mb-6">
      {/* Category Tabs */}
      <div className="mb-4 overflow-x-auto">
        <div className="flex gap-2 pb-2">
          {categories.map((cat) => {
            const isActive = currentKind === cat.kind;
            return (
              <button
                key={cat.kind}
                onClick={() => updateFilter("kind", cat.kind)}
                className="group shrink-0 rounded-full px-5 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-300 hover:scale-105"
                style={{
                  background: isActive ? store.theme.gradientAccent : "transparent",
                  color: isActive ? store.theme.textInverse : store.theme.textSecondary,
                  border: `1px solid ${isActive ? "transparent" : store.theme.border}`,
                  boxShadow: isActive ? `0 4px 20px ${store.theme.glow}` : "none",
                }}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Toggle & Active Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Filter Toggle Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-300 hover:scale-105"
          style={{
            background: showFilters ? store.theme.primaryMuted : store.theme.surface,
            borderColor: showFilters ? store.theme.primary : store.theme.border,
            color: showFilters ? store.theme.primary : store.theme.text,
          }}
        >
          <Filter size={18} />
          <span>Lọc nâng cao</span>
          {hasActiveFilters && (
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
              style={{
                background: store.theme.primary,
                color: store.theme.textInverse,
              }}
            >
              {(currentGenre ? 1 : 0) + (currentCountry ? 1 : 0) + (currentYear ? 1 : 0)}
            </span>
          )}
          <ChevronDown
            size={18}
            className={`transition-transform ${showFilters ? "rotate-180" : ""}`}
          />
        </button>

        {/* Active Filter Pills */}
        {currentGenre && (
          <button
            onClick={() => updateFilter("genre", "")}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all hover:scale-105"
            style={{
              background: `${store.theme.primaryMuted}`,
              color: store.theme.primary,
            }}
          >
            <span>Thể loại: {features?.genres.find(g => g.slug === currentGenre)?.name || currentGenre}</span>
            <X size={14} />
          </button>
        )}

        {currentCountry && (
          <button
            onClick={() => updateFilter("country", "")}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all hover:scale-105"
            style={{
              background: `${store.theme.primaryMuted}`,
              color: store.theme.primary,
            }}
          >
            <span>Quốc gia: {features?.countries.find(c => c.slug === currentCountry)?.name || currentCountry}</span>
            <X size={14} />
          </button>
        )}

        {currentYear && (
          <button
            onClick={() => updateFilter("year", "")}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all hover:scale-105"
            style={{
              background: `${store.theme.primaryMuted}`,
              color: store.theme.primary,
            }}
          >
            <span>Năm: {currentYear}</span>
            <X size={14} />
          </button>
        )}

        {/* Clear All */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm font-medium underline transition-colors hover:scale-105"
            style={{ color: store.theme.textMuted }}
          >
            Xóa tất cả
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div
          className="mt-4 rounded-2xl border p-6 backdrop-blur-xl"
          style={{
            background: `${store.theme.surface}f0`,
            borderColor: store.theme.border,
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin" style={{ color: store.theme.primary }} />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {/* Genres */}
              {features?.genres && features.genres.length > 0 && (
                <div>
                  <h4 className="mb-3 text-sm font-semibold" style={{ color: store.theme.text }}>
                    🎭 Thể loại
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {features.genres.slice(0, 12).map((genre) => {
                      const isActive = currentGenre === genre.slug;
                      return (
                        <button
                          key={genre.slug}
                          onClick={() => updateFilter("genre", isActive ? "" : genre.slug)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:scale-105"
                          style={{
                            background: isActive ? store.theme.primary : `${store.theme.primaryMuted}`,
                            color: isActive ? store.theme.textInverse : store.theme.textSecondary,
                          }}
                        >
                          {genre.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Countries */}
              {features?.countries && features.countries.length > 0 && (
                <div>
                  <h4 className="mb-3 text-sm font-semibold" style={{ color: store.theme.text }}>
                    🌍 Quốc gia
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {features.countries.slice(0, 10).map((country) => {
                      const isActive = currentCountry === country.slug;
                      return (
                        <button
                          key={country.slug}
                          onClick={() => updateFilter("country", isActive ? "" : country.slug)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:scale-105"
                          style={{
                            background: isActive ? store.theme.secondary : `${store.theme.surface}`,
                            color: isActive ? store.theme.textInverse : store.theme.textSecondary,
                            border: `1px solid ${store.theme.border}`,
                          }}
                        >
                          {country.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Years */}
              {features?.years && features.years.length > 0 && (
                <div>
                  <h4 className="mb-3 text-sm font-semibold" style={{ color: store.theme.text }}>
                    📅 Năm phát hành
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {features.years.slice(0, 8).map((year) => {
                      const isActive = currentYear === String(year);
                      return (
                        <button
                          key={year}
                          onClick={() => updateFilter("year", isActive ? "" : String(year))}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:scale-105"
                          style={{
                            background: isActive ? store.theme.accent : `${store.theme.surface}`,
                            color: isActive ? store.theme.textInverse : store.theme.textSecondary,
                            border: `1px solid ${store.theme.border}`,
                          }}
                        >
                          {year}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
