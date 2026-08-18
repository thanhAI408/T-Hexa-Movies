import { NextRequest, NextResponse } from "next/server";
import { STORE_API_MAP } from "@/lib/stores/config";

// Valid store slugs
const VALID_STORES = [
  "binh-minh", "ban-mai", "hoang-hon", "da-nguyet",
  "xuan", "ha", "thu", "dong",
  "vsmov", "ophim", "nguonc", "kkphim"
];

// ============================================
// VSMOV (Bình Minh) - Rich filtering
// ============================================
async function getVsmovExplore(storeSlug: string, type: string, page: number, limit: number) {
  const baseUrl = "https://vsmov.com/api";

  if (type === "genre") {
    // Get movies by genre from search
    return { type: "genre", endpoint: "tim-kiem" };
  }

  if (type === "country") {
    return { type: "country", endpoint: "tim-kiem" };
  }

  return null;
}

// ============================================
// OPhim (Ban Mai) - Categories & Filters
// ============================================
async function getOphimExplore(storeSlug: string, type: string, page: number, limit: number) {
  const baseUrl = "https://ophim1.com";

  if (type === "region") {
    // OPhim có region/quốc gia riêng
    const response = await fetch(`${baseUrl}/v1/api/quoc-gia`);
    const data = await response.json();
    return { type: "region", items: data.data?.items || [] };
  }

  if (type === "category") {
    // OPhim có danh mục
    const response = await fetch(`${baseUrl}/v1/api/the-loai`);
    const data = await response.json();
    return { type: "category", items: data.data?.items || [] };
  }

  return null;
}

// ============================================
// NguonC (Hoàng Hôn) - Simple but clean
// ============================================
async function getNguoncExplore(storeSlug: string, type: string) {
  if (type === "genre") {
    // NguonC static genres
    return {
      type: "genre",
      items: [
        { slug: "phim-le", name: "Phim lẻ" },
        { slug: "phim-bo", name: "Phim bộ" },
        { slug: "hoat-hinh", name: "Hoạt hình" },
        { slug: "tv-shows", name: "TV Shows" },
      ]
    };
  }

  return null;
}

