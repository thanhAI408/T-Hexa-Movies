import { NextRequest, NextResponse } from "next/server";
import { STORE_API_MAP } from "@/lib/stores/config";

const VALID_STORES = [
  "binh-minh", "ban-mai", "hoang-hon", "da-nguyet",
  "xuan", "ha", "thu", "dong",
  "vsmov", "ophim", "nguonc", "kkphim"
];

// ============================================
// NORMALIZATION
// ============================================
function normalizeMovie(movie: any, provider: string) {
  if (provider === "vsmov") {
    return {
      providerSlug: movie.slug,
      providerMovieId: movie._id,
      title: movie.name,
      originalTitle: movie.origin_name,
      posterUrl: movie.poster_url || movie.thumb_url,
      backdropUrl: movie.thumb_url,
      year: movie.year ? parseInt(movie.year) : null,
      quality: movie.quality,
      type: movie.type === "tvshows" ? "tvshow" : movie.type === "hoathinh" ? "animation" : movie.type === "series" ? "series" : "single",
      rating: movie.tmdb?.vote_average ? parseFloat(movie.tmdb.vote_average) : null,
    };
  }

  if (provider === "ophim") {
    return {
      providerSlug: movie.slug,
      providerMovieId: movie._id,
      title: movie.name,
      originalTitle: movie.origin_name,
      posterUrl: movie.poster_url || movie.thumb_url,
      backdropUrl: movie.thumb_url,
      year: movie.year,
      quality: movie.quality,
      type: movie.type === "series" ? "series" : movie.type === "hoathinh" ? "animation" : movie.type === "tvshows" ? "tvshow" : "single",
      rating: movie.tmdb?.vote_average ? parseFloat(movie.tmdb.vote_average) : null,
    };
  }

  if (provider === "nguonc") {
    return {
      providerSlug: movie.slug,
      providerMovieId: movie.id,
      title: movie.name,
      originalTitle: movie.origin_name,
      posterUrl: movie.poster_url || movie.thumb_url,
      backdropUrl: movie.thumb_url,
      year: movie.year,
      quality: movie.quality,
      type: movie.type === "series" ? "series" : movie.type === "hoathinh" ? "animation" : movie.type === "tvshows" ? "tvshow" : "single",
    };
  }

  if (provider === "kkphim") {
    return {
      providerSlug: movie.slug,
      providerMovieId: movie._id,
      title: movie.name,
      originalTitle: movie.origin_name,
      posterUrl: movie.poster_url || movie.thumb_url,
      backdropUrl: movie.thumb_url,
      year: movie.year,
      quality: movie.quality,
      type: movie.type === "series" ? "series" : movie.type === "hoathinh" ? "animation" : movie.type === "tvshows" ? "tvshow" : "single",
      rating: movie.tmdb?.vote_average ? parseFloat(movie.tmdb.vote_average) : null,
    };
  }

  return movie;
}

