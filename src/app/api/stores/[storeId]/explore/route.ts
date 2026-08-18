import { NextRequest, NextResponse } from "next/server";
import { STORE_API_MAP } from "@/lib/stores/config";

const VALID_STORES = [
  "binh-minh", "ban-mai", "hoang-hon", "da-nguyet",
  "xuan", "ha", "thu", "dong",
  "vsmov", "ophim", "nguonc", "kkphim"
];

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
// VSMOV (Bình Minh) - FULL TAXONOMY
// ============================================
async function getVsmovExplore() {
  const [genresData, countriesData, yearsData] = await Promise.all([
    fetchJson("https://vsmov.com/api/the-loai"),
    fetchJson("https://vsmov.com/api/quoc-gia"),
    fetchJson("https://vsmov.com/api/nam"),
  ]);

  const genres = (genresData?.data?.items || []).map((g: any) => ({ slug: g.slug, name: g.name }));
  const countries = (countriesData?.data?.items || []).map((c: any) => ({ slug: c.slug, name: c.name }));
  const years = (yearsData?.data?.items || []).map((y: any) => parseInt(y.slug)).filter(Boolean);

  return {
    provider: "vsmov",
    store: "Bình Minh",
    description: "Khoảnh khắc mặt trời vừa ló - Dịu dàng, thơ, ấm áp",

    // Categories
    categories: [
      { id: "latest", name: "✨ Mới cập nhật", slug: "latest", emoji: "🆕", count: "18K+" },
      { id: "single", name: "🎬 Phim lẻ", slug: "single", emoji: "🎥", path: "danh-sach/phim-le" },
      { id: "series", name: "📺 Phim bộ", slug: "series", emoji: "📺", path: "danh-sach/phim-bo" },
      { id: "animation", name: "🎨 Hoạt hình", slug: "animation", emoji: "🎨", path: "the-loai/hoat-hinh" },
      { id: "tvshow", name: "📡 TV Shows", slug: "tvshow", emoji: "📡", path: "danh-sach/tv-shows" },
    ],

    // Genres - ALL 45 genres
    genres,
    genresCount: genres.length,

    // Countries - ALL 187 countries
    countries,
    countriesCount: countries.length,

    // Years - ALL years (from API)
    years,
    yearsCount: years.length,

    // Filter flags
    filters: {
      hasGenres: true,
      hasCountries: true,
      hasYears: true,
      hasQuality: true,
      hasSort: true,
      hasRating: true,
    },

    // Special filters available
    specialFilters: {
      topViewed: { name: "👁️ Xem nhiều nhất", path: "danh-sach/phim-hot" },
      netflix: { name: "📺 Phim Netflix", path: "the-loai/netflix" },
      disney: { name: "⭐ Disney+", path: "the-loai/disney" },
    },
  };
}

// ============================================
// OPhim (Ban Mai) - FULL TAXONOMY
// ============================================
async function getOphimExplore() {
  const [genresData, countriesData, yearsData] = await Promise.all([
    fetchJson("https://ophim1.com/v1/api/the-loai"),
    fetchJson("https://ophim1.com/v1/api/quoc-gia"),
    fetchJson("https://ophim1.com/nam-phat-hanh"),
  ]);

  const genres = (genresData?.data?.items || []).map((g: any) => ({ slug: g.slug, name: g.name }));
  const countries = (countriesData?.data?.items || []).map((c: any) => ({ slug: c.slug, name: c.name }));
  const yearsRaw: number[] = (yearsData?.data?.items || []).map((y: any) => parseInt(y.year)).filter((n: number) => !isNaN(n));
  const years = [...new Set(yearsRaw)].sort((a, b) => b - a);

  return {
    provider: "ophim",
    store: "Ban Mai",
    description: "Buổi sáng rõ nét - Tươi mới, sáng sủa, thoải mái",

    categories: [
      { id: "latest", name: "✨ Phim mới cập nhật", slug: "latest", emoji: "🆕" },
      { id: "single", name: "🎬 Phim lẻ", slug: "single", emoji: "🎥", path: "danh-sach/phim-le" },
      { id: "series", name: "📺 Phim bộ", slug: "series", emoji: "📺", path: "danh-sach/phim-bo" },
      { id: "animation", name: "🎨 Hoạt hình", slug: "animation", emoji: "🎨", path: "danh-sach/hoat-hinh" },
      { id: "tvshow", name: "📡 TV Shows", slug: "tvshow", emoji: "📡", path: "danh-sach/tv-shows" },
      { id: "cinema", name: "🏛️ Phim chiếu rạp", slug: "cinema", emoji: "🏛️", path: "danh-sach/phim-chieu-rap" },
    ],

    genres,
    genresCount: genres.length,

    countries,
    countriesCount: countries.length,

    years,
    yearsCount: years.length,

    filters: {
      hasGenres: true,
      hasCountries: true,
      hasYears: true,
      hasQuality: true,
      hasSort: true,
      hasRating: true,
    },
  };
}

