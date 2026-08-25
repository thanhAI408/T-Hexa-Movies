import { NextRequest, NextResponse } from "next/server";
import { STORE_API_MAP } from "@/lib/stores/config";

const VALID_STORES = [
  "binh-minh", "ban-mai", "hoang-hon", "da-nguyet",
  "xuan", "ha", "thu", "dong",
  "vsmov", "ophim", "nguonc", "kkphim"
];

// ============================================
// IMAGE URL RESOLVER
// ============================================
export function resolveImageUrl(url: any, provider: string, cdnBase?: string): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // If already absolute http/https
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const cleaned = trimmed.replace(/^\/+/, "");

  if (cdnBase) {
    const base = cdnBase.endsWith("/") ? cdnBase : `${cdnBase}/`;
    return `${base}${cleaned}`;
  }

  if (provider === "kkphim") {
    return cleaned.startsWith("uploads/movies/")
      ? `https://phimimg.com/${cleaned}`
      : `https://phimimg.com/uploads/movies/${cleaned}`;
  }

  if (provider === "ophim") {
    return cleaned.startsWith("uploads/movies/")
      ? `https://img.ophimimg.com/${cleaned}`
      : `https://img.ophimimg.com/uploads/movies/${cleaned}`;
  }

  if (provider === "vsmov") {
    return `https://vsmov.com/storage/images/${cleaned}`;
  }

  if (provider === "nguonc") {
    return `https://phim.nguonc.com/public/images/Post/${cleaned}`;
  }

  return `https://phimimg.com/uploads/movies/${cleaned}`;
}

// ============================================
// NORMALIZATION
// ============================================
function normalizeMovie(movie: any, provider: string, cdnBase?: string) {
  const rawYear = movie.year ? parseInt(String(movie.year), 10) : null;
  const year = typeof rawYear === "number" && !isNaN(rawYear) ? rawYear : null;
  
  const poster = resolveImageUrl(movie.poster_url || movie.thumb_url || movie.posterUrl, provider, cdnBase);
  const backdrop = resolveImageUrl(movie.thumb_url || movie.poster_url || movie.backdropUrl, provider, cdnBase);

  const rawType = movie.type || "";
  const type = rawType === "tvshows" || rawType === "tvshow"
    ? "tvshow"
    : rawType === "hoathinh" || rawType === "animation"
    ? "animation"
    : rawType === "series"
    ? "series"
    : "single";

  return {
    providerSlug: movie.slug || movie.providerSlug,
    providerMovieId: movie._id || movie.id || movie.providerMovieId,
    title: movie.name || movie.title,
    originalTitle: movie.origin_name || movie.originalTitle,
    posterUrl: poster,
    backdropUrl: backdrop,
    year,
    quality: movie.quality || null,
    type,
    rating: movie.tmdb?.vote_average ? parseFloat(movie.tmdb.vote_average) : (movie.rating || null),
    providerUpdatedAt: movie.modified?.time || movie.updatedAt || movie.providerUpdatedAt || null,
  };
}

// ============================================
// SORT HELPER
// ============================================
function sortMovies(movies: any[], sort: string): any[] {
  const sorted = [...movies];

  switch (sort) {
    case "year":
    case "year_desc":
      return sorted.sort((a, b) => {
        const yearA = a.year ?? 0;
        const yearB = b.year ?? 0;
        if (yearB !== yearA) return yearB - yearA;
        const dateA = a.providerUpdatedAt ? new Date(a.providerUpdatedAt).getTime() : 0;
        const dateB = b.providerUpdatedAt ? new Date(b.providerUpdatedAt).getTime() : 0;
        return dateB - dateA;
      });

    case "year_asc":
      return sorted.sort((a, b) => {
        const yearA = a.year ?? 9999;
        const yearB = b.year ?? 9999;
        return yearA - yearB;
      });

    case "title":
      return sorted.sort((a, b) => (a.title || "").localeCompare(b.title || "", "vi"));

    case "view":
      return sorted.sort((a, b) => {
        const rateA = a.rating ?? 0;
        const rateB = b.rating ?? 0;
        return rateB - rateA;
      });

    case "modified":
    case "updated":
    default:
      return sorted.sort((a, b) => {
        const dateA = a.providerUpdatedAt ? new Date(a.providerUpdatedAt).getTime() : 0;
        const dateB = b.providerUpdatedAt ? new Date(b.providerUpdatedAt).getTime() : 0;
        return dateB - dateA;
      });
  }
}