// ============================================
// FETCH WITH TIMEOUT
// ============================================
async function fetchJson(url: string, timeout = 10000) {
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

// ============================================
// VSMOV - Uses path-based API
// ============================================
async function discoverVsmov(params: {
  path?: string;
  keyword?: string;
  country?: string;
  genre?: string;
  year?: string;
  page: number;
  limit: number;
}) {
  const url = new URL("https://vsmov.com/api");

  // Build path
  if (params.keyword) {
    url.pathname = url.pathname + "/tim-kiem";
    url.searchParams.set("keyword", params.keyword);
  } else if (params.country) {
    url.pathname = url.pathname + "/quoc-gia/" + params.country;
  } else if (params.genre) {
    url.pathname = url.pathname + "/the-loai/" + params.genre;
  } else if (params.year) {
    url.pathname = url.pathname + "/nam/" + params.year;
  } else if (params.path) {
    url.pathname = url.pathname + "/" + params.path;
  } else {
    url.pathname = url.pathname + "/danh-sach/phim-moi-cap-nhat";
  }

  url.searchParams.set("page", String(params.page));

  const data = await fetchJson(url.toString());
  if (!data) return { items: [], pagination: emptyPagination(params.page, params.limit) };

  const items = (data.items || []).map((m: any) => normalizeMovie(m, "vsmov"));
  const pagination = data.pagination || {};

  return {
    items,
    pagination: {
      currentPage: parseInt(pagination.currentPage || String(params.page)),
      totalPages: pagination.totalPages || Math.ceil(items.length / params.limit) || 1,
      totalItems: pagination.totalItems || items.length,
      itemsPerPage: params.limit,
    },
  };
}

// ============================================
// OPhim - Uses path-based API
// ============================================
async function discoverOphim(params: {
  kind?: string;
  slug?: string;
  year?: string;
  q?: string;
  page: number;
  limit: number;
}) {
  const baseUrl = "https://ophim1.com";
  let path = "/v1/api/danh-sach";
  const searchParams = new URLSearchParams();

  if (params.q) {
    path = "/v1/api/tim-kiem";
    searchParams.set("keyword", params.q);
  } else if (params.kind === "genre") {
    path = `/v1/api/the-loai/${params.slug}`;
  } else if (params.kind === "country") {
    path = `/v1/api/quoc-gia/${params.slug}`;
  } else if (params.kind === "year") {
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
  if (!data) return { items: [], pagination: emptyPagination(params.page, params.limit) };

  const items = (data.data?.items || []).map((m: any) => normalizeMovie(m, "ophim"));
  const pagination = data.data?.pagination || {};

  return {
    items,
    pagination: {
      currentPage: parseInt(pagination.currentPage || String(params.page)),
      totalPages: pagination.totalPages || Math.ceil(items.length / params.limit) || 1,
      totalItems: pagination.totalItems || items.length,
      itemsPerPage: params.limit,
    },
  };
}

// ============================================
// NguonC - Simple API
// ============================================
async function discoverNguonc(params: {
  kind?: string;
  q?: string;
  page: number;
}) {
  const baseUrl = "https://phim.nguonc.com";
  let path = "/api/films/phim-moi-cap-nhat";

  if (params.q) {
    path = "/api/films/search";
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
  if (!data) return { items: [], pagination: emptyPagination(params.page, 10) };

  const items = (data.items || []).map((m: any) => normalizeMovie(m, "nguonc"));
  const pagination = data.pagination || {};

  return {
    items,
    pagination: {
      currentPage: parseInt(pagination.currentPage || String(params.page)),
      totalPages: pagination.totalPages || 1,
      totalItems: pagination.totalItems || items.length,
      itemsPerPage: 10,
    },
  };
}

// ============================================
// KKPhim - Uses query params
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
  let path = "/v1/api/danh-sach";

  if (params.q) {
    path = "/v1/api/tim-kiem";
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
  if (params.genre) searchParams.set("genre", params.genre);
  if (params.country) searchParams.set("country", params.country);
  if (params.year) searchParams.set("year", params.year);
  if (params.sort) searchParams.set("sort_field", params.sort);

  const data = await fetchJson(`${baseUrl}${path}?${searchParams.toString()}`);
  if (!data) return { items: [], pagination: emptyPagination(params.page, params.limit) };

  const items = (data.data?.items || []).map((m: any) => normalizeMovie(m, "kkphim"));
  const pagination = data.data?.pagination || {};

  return {
    items,
    pagination: {
      currentPage: parseInt(pagination.currentPage || String(params.page)),
      totalPages: pagination.totalPages || Math.ceil(items.length / params.limit) || 1,
      totalItems: pagination.totalItems || items.length,
      itemsPerPage: params.limit,
    },
  };
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
  const sort = searchParams.get("sort") || "modified";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "24");
  const q = searchParams.get("q") || "";

  try {
    let result;

    switch (apiId) {
      case "vsmov":
        if (q) {
          result = await discoverVsmov({ keyword: q, page, limit });
        } else if (country) {
          result = await discoverVsmov({ country, page, limit });
        } else if (genre) {
          result = await discoverVsmov({ genre, page, limit });
        } else if (year) {
          result = await discoverVsmov({ year, page, limit });
        } else {
          const path = kind === "single" ? "danh-sach/phim-le"
            : kind === "series" ? "danh-sach/phim-bo"
            : kind === "animation" ? "the-loai/hoat-hinh"
            : kind === "tvshow" ? "danh-sach/phim-bo"
            : "danh-sach/phim-moi-cap-nhat";
          result = await discoverVsmov({ path, page, limit });
        }
        break;

      case "ophim":
        if (q) {
          result = await discoverOphim({ q, page, limit });
        } else if (genre) {
          result = await discoverOphim({ kind: "genre", slug: genre, page, limit });
        } else if (country) {
          result = await discoverOphim({ kind: "country", slug: country, page, limit });
        } else if (year) {
          result = await discoverOphim({ kind: "year", year, page, limit });
        } else {
          result = await discoverOphim({ kind, page, limit });
        }
        break;

      case "nguonc":
        if (q) {
          result = await discoverNguonc({ q, page });
        } else {
          result = await discoverNguonc({ kind, page });
        }
        break;

      case "kkphim":
        if (q) {
          result = await discoverKkphim({ q, page, limit });
        } else if (genre) {
          result = await discoverKkphim({ genre, page, limit });
        } else if (country) {
          result = await discoverKkphim({ country, page, limit });
        } else if (year) {
          result = await discoverKkphim({ year, page, limit });
        } else {
          result = await discoverKkphim({ kind, sort, page, limit });
        }
        break;

      default:
        return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(`[API] Discover ${storeId} error:`, error);
    return NextResponse.json({ error: "Failed to fetch movies" }, { status: 500 });
  }
}