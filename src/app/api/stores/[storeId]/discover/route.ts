import { NextRequest, NextResponse } from "next/server";
import { STORE_API_MAP } from "@/lib/stores/config";

const VALID_STORES = [
  "binh-minh", "ban-mai", "hoang-hon", "da-nguyet",
  "xuan", "ha", "thu", "dong",
  "vsmov", "ophim", "nguonc", "kkphim"
];

// Normalize movie fields from different providers
function normalizeMovie(movie: any, provider: string) {
  if (provider === "vsmov") {
    // VSMOV uses: name, origin_name, slug, poster_url, thumb_url, year, quality
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
    // OPhim uses: slug, name, origin_name, poster_url, thumb_url, year, quality
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

// VSMOV rich discover
async function discoverVsmov(baseUrl: string, params: Record<string, string>) {
  try {
    let path = params.path || "danh-sach/phim-moi-cap-nhat";
    const url = new URL(`${baseUrl}/api/${path}`);
    Object.entries(params).forEach(([k, v]) => {
      if (k !== "path") url.searchParams.set(k, v);
    });

    const response = await fetch(url.toString());
    const data = await response.json();

    const items = data.items || [];
    return {
      items: items.map((m: any) => normalizeMovie(m, "vsmov")),
      pagination: {
        currentPage: parseInt(params.page || "1"),
        totalPages: data.pagination?.totalPages || Math.ceil(items.length / parseInt(params.limit || "24")) || 1,
        totalItems: data.pagination?.totalItems || items.length || 0,
        itemsPerPage: parseInt(params.limit || "24"),
      }
    };
  } catch (error) {
    return { items: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 24 } };
  }
}

// OPhim has rich filtering by slug
async function discoverOphim(baseUrl: string, kind: string, params: Record<string, string>) {
  try {
    let path = "/v1/api/danh-sach";
    if (kind === "genre") path = `/v1/api/the-loai/${params.slug}`;
    else if (kind === "country") path = `/v1/api/quoc-gia/${params.slug}`;
    else if (kind === "year") path = `/v1/api/nam/${params.year}`;
    else if (kind === "latest") path = "/v1/api/danh-sach";
    else if (kind === "single") path = "/v1/api/danh-sach/phim-le";
    else if (kind === "series") path = "/v1/api/danh-sach/phim-bo";
    else if (kind === "animation") path = "/v1/api/danh-sach/hoat-hinh";
    else if (kind === "tvshow") path = "/v1/api/danh-sach/tv-shows";
    else if (kind === "cinema") path = "/v1/api/danh-sach/phim-chieu-rap";

    const url = new URL(`${baseUrl}${path}`);
    url.searchParams.set("page", params.page || "1");
    url.searchParams.set("limit", params.limit || "24");

    const response = await fetch(url.toString());
    const data = await response.json();

    const items = data.data?.items || [];
    return {
      items: items.map((m: any) => normalizeMovie(m, "ophim")),
      pagination: {
        currentPage: parseInt(params.page || "1"),
        totalPages: data.data?.pagination?.totalPages || Math.ceil(items.length / parseInt(params.limit || "24")) || 1,
        totalItems: data.data?.pagination?.totalItems || items.length || 0,
        itemsPerPage: parseInt(params.limit || "24"),
      }
    };
  } catch (error) {
    return { items: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 24 } };
  }
}

// NguonC simple
async function discoverNguonc(baseUrl: string, params: Record<string, string>) {
  try {
    const path = params.path || "/api/films/phim-moi-cap-nhat";
    const url = new URL(`${baseUrl}${path}`);
    url.searchParams.set("page", params.page || "1");

    const response = await fetch(url.toString());
    const data = await response.json();

    const items = data.items || [];
    return {
      items: items.map((m: any) => normalizeMovie(m, "nguonc")),
      pagination: {
        currentPage: parseInt(params.page || "1"),
        totalPages: data.pagination?.totalPages || Math.ceil(items.length / 10) || 1,
        totalItems: data.pagination?.totalItems || items.length || 0,
        itemsPerPage: 10,
      }
    };
  } catch (error) {
    return { items: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 } };
  }
}

