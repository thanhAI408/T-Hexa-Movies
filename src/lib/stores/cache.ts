// Client-side in-memory cache for instant store switching (Zero Delay)

export interface ExploreData {
  provider: string;
  store: string;
  categories: { id: string; name: string; slug: string; emoji: string }[];
  genres: { id?: string; name: string; slug: string }[];
  genresCount: number;
  countries: { id?: string; name: string; slug: string }[];
  countriesCount: number;
  years: number[];
  yearsCount: number;
  filters: {
    hasGenres: boolean;
    hasCountries: boolean;
    hasYears: boolean;
    hasQuality: boolean;
    hasSort: boolean;
  };
}

export interface DiscoverResult {
  items: any[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

// In-memory global maps that persist during client session
const exploreCache = new Map<string, { data: ExploreData; timestamp: number }>();
const discoverCache = new Map<string, { data: DiscoverResult; timestamp: number }>();
const heroCache = new Map<string, { data: any; timestamp: number }>();
const lastStoreFilterState = new Map<string, string>(); // remembers the last query string per store!

// -------------------------------------------------------------
// Explore Taxonomy Cache
// -------------------------------------------------------------
export function getCachedExplore(slug: string): ExploreData | null {
  const entry = exploreCache.get(slug);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    exploreCache.delete(slug);
    return null;
  }
  return entry.data;
}

export function setCachedExplore(slug: string, data: ExploreData): void {
  exploreCache.set(slug, { data, timestamp: Date.now() });
}

export async function fetchWithExploreCache(slug: string): Promise<ExploreData | null> {
  const cached = getCachedExplore(slug);
  if (cached) return cached;

  try {
    const res = await fetch(`/api/stores/${slug}/explore`);
    if (!res.ok) return null;
    const data = await res.json();
    setCachedExplore(slug, data);
    return data;
  } catch {
    return null;
  }
}

// -------------------------------------------------------------
// Discover Movies Cache
// -------------------------------------------------------------
export function makeDiscoverCacheKey(slug: string, queryString: string): string {
  return `${slug}?${queryString}`;
}

export function getCachedDiscover(slug: string, queryString: string): DiscoverResult | null {
  const key = makeDiscoverCacheKey(slug, queryString);
  const entry = discoverCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    discoverCache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCachedDiscover(slug: string, queryString: string, data: DiscoverResult): void {
  const key = makeDiscoverCacheKey(slug, queryString);
  discoverCache.set(key, { data, timestamp: Date.now() });
}

// -------------------------------------------------------------
// Hero Featured Movie Cache
// -------------------------------------------------------------
export function getCachedHero(slug: string): any | null {
  const entry = heroCache.get(slug);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    heroCache.delete(slug);
    return null;
  }
  return entry.data;
}

export function setCachedHero(slug: string, data: any): void {
  heroCache.set(slug, { data, timestamp: Date.now() });
}

// -------------------------------------------------------------
// Store Filter State Memory (Remembers last view per store)
// -------------------------------------------------------------
export function getLastStoreFilter(slug: string): string {
  return lastStoreFilterState.get(slug) || "";
}

export function setLastStoreFilter(slug: string, queryString: string): void {
  lastStoreFilterState.set(slug, queryString);
}

// -------------------------------------------------------------
// Smart Prefetching for All Stores
// -------------------------------------------------------------
export async function prefetchStore(slug: string): Promise<void> {
  // Prefetch explore taxonomy
  fetchWithExploreCache(slug).catch(() => {});

  // Prefetch hero movie if not already cached
  if (!getCachedHero(slug)) {
    fetch(`/api/stores/${slug}/movies?page=1&limit=1&sort=updated`)
      .then((r) => r.json())
      .then((data) => {
        if (data.items && data.items.length > 0) {
          setCachedHero(slug, data.items[0]);
        }
      })
      .catch(() => {});
  }

  // Prefetch default discover list
  const defaultQuery = "limit=24&page=1&sort=modified";
  if (!getCachedDiscover(slug, defaultQuery)) {
    fetch(`/api/stores/${slug}/discover?${defaultQuery}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.items) {
          setCachedDiscover(slug, defaultQuery, {
            items: data.items,
            pagination: data.pagination || { currentPage: 1, totalPages: 1, totalItems: data.items.length, itemsPerPage: 24 },
          });
        }
      })
      .catch(() => {});
  }
}

// Prefetch all remaining stores in the background during idle time
export function prefetchAllStores(currentSlug: string): void {
  const allSlugs = ["binh-minh", "ban-mai", "hoang-hon", "da-nguyet"];
  allSlugs.forEach((slug) => {
    if (slug !== currentSlug) {
      // Delay prefetch slightly to prioritize current page rendering
      setTimeout(() => {
        prefetchStore(slug);
      }, 1200);
    }
  });
}
