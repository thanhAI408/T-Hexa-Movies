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
async function fetchJson(url: string, timeout = 6000) {
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

// Sanitize and sort years: currentYear + 1 down to 1980
function sanitizeYears(rawYears: (number | string)[]): number[] {
  const currentYear = new Date().getFullYear();
  const maxYear = currentYear + 1;
  const minYear = 1980;

  const valid = Array.from(
    new Set(
      rawYears
        .map((y) => (typeof y === "number" ? y : parseInt(String(y), 10)))
        .filter((y) => typeof y === "number" && !isNaN(y) && y <= maxYear && y >= minYear)
    )
  ).sort((a, b) => b - a);

  if (valid.length === 0) {
    const fallback: number[] = [];
    for (let y = maxYear; y >= 2000; y--) {
      fallback.push(y);
    }
    return fallback;
  }
  return valid;
}

function getFallbackGenres() {
  return [
    { slug: "hanh-dong", name: "Hành Động" },
    { slug: "tinh-cam", name: "Tình Cảm" },
    { slug: "hai-huoc", name: "Hài Hước" },
    { slug: "co-trang", name: "Cổ Trang" },
    { slug: "tam-ly", name: "Tâm Lý" },
    { slug: "hinh-su", name: "Hình Sự" },
    { slug: "chien-tranh", name: "Chiến Tranh" },
    { slug: "the-thao", name: "Thể Thao" },
    { slug: "vo-thuat", name: "Võ Thuật" },
    { slug: "vien-tuong", name: "Viễn Tưởng" },
    { slug: "phieu-luu", name: "Phiêu Lưu" },
    { slug: "khoa-hoc", name: "Khoa Học" },
    { slug: "kinh-di", name: "Kinh Dị" },
    { slug: "am-nhac", name: "Âm Nhạc" },
    { slug: "than-thoai", name: "Thần Thoại" },
    { slug: "tai-lieu", name: "Tài Liệu" },
    { slug: "gia-dinh", name: "Gia Đình" },
    { slug: "chinh-kich", name: "Chính Kịch" },
    { slug: "bi-an", name: "Bí Ẩn" },
    { slug: "hoc-duong", name: "Học Đường" },
    { slug: "kinh-dien", name: "Kinh Điển" },
  ];
}

function getFallbackCountries() {
  return [
    { slug: "trung-quoc", name: "Trung Quốc" },
    { slug: "han-quoc", name: "Hàn Quốc" },
    { slug: "nhat-ban", name: "Nhật Bản" },
    { slug: "au-my", name: "Âu Mỹ" },
    { slug: "thai-lan", name: "Thái Lan" },
    { slug: "viet-nam", name: "Việt Nam" },
    { slug: "hong-kong", name: "Hồng Kông" },
    { slug: "dai-loan", name: "Đài Loan" },
    { slug: "an-do", name: "Ấn Độ" },
    { slug: "anh", name: "Anh" },
    { slug: "phap", name: "Pháp" },
    { slug: "canada", name: "Canada" },
    { slug: "duc", name: "Đức" },
    { slug: "tay-ban-nha", name: "Tây Ban Nha" },
    { slug: "nga", name: "Nga" },
    { slug: "uc", name: "Úc" },
  ];
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
  const rawYears = (yearsData?.data?.items || []).map((y: any) => y.slug || y.name);
  const years = sanitizeYears(rawYears);

  return {
    provider: "vsmov",
    store: "Bình Minh",
    description: "Khoảnh khắc mặt trời vừa ló - Dịu dàng, thơ, ấm áp",

    categories: [
      { id: "latest", name: "✨ Mới cập nhật", slug: "latest", emoji: "🆕", count: "18K+" },
      { id: "single", name: "🎬 Phim lẻ", slug: "single", emoji: "🎥", path: "danh-sach/phim-le" },
      { id: "series", name: "📺 Phim bộ", slug: "series", emoji: "📺", path: "danh-sach/phim-bo" },
      { id: "animation", name: "🎨 Hoạt hình", slug: "animation", emoji: "🎨", path: "the-loai/hoat-hinh" },
      { id: "tvshow", name: "📡 TV Shows", slug: "tvshow", emoji: "📡", path: "danh-sach/tv-shows" },
    ],

    genres: genres.length > 0 ? genres : getFallbackGenres(),
    genresCount: genres.length || getFallbackGenres().length,

    countries: countries.length > 0 ? countries : getFallbackCountries(),
    countriesCount: countries.length || getFallbackCountries().length,

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

    specialFilters: {
      topViewed: { name: "👁️ Xem nhiều nhất", path: "danh-sach/phim-hot" },
      netflix: { name: "📺 Phim Netflix", path: "the-loai/netflix" },
      disney: { name: "⭐ Disney+", path: "the-loai/disney" },
    },
  };
}

// ============================================
// OPhim (Ban Mai) - FULL TAXONOMY WITH KKPHIM FALLBACK
// ============================================
async function getOphimExplore() {
  const [genresData, countriesData, yearsData] = await Promise.all([
    fetchJson("https://ophim1.com/v1/api/the-loai"),
    fetchJson("https://ophim1.com/v1/api/quoc-gia"),
    fetchJson("https://ophim1.com/nam-phat-hanh"),
  ]);

  let genres = (genresData?.data?.items || []).map((g: any) => ({ slug: g.slug, name: g.name }));
  let countries = (countriesData?.data?.items || []).map((c: any) => ({ slug: c.slug, name: c.name }));
  let yearsRaw = (yearsData?.data?.items || []).map((y: any) => y.year || y.name || y.slug);

  if (genres.length === 0 || countries.length === 0) {
    const [kkGenres, kkCountries, kkYears] = await Promise.all([
      fetchJson("https://phimapi.com/the-loai"),
      fetchJson("https://phimapi.com/quoc-gia"),
      fetchJson("https://phimapi.com/nam-phat-hanh"),
    ]);
    if (genres.length === 0) {
      genres = (kkGenres?.data?.items || []).map((g: any) => ({ slug: g.slug, name: g.name }));
    }
    if (countries.length === 0) {
      countries = (kkCountries?.data?.items || []).map((c: any) => ({ slug: c.slug, name: c.name }));
    }
    if (yearsRaw.length === 0) {
      yearsRaw = (kkYears?.data?.items || []).map((y: any) => y.year || y.name || y.slug);
    }
  }

  const years = sanitizeYears(yearsRaw);

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

    genres: genres.length > 0 ? genres : getFallbackGenres(),
    genresCount: genres.length || getFallbackGenres().length,

    countries: countries.length > 0 ? countries : getFallbackCountries(),
    countriesCount: countries.length || getFallbackCountries().length,

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
// NguonC (Hoàng Hôn)
// ============================================
async function getNguoncExplore() {
  const [categoriesData, countriesData] = await Promise.all([
    fetchJson("https://phim.nguonc.com/api/the-loai"),
    fetchJson("https://phim.nguonc.com/api/quoc-gia"),
  ]);

  let genres = (categoriesData?.items || []).map((g: any) => ({ slug: g.slug, name: g.name }));
  let countries = (countriesData?.items || []).map((c: any) => ({ slug: c.slug, name: c.name }));

  if (genres.length === 0) genres = getFallbackGenres();
  if (countries.length === 0) countries = getFallbackCountries();

  const years = sanitizeYears([]);

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

    years,
    yearsCount: years.length,

    filters: {
      hasGenres: true,
      hasCountries: true,
      hasYears: true,
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
  const rawYears = (yearsData?.data?.items || []).map((y: any) => y.year || y.name || y.slug);
  const years = sanitizeYears(rawYears);

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

    genres: genres.length > 0 ? genres : getFallbackGenres(),
    genresCount: genres.length || getFallbackGenres().length,

    countries: countries.length > 0 ? countries : getFallbackCountries(),
    countriesCount: countries.length || getFallbackCountries().length,

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
        result = await getKkphimExplore();
        break;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(`[API] Explore ${storeId} error:`, error);
    return NextResponse.json(await getKkphimExplore());
  }
}