// ============================================
// KKPhim (Dạ Nguyệt) - Rich content
// ============================================
async function getKkphimExplore(storeSlug: string, type: string) {
  const baseUrl = "https://phimapi.com";

  if (type === "genre") {
    const response = await fetch(`${baseUrl}/the-loai`);
    const data = await response.json();
    return { type: "genre", items: data.data?.items || [] };
  }

  if (type === "country") {
    const response = await fetch(`${baseUrl}/quoc-gia`);
    const data = await response.json();
    return { type: "country", items: data.data?.items || [] };
  }

  if (type === "year") {
    const response = await fetch(`${baseUrl}/nam-phat-hanh`);
    const data = await response.json();
    return { type: "year", items: data.data?.items || [] };
  }

  return null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await context.params;
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type") || "all";

  if (!VALID_STORES.includes(storeId)) {
    return NextResponse.json({ error: "Invalid store ID" }, { status: 400 });
  }

  const apiId = STORE_API_MAP[storeId] || storeId;

  try {
    let result: any = {};

    // Get taxonomy based on provider
    switch (apiId) {
      case "vsmov":
        // VSMOV rich taxonomy
        const vsmovGenres = await fetch("https://vsmov.com/api/the-loai").then(r => r.json());
        const vsmovCountries = await fetch("https://vsmov.com/api/quoc-gia").then(r => r.json());
        const vsmovYears = await fetch("https://vsmov.com/api/nam").then(r => r.json());

        result = {
          provider: "vsmov",
          store: "Bình Minh",
          categories: [
            { id: "latest", name: "✨ Mới cập nhật", slug: "latest", emoji: "🆕" },
            { id: "single", name: "🎬 Phim lẻ", slug: "single", emoji: "🎥" },
            { id: "series", name: "📺 Phim bộ", slug: "series", emoji: "📺" },
            { id: "animation", name: "🎨 Hoạt hình", slug: "animation", emoji: "🎨" },
            { id: "tvshow", name: "📡 TV Shows", slug: "tvshow", emoji: "📡" },
          ],
          genres: vsmovGenres.data?.items || [],
          countries: vsmovCountries.data?.items || [],
          years: (vsmovYears.data?.items || []).map((y: any) => y.slug || y.year).filter(Boolean).slice(0, 30),
          filters: {
            hasGenres: true,
            hasCountries: true,
            hasYears: true,
            hasQuality: true,
            hasSort: true,
          }
        };
        break;

      case "ophim":
        // OPhim with regions & categories
        const ophimGenres = await fetch("https://ophim1.com/v1/api/the-loai").then(r => r.json());
        const ophimCountries = await fetch("https://ophim1.com/v1/api/quoc-gia").then(r => r.json());
        const ophimYears = await fetch("https://ophim1.com/nam-phat-hanh").then(r => r.json());

        result = {
          provider: "ophim",
          store: "Ban Mai",
          categories: [
            { id: "latest", name: "✨ Phim mới cập nhật", slug: "latest", emoji: "🆕" },
            { id: "single", name: "🎬 Phim lẻ", slug: "single", emoji: "🎥" },
            { id: "series", name: "📺 Phim bộ", slug: "series", emoji: "📺" },
            { id: "animation", name: "🎨 Hoạt hình", slug: "animation", emoji: "🎨" },
            { id: "tvshow", name: "📡 TV Shows", slug: "tvshow", emoji: "📡" },
            { id: "cinema", name: "🎥 Phim chiếu rạp", slug: "cinema", emoji: "🏛️" },
          ],
          genres: ophimGenres.data?.items || [],
          countries: ophimCountries.data?.items || [],
          years: (ophimYears.data?.items || []).map((y: any) => y.year).filter(Boolean).slice(0, 30),
          regions: [
            { slug: "au-my", name: "Âu Mỹ", emoji: "🇺🇸" },
            { slug: "han-quoc", name: "Hàn Quốc", emoji: "🇰🇷" },
            { slug: "trung-quoc", name: "Trung Quốc", emoji: "🇨🇳" },
            { slug: "nhat-ban", name: "Nhật Bản", emoji: "🇯🇵" },
            { slug: "thai-lan", name: "Thái Lan", emoji: "🇹🇭" },
            { slug: "viet-nam", name: "Việt Nam", emoji: "🇻🇳" },
          ],
          filters: {
            hasGenres: true,
            hasCountries: true,
            hasYears: true,
            hasRegions: true,
            hasQuality: true,
            hasSort: true,
          }
        };
        break;

      case "nguonc":
        // NguonC - Simple & Clean
        result = {
          provider: "nguonc",
          store: "Hoàng Hôn",
          categories: [
            { id: "latest", name: "✨ Phim mới cập nhật", slug: "latest", emoji: "🆕" },
            { id: "single", name: "🎬 Phim lẻ", slug: "single", emoji: "🎥" },
            { id: "series", name: "📺 Phim bộ", slug: "series", emoji: "📺" },
            { id: "animation", name: "🎨 Hoạt hình", slug: "animation", emoji: "🎨" },
            { id: "tvshow", name: "📡 TV Shows", slug: "tvshow", emoji: "📡" },
          ],
          genres: [],
          countries: [],
          years: [],
          filters: {
            hasGenres: false,
            hasCountries: false,
            hasYears: false,
            hasSort: true,
          }
        };
        break;

      case "kkphim":
        // KKPhim - Rich & Complete
        const kkGenres = await fetch("https://phimapi.com/the-loai").then(r => r.json());
        const kkCountries = await fetch("https://phimapi.com/quoc-gia").then(r => r.json());
        const kkYears = await fetch("https://phimapi.com/nam-phat-hanh").then(r => r.json());

        result = {
          provider: "kkphim",
          store: "Dạ Nguyệt",
          categories: [
            { id: "latest", name: "✨ Phim mới cập nhật", slug: "latest", emoji: "🆕" },
            { id: "single", name: "🎬 Phim lẻ", slug: "single", emoji: "🎥" },
            { id: "series", name: "📺 Phim bộ", slug: "series", emoji: "📺" },
            { id: "animation", name: "🎨 Hoạt hình", slug: "animation", emoji: "🎨" },
            { id: "tvshow", name: "📡 TV Shows", slug: "tvshow", emoji: "📡" },
            { id: "cinema", name: "🎥 Phim chiếu rạp", slug: "cinema", emoji: "🏛️" },
          ],
          genres: kkGenres.data?.items || [],
          countries: kkCountries.data?.items || [],
          years: (kkYears.data?.items || []).map((y: any) => y.year).filter(Boolean).slice(0, 30),
          filters: {
            hasGenres: true,
            hasCountries: true,
            hasYears: true,
            hasQuality: true,
            hasSort: true,
          }
        };
        break;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(`[API] Explore ${storeId} error:`, error);
    return NextResponse.json({ error: "Failed to fetch explore data" }, { status: 500 });
  }
}
