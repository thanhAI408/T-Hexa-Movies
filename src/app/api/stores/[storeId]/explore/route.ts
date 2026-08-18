import { NextRequest, NextResponse } from "next/server";
import { STORE_API_MAP } from "@/lib/stores/config";

const VALID_STORES = [
  "binh-minh", "ban-mai", "hoang-hon", "da-nguyet",
  "xuan", "ha", "thu", "dong",
  "vsmov", "ophim", "nguonc", "kkphim"
];

// Cache taxonomy data to avoid re-fetching
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
// VSMOV (Bình Minh) - Full taxonomy
// ============================================
async function getVsmovExplore() {
  const [genres, countries, years] = await Promise.all([
    fetchJson("https://vsmov.com/api/the-loai"),
    fetchJson("https://vsmov.com/api/quoc-gia"),
    fetchJson("https://vsmov.com/api/nam"),
  ]);

  return {
    provider: "vsmov",
    store: "Bình Minh",
    categories: [
      { id: "latest", name: "✨ Mới cập nhật", slug: "latest", emoji: "🆕" },
      { id: "single", name: "🎬 Phim lẻ", slug: "single", emoji: "🎥" },
      { id: "series", name: "📺 Phim bộ", slug: "series", emoji: "📺" },
      { id: "animation", name: "🎨 Hoạt hình", slug: "animation", emoji: "🎨" },
      { id: "tvshow", name: "📡 TV Shows", slug: "tvshow", emoji: "📡" },
    ],
    genres: (genres?.data?.items || []).map((g: any) => ({ slug: g.slug, name: g.name })),
    countries: (countries?.data?.items || []).map((c: any) => ({ slug: c.slug, name: c.name })),
    years: (years?.data?.items || []).map((y: any) => parseInt(y.slug)).filter(Boolean).slice(0, 30),
    filters: {
      hasGenres: true,
      hasCountries: true,
      hasYears: true,
      hasRegions: false,
      hasQuality: false,
      hasSort: true,
    },
  };
}

// ============================================
// OPhim (Ban Mai) - Full taxonomy
// ============================================
async function getOphimExplore() {
  const [genres, countries, years] = await Promise.all([
    fetchJson("https://ophim1.com/v1/api/the-loai"),
    fetchJson("https://ophim1.com/v1/api/quoc-gia"),
    fetchJson("https://ophim1.com/nam-phat-hanh"),
  ]);

  return {
    provider: "ophim",
    store: "Ban Mai",
    categories: [
      { id: "latest", name: "✨ Phim mới cập nhật", slug: "latest", emoji: "🆕" },
      { id: "single", name: "🎬 Phim lẻ", slug: "single", emoji: "🎥" },
      { id: "series", name: "📺 Phim bộ", slug: "series", emoji: "📺" },
      { id: "animation", name: "🎨 Hoạt hình", slug: "animation", emoji: "🎨" },
      { id: "tvshow", name: "📡 TV Shows", slug: "tvshow", emoji: "📡" },
      { id: "cinema", name: "🏛️ Phim chiếu rạp", slug: "cinema", emoji: "🏛️" },
    ],
    genres: (genres?.data?.items || []).map((g: any) => ({ slug: g.slug, name: g.name })),
    countries: (countries?.data?.items || []).map((c: any) => ({ slug: c.slug, name: c.name })),
    years: (years?.data?.items || []).map((y: any) => parseInt(y.year)).filter(Boolean).slice(0, 30),
    filters: {
      hasGenres: true,
      hasCountries: true,
      hasYears: true,
      hasRegions: false,
      hasQuality: false,
      hasSort: true,
    },
  };
}

// ============================================
// NguonC (Hoàng Hôn) - Limited taxonomy
// ============================================
async function getNguoncExplore() {
  // NguonC provides country list
  const countries = await fetchJson("https://phim.nguonc.com/api/countries");
  const genres = await fetchJson("https://phim.nguonc.com/api/categories");

  return {
    provider: "nguonc",
    store: "Hoàng Hôn",
    categories: [
      { id: "latest", name: "✨ Phim mới cập nhật", slug: "latest", emoji: "🆕" },
      { id: "single", name: "🎬 Phim lẻ", slug: "single", emoji: "🎥" },
      { id: "series", name: "📺 Phim bộ", slug: "series", emoji: "📺" },
      { id: "animation", name: "🎨 Hoạt hình", slug: "animation", emoji: "🎨" },
      { id: "tvshow", name: "📡 TV Shows", slug: "tvshow", emoji: "📡" },
    ],
    genres: (genres?.items || []).map((g: any) => ({ slug: g.slug, name: g.name })),
    countries: (countries?.items || []).map((c: any) => ({ slug: c.slug, name: c.name })),
    years: [],
    filters: {
      hasGenres: true,
      hasCountries: true,
      hasYears: false,
      hasRegions: false,
      hasQuality: false,
      hasSort: true,
    },
  };
}

// ============================================
// KKPhim (Dạ Nguyệt) - Full taxonomy
// ============================================
async function getKkphimExplore() {
  const [genres, countries, years] = await Promise.all([
    fetchJson("https://phimapi.com/the-loai"),
    fetchJson("https://phimapi.com/quoc-gia"),
    fetchJson("https://phimapi.com/nam-phat-hanh"),
  ]);

  return {
    provider: "kkphim",
    store: "Dạ Nguyệt",
    categories: [
      { id: "latest", name: "✨ Phim mới cập nhật", slug: "latest", emoji: "🆕" },
      { id: "single", name: "🎬 Phim lẻ", slug: "single", emoji: "🎥" },
      { id: "series", name: "📺 Phim bộ", slug: "series", emoji: "📺" },
      { id: "animation", name: "🎨 Hoạt hình", slug: "animation", emoji: "🎨" },
      { id: "tvshow", name: "📡 TV Shows", slug: "tvshow", emoji: "📡" },
      { id: "cinema", name: "🏛️ Phim chiếu rạp", slug: "cinema", emoji: "🏛️" },
    ],
    genres: (genres?.data?.items || []).map((g: any) => ({ slug: g.slug, name: g.name })),
    countries: (countries?.data?.items || []).map((c: any) => ({ slug: c.slug, name: c.name })),
    years: (years?.data?.items || []).map((y: any) => parseInt(y.year)).filter(Boolean).slice(0, 30),
    filters: {
      hasGenres: true,
      hasCountries: true,
      hasYears: true,
      hasRegions: false,
      hasQuality: false,
      hasSort: true,
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