// ============================================
// NguonC (Hoàng Hôn) - LIMITED but available
// ============================================
async function getNguoncExplore() {
  // NguonC có thể có endpoint khác - thử explore
  const latestData = await fetchJson("https://phim.nguonc.com/api/films/phim-moi-cap-nhat?page=1");

  // Extract available types from data
  const types: string[] = [];
  if (latestData?.items) {
    latestData.items.forEach((item: any) => {
      if (item.type && !types.includes(item.type)) {
        types.push(item.type);
      }
    });
  }

  // Try to get categories and countries
  const categoriesData = await fetchJson("https://phim.nguonc.com/api/the-loai");
  const countriesData = await fetchJson("https://phim.nguonc.com/api/quoc-gia");

  const genres = (categoriesData?.items || []).map((g: any) => ({ slug: g.slug, name: g.name }));
  const countries = (countriesData?.items || []).map((c: any) => ({ slug: c.slug, name: c.name }));

  return {
    provider: "nguonc",
    store: "Hoàng Hôn",
    description: "Cuối ngày điện ảnh - Ấm áp, sâu lắng, hoài niệm",

    categories: [
      { id: "latest", name: "✨ Phim mới cập nhật", slug: "latest", emoji: "🆕", path: "phim-moi-cap-nhat" },
      { id: "single", name: "🎬 Phim lẻ", slug: "single", emoji: "🎥", path: "danh-sach/phim-le" },
      { id: "series", name: "📺 Phim bộ", slug: "series", emoji: "📺", path: "danh-sach/phim-bo" },
      { id: "animation", name: "🎨 Hoạt hình", slug: "animation", emoji: "🎨", path: "danh-sach/hoat-hinh" },
      { id: "tvshow", name: "📡 TV Shows", slug: "tvshow", emoji: "📡", path: "danh-sach/tv-shows" },
    ],

    genres,
    genresCount: genres.length,

    countries,
    countriesCount: countries.length,

    years: [],
    yearsCount: 0,

    filters: {
      hasGenres: genres.length > 0,
      hasCountries: countries.length > 0,
      hasYears: false,
      hasQuality: true,
      hasSort: true,
      hasRating: false,
    },
  };
}

// ============================================
// KKPhim (Dạ Nguyệt) - FULL TAXONOMY
// ============================================
async function getKkphimExplore() {
  const [genresData, countriesData, yearsData] = await Promise.all([
    fetchJson("https://phimapi.com/the-loai"),
    fetchJson("https://phimapi.com/quoc-gia"),
    fetchJson("https://phimapi.com/nam-phat-hanh"),
  ]);

  const genres = (genresData?.data?.items || []).map((g: any) => ({ slug: g.slug, name: g.name }));
  const countries = (countriesData?.data?.items || []).map((c: any) => ({ slug: c.slug, name: c.name }));
  const yearsRaw: number[] = (yearsData?.data?.items || []).map((y: any) => parseInt(y.year)).filter((n: number) => !isNaN(n));
  const years = [...new Set(yearsRaw)].sort((a, b) => b - a);

  return {
    provider: "kkphim",
    store: "Dạ Nguyệt",
    description: "Đêm trăng huyền bí - Sang trọng, tĩnh lặng, cuốn hút",

    categories: [
      { id: "latest", name: "✨ Phim mới cập nhật", slug: "latest", emoji: "🆕" },
      { id: "single", name: "🎬 Phim lẻ", slug: "single", emoji: "🎥", path: "danh-sach/phim-le" },
      { id: "series", name: "📺 Phim bộ", slug: "series", emoji: "📺", path: "danh-sach/phim-bo" },
      { id: "animation", name: "🎨 Hoạt hình", slug: "animation", emoji: "🎨", path: "danh-sach/hoat-hinh" },
      { id: "tvshow", name: "📡 TV Shows", slug: "tvshow", emoji: "📡", path: "danh-sach/tv-shows" },
      { id: "cinema", name: "🏛️ Phim chiếu rạp", slug: "cinema", emoji: "🏛️", path: "danh-sach/phim-chieu-rap" },
    ],

    genres,
    genresCount: genres.length,

    countries,
    countriesCount: countries.length,

    years,
    yearsCount: years.length,

    filters: {
      hasGenres: true,
      hasCountries: true,
      hasYears: true,
      hasQuality: true,
      hasSort: true,
      hasRating: true,
    },
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await context.params;

  if (!VALID_STORES.includes(storeId)) {
    return NextResponse.json({ error: "Invalid store ID" }, { status: 400 });
  }

  const apiId = STORE_API_MAP[storeId] || storeId;

  try {
    let result;

    switch (apiId) {
      case "vsmov":
        result = await getVsmovExplore();
        break;
      case "ophim":
        result = await getOphimExplore();
        break;
      case "nguonc":
        result = await getNguoncExplore();
        break;
      case "kkphim":
        result = await getKkphimExplore();
        break;
      default:
        return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(`[API] Explore ${storeId} error:`, error);
    return NextResponse.json({ error: "Failed to fetch explore data" }, { status: 500 });
  }
}