// ============================================
// FETCH WITH TIMEOUT
// ============================================
async function fetchJson(url: string, timeout = 7000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function emptyPagination(page: number, limit: number) {
  return {
    currentPage: page,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: limit,
  };
}

// ============================================
// VSMOV - Path & Query API
// ============================================
async function discoverVsmov(params: {
  kind?: string;
  genre?: string;
  country?: string;
  year?: string;
  q?: string;
  sort?: string;
  page: number;
  limit: number;
}) {
  const url = new URL("https://vsmov.com/api");

  if (params.q) {
    url.pathname = url.pathname + "/tim-kiem";
    url.searchParams.set("keyword", params.q);
  } else if (params.year) {
    url.pathname = url.pathname + "/nam/" + params.year;
  } else if (params.genre) {
    url.pathname = url.pathname + "/the-loai/" + params.genre;
  } else if (params.country) {
    url.pathname = url.pathname + "/quoc-gia/" + params.country;
  } else if (params.sort === "view") {
    url.pathname = url.pathname + "/danh-sach/phim-hot";
  } else if (params.kind === "single") {
    url.pathname = url.pathname + "/danh-sach/phim-le";
  } else if (params.kind === "series") {
    url.pathname = url.pathname + "/danh-sach/phim-bo";
  } else if (params.kind === "animation") {
    url.pathname = url.pathname + "/the-loai/hoat-hinh";
  } else if (params.kind === "tvshow") {
    url.pathname = url.pathname + "/danh-sach/tv-shows";
  } else {
    url.pathname = url.pathname + "/danh-sach/phim-moi-cap-nhat";
  }

  url.searchParams.set("page", String(params.page));
  url.searchParams.set("limit", String(params.limit));

  const data = await fetchJson(url.toString());
  if (!data) {
    return discoverKkphim(params);
  }

  const cdnBase = data.pathImage || data.APP_DOMAIN_CDN_IMAGE;
  let items = (data.items || []).map((m: any) => normalizeMovie(m, "vsmov", cdnBase));

  if (params.kind && params.kind !== "latest" && !url.pathname.includes("/danh-sach/") && !url.pathname.includes("/the-loai/hoat-hinh")) {
    items = items.filter((m: any) => m.type === params.kind);
  }
  if (params.year && !url.pathname.includes("/nam/")) {
    items = items.filter((m: any) => String(m.year) === params.year);
  }

  items = sortMovies(items, params.sort || (params.year ? "year" : "modified"));

  const pagination = data.pagination || {};
  const totalItems = parseInt(pagination.totalItems || items.length, 10);
  const itemsPerPage = parseInt(pagination.totalItemsPerPage || params.limit, 10);
  const currentPage = parseInt(pagination.currentPage || params.page, 10);
  const totalPages = parseInt(pagination.totalPages || Math.ceil(totalItems / itemsPerPage) || 1, 10);

  return {
    items,
    pagination: {
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage,
    },
  };
}

// ============================================
// KKPhim - Advanced Dedicated Query Endpoints
// ============================================
async function discoverKkphim(params: {
  kind?: string;
  genre?: string;
  country?: string;
  year?: string;
  q?: string;
  sort?: string;
  page: number;
  limit: number;
}) {
  const baseUrl = "https://phimapi.com";
  let path = "/v1/api/danh-sach/phim-moi-cap-nhat";

  if (params.q) {
    path = "/v1/api/tim-kiem";
  } else if (params.genre) {
    path = `/v1/api/the-loai/${params.genre}`;
  } else if (params.country) {
    path = `/v1/api/quoc-gia/${params.country}`;
  } else if (params.year) {
    path = `/v1/api/nam/${params.year}`;
  } else if (params.kind === "single") {
    path = "/v1/api/danh-sach/phim-le";
  } else if (params.kind === "series") {
    path = "/v1/api/danh-sach/phim-bo";
  } else if (params.kind === "animation") {
    path = "/v1/api/danh-sach/hoat-hinh";
  } else if (params.kind === "tvshow") {
    path = "/v1/api/danh-sach/tv-shows";
  } else if (params.kind === "cinema") {
    path = "/v1/api/danh-sach/phim-chieu-rap";
  }

  const searchParams = new URLSearchParams();
  searchParams.set("page", String(params.page));
  searchParams.set("limit", String(params.limit));
  if (params.q) searchParams.set("keyword", params.q);
  if (params.genre && !path.includes("/the-loai/")) searchParams.set("category", params.genre);
  if (params.country && !path.includes("/quoc-gia/")) searchParams.set("country", params.country);
  if (params.year && !path.includes("/nam/")) searchParams.set("year", params.year);

  // Sorting
  if (params.sort === "year" || params.sort === "year_desc") {
    searchParams.set("sort_field", "year");
  } else if (params.sort === "view") {
    searchParams.set("sort_field", "view");
  } else {
    searchParams.set("sort_field", "modified.time");
  }

  const data = await fetchJson(`${baseUrl}${path}?${searchParams.toString()}`);
  if (!data) {
    return { items: [], pagination: emptyPagination(params.page, params.limit) };
  }

  const cdnBase = data.data?.APP_DOMAIN_CDN_IMAGE || "https://phimimg.com";
  let items = (data.data?.items || []).map((m: any) => normalizeMovie(m, "kkphim", cdnBase));

  items = sortMovies(items, params.sort || (params.year ? "year" : "modified"));

  const pagination = data.data?.params?.pagination || data.params?.pagination || data.data?.pagination || data.pagination || {};
  const totalItems = parseInt(pagination.totalItems || pagination.total_items || items.length, 10);
  const itemsPerPage = parseInt(pagination.totalItemsPerPage || pagination.items_per_page || params.limit, 10);
  const currentPage = parseInt(pagination.currentPage || pagination.current_page || params.page, 10);
  const totalPages = parseInt(pagination.totalPages || pagination.total_page || Math.ceil(totalItems / itemsPerPage) || 1, 10);

  return {
    items,
    pagination: {
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage,
    },
  };
}

// ============================================
// OPhim - Fallback to KKPhim if down
// ============================================
async function discoverOphim(params: {
  kind?: string;
  genre?: string;
  country?: string;
  year?: string;
  q?: string;
  sort?: string;
  page: number;
  limit: number;
}) {
  const baseUrl = "https://ophim1.com";
  let path = "/v1/api/danh-sach/phim-moi-cap-nhat";
  const searchParams = new URLSearchParams();

  if (params.q) {
    path = "/v1/api/tim-kiem";
    searchParams.set("keyword", params.q);
  } else if (params.genre) {
    path = `/v1/api/the-loai/${params.genre}`;
  } else if (params.country) {
    path = `/v1/api/quoc-gia/${params.country}`;
  } else if (params.year) {
    path = `/v1/api/nam/${params.year}`;
  } else if (params.kind === "single") {
    path = "/v1/api/danh-sach/phim-le";
  } else if (params.kind === "series") {
    path = "/v1/api/danh-sach/phim-bo";
  } else if (params.kind === "animation") {
    path = "/v1/api/danh-sach/hoat-hinh";
  } else if (params.kind === "tvshow") {
    path = "/v1/api/danh-sach/tv-shows";
  } else if (params.kind === "cinema") {
    path = "/v1/api/danh-sach/phim-chieu-rap";
  }

  searchParams.set("page", String(params.page));
  searchParams.set("limit", String(params.limit));

  const data = await fetchJson(`${baseUrl}${path}?${searchParams.toString()}`);
  if (!data) {
    // Graceful fallback to KKPhim if OPhim is unreachable
    return discoverKkphim(params);
  }

  const cdnBase = data.data?.APP_DOMAIN_CDN_IMAGE || "https://img.ophimimg.com";
  let items = (data.data?.items || []).map((m: any) => normalizeMovie(m, "ophim", cdnBase));
  items = sortMovies(items, params.sort || (params.year ? "year" : "modified"));

  const pagination = data.data?.params?.pagination || data.params?.pagination || data.data?.pagination || data.pagination || {};
  const totalItems = parseInt(pagination.totalItems || pagination.total_items || items.length, 10);
  const itemsPerPage = parseInt(pagination.totalItemsPerPage || pagination.items_per_page || params.limit, 10);
  const currentPage = parseInt(pagination.currentPage || pagination.current_page || params.page, 10);
  const totalPages = parseInt(pagination.totalPages || pagination.total_page || Math.ceil(totalItems / itemsPerPage) || 1, 10);

  return {
    items,
    pagination: {
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage,
    },
  };
}

// ============================================
// NguonC - Dedicated Path Endpoints
// ============================================
async function discoverNguonc(params: {
  kind?: string;
  genre?: string;
  country?: string;
  year?: string;
  q?: string;
  sort?: string;
  page: number;
}) {
  const baseUrl = "https://phim.nguonc.com";
  let path = "/api/films/phim-moi-cap-nhat";

  if (params.q) {
    path = "/api/films/search";
  } else if (params.genre) {
    path = `/api/films/the-loai/${params.genre}`;
  } else if (params.country) {
    path = `/api/films/quoc-gia/${params.country}`;
  } else if (params.year) {
    path = `/api/films/nam-phat-hanh/${params.year}`;
  } else if (params.kind === "single") {
    path = "/api/films/danh-sach/phim-le";
  } else if (params.kind === "series") {
    path = "/api/films/danh-sach/phim-bo";
  } else if (params.kind === "animation") {
    path = "/api/films/danh-sach/hoat-hinh";
  } else if (params.kind === "tvshow") {
    path = "/api/films/danh-sach/tv-shows";
  }

  const searchParams = new URLSearchParams();
  searchParams.set("page", String(params.page));
  if (params.q) searchParams.set("keyword", params.q);

  const data = await fetchJson(`${baseUrl}${path}?${searchParams.toString()}`);
  if (!data) {
    return discoverKkphim({ ...params, limit: 12 });
  }

  let items = (data.items || []).map((m: any) => normalizeMovie(m, "nguonc"));

  if (params.year && !path.includes("/nam-phat-hanh/")) {
    items = items.filter((m: any) => String(m.year) === params.year);
  }

  items = sortMovies(items, params.sort || (params.year ? "year" : "modified"));

  const pagination = data.paginate || data.pagination || {};
  const totalItems = parseInt(pagination.total_items || pagination.totalItems || items.length, 10);
  const itemsPerPage = parseInt(pagination.items_per_page || pagination.totalItemsPerPage || 10, 10);
  const currentPage = parseInt(pagination.current_page || pagination.currentPage || params.page, 10);
  const totalPages = parseInt(pagination.total_page || pagination.totalPages || Math.ceil(totalItems / itemsPerPage) || 1, 10);

  return {
    items,
    pagination: {
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage,
    },
  };
}

// ============================================
// MAIN HANDLER
// ============================================
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await context.params;
  const searchParams = request.nextUrl.searchParams;

  if (!VALID_STORES.includes(storeId)) {
    return NextResponse.json({ error: "Invalid store ID" }, { status: 400 });
  }

  const apiId = STORE_API_MAP[storeId] || storeId;

  const kind = searchParams.get("kind") || "latest";
  const genre = searchParams.get("genre") || "";
  const country = searchParams.get("country") || "";
  const year = searchParams.get("year") || "";
  const sort = searchParams.get("sort") || (year ? "year" : "modified");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(48, Math.max(1, parseInt(searchParams.get("limit") || "24", 10)));
  const q = searchParams.get("q") || "";

  try {
    const params = {
      kind,
      genre,
      country,
      year,
      sort,
      page,
      limit,
      q,
    };

    let result;
    switch (apiId) {
      case "vsmov":
        result = await discoverVsmov(params);
        break;
      case "ophim":
        result = await discoverOphim(params);
        break;
      case "nguonc":
        result = await discoverNguonc(params);
        break;
      case "kkphim":
      default:
        result = await discoverKkphim(params);
        break;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(`[API] Discover ${storeId} error:`, error);
    const fallback = await discoverKkphim({ kind, genre, country, year, sort, page, limit, q });
    return NextResponse.json(fallback);
  }
}