// KKPhim rich
async function discoverKkphim(baseUrl: string, params: Record<string, string>) {
  try {
    let path = "/v1/api/danh-sach";
    if (params.kind && params.kind !== "latest") {
      const kindMap: Record<string, string> = {
        single: "/v1/api/danh-sach/phim-le",
        series: "/v1/api/danh-sach/phim-bo",
        animation: "/v1/api/danh-sach/hoat-hinh",
        tvshow: "/v1/api/danh-sach/tv-shows",
        cinema: "/v1/api/danh-sach/phim-chieu-rap",
      };
      path = kindMap[params.kind] || path;
    }

    const url = new URL(`${baseUrl}${path}`);
    Object.entries(params).forEach(([k, v]) => {
      if (k !== "kind" && k !== "path") url.searchParams.set(k, String(v));
    });

    const response = await fetch(url.toString());
    const data = await response.json();

    const items = data.data?.items || [];
    return {
      items: items.map((m: any) => normalizeMovie(m, "kkphim")),
      pagination: {
        currentPage: parseInt(params.page || "1"),
        totalPages: data.data?.pagination?.totalPages || Math.ceil(items.length / parseInt(params.limit || "24")) || 1,
        totalItems: data.data?.pagination?.totalItems || items.length || 0,
        itemsPerPage: parseInt(params.limit || "24"),
      }
    };
  } catch (error) {
    return { items: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 24 } };
  }
}

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
  const page = searchParams.get("page") || "1";
  const limit = searchParams.get("limit") || "24";
  const q = searchParams.get("q") || "";

  const baseUrls: Record<string, string> = {
    vsmov: "https://vsmov.com",
    ophim: "https://ophim1.com",
    nguonc: "https://phim.nguonc.com",
    kkphim: "https://phimapi.com",
  };

  const baseUrl = baseUrls[apiId];

  try {
    let result;

    // Search query
    if (q) {
      switch (apiId) {
        case "vsmov":
          result = await discoverVsmov(baseUrl, { path: "tim-kiem", keyword: q, page, limit });
          break;
        case "ophim":
          const ophimSearchUrl = new URL(`${baseUrl}/v1/api/tim-kiem`);
          ophimSearchUrl.searchParams.set("keyword", q);
          ophimSearchUrl.searchParams.set("page", page);
          ophimSearchUrl.searchParams.set("limit", limit);
          const ophimSearch = await fetch(ophimSearchUrl.toString()).then(r => r.json());
          result = {
            items: (ophimSearch.data?.items || []).map((m: any) => normalizeMovie(m, "ophim")),
            pagination: ophimSearch.data?.pagination || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 24 }
          };
          break;
        case "nguonc":
          const nguoncSearchUrl = new URL(`${baseUrl}/api/films/search`);
          nguoncSearchUrl.searchParams.set("keyword", q);
          nguoncSearchUrl.searchParams.set("page", page);
          const nguoncSearch = await fetch(nguoncSearchUrl.toString()).then(r => r.json());
          result = {
            items: (nguoncSearch.items || []).map((m: any) => normalizeMovie(m, "nguonc")),
            pagination: nguoncSearch.pagination || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 }
          };
          break;
        case "kkphim":
          const kkphimSearchUrl = new URL(`${baseUrl}/v1/api/tim-kiem`);
          kkphimSearchUrl.searchParams.set("keyword", q);
          kkphimSearchUrl.searchParams.set("page", page);
          kkphimSearchUrl.searchParams.set("limit", limit);
          const kkphimSearch = await fetch(kkphimSearchUrl.toString()).then(r => r.json());
          result = {
            items: (kkphimSearch.data?.items || []).map((m: any) => normalizeMovie(m, "kkphim")),
            pagination: kkphimSearch.data?.pagination || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 24 }
          };
          break;
      }
    }
    // Filter by genre
    else if (genre) {
      switch (apiId) {
        case "vsmov":
          result = await discoverVsmov(baseUrl, { path: "tim-kiem", keyword: genre, page, limit });
          break;
        case "ophim":
          result = await discoverOphim(baseUrl, "genre", { slug: genre, page, limit });
          break;
        case "kkphim":
          result = await discoverKkphim(baseUrl, { genre, sort_field: sort, page, limit });
          break;
        default:
          result = { items: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 24 } };
      }
    }
    // Filter by country
    else if (country) {
      switch (apiId) {
        case "vsmov":
          result = await discoverVsmov(baseUrl, { path: "tim-kiem", keyword: country, page, limit });
          break;
        case "ophim":
          result = await discoverOphim(baseUrl, "country", { slug: country, page, limit });
          break;
        case "kkphim":
          result = await discoverKkphim(baseUrl, { country, sort_field: sort, page, limit });
          break;
        default:
          result = { items: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 24 } };
      }
    }
    // Filter by year
    else if (year) {
      switch (apiId) {
        case "vsmov":
          result = await discoverVsmov(baseUrl, { path: "tim-kiem", keyword: year, page, limit });
          break;
        case "ophim":
          result = await discoverOphim(baseUrl, "year", { year, page, limit });
          break;
        case "kkphim":
          result = await discoverKkphim(baseUrl, { year, sort_field: sort, page, limit });
          break;
        default:
          result = { items: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 24 } };
      }
    }
    // Default list by kind
    else {
      switch (apiId) {
        case "vsmov":
          const vsmovPath = kind === "latest" ? "danh-sach/phim-moi-cap-nhat"
            : kind === "single" ? "danh-sach/phim-le"
            : kind === "series" ? "danh-sach/phim-bo"
            : kind === "animation" ? "the-loai/hoat-hinh"
            : "danh-sach/phim-moi";
          result = await discoverVsmov(baseUrl, { path: vsmovPath, page, limit });
          break;
        case "ophim":
          result = await discoverOphim(baseUrl, kind, { page, limit });
          break;
        case "nguonc":
          const nguoncPath = kind === "single" ? "/api/films/danh-sach/phim-le"
            : kind === "series" ? "/api/films/danh-sach/phim-bo"
            : kind === "animation" ? "/api/films/danh-sach/hoat-hinh"
            : kind === "tvshow" ? "/api/films/danh-sach/tv-shows"
            : "/api/films/phim-moi-cap-nhat";
          result = await discoverNguonc(baseUrl, { path: nguoncPath, page });
          break;
        case "kkphim":
          result = await discoverKkphim(baseUrl, { kind, sort_field: sort, page, limit });
          break;
      }
    }

    return NextResponse.json(result || { items: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 24 } });
  } catch (error) {
    console.error(`[API] Discover ${storeId} error:`, error);
    return NextResponse.json({ error: "Failed to fetch movies" }, { status: 500 });
  }
}