import { NextRequest, NextResponse } from "next/server";
import { resolveStoreProvider } from "@/lib/stores/discover";
import { STORES } from "@/lib/stores/config";
import { kkphimProvider } from "@/providers/kkphim";

export async function GET(_request: NextRequest, context: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await context.params;
  const provider = resolveStoreProvider(storeId);
  if (!provider) return NextResponse.json({ error: "Kho phim không hợp lệ." }, { status: 400 });
  try {
    // The compound-filter catalog and its taxonomy must use the same slugs.
    const [genres, countries] = await Promise.all([kkphimProvider.getGenres(), kkphimProvider.getCountries()]);
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: currentYear - 1900 + 2 }, (_, index) => currentYear + 1 - index);
    const categories = [
      { id: "latest", slug: "latest", name: "✨ Mới cập nhật", emoji: "🆕" },
      { id: "single", slug: "single", name: "🎬 Phim lẻ", emoji: "🎥" },
      { id: "series", slug: "series", name: "📺 Phim bộ", emoji: "📺" },
      { id: "animation", slug: "animation", name: "🎨 Hoạt hình", emoji: "🎨" },
      { id: "tvshow", slug: "tvshow", name: "📡 TV Shows", emoji: "📡" },
      { id: "cinema", slug: "cinema", name: "🎥 Phim chiếu rạp", emoji: "🎥" },
    ];
    return NextResponse.json({ provider, store: STORES[storeId]?.name || storeId, categories, genres, genresCount: genres.length, countries, countriesCount: countries.length, years, yearsCount: years.length, filters: { hasGenres: true, hasCountries: true, hasYears: true, hasQuality: false, hasSort: true, hasRating: false } }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch {
    return NextResponse.json({ error: "Chưa tải được bộ lọc. Vui lòng thử lại." }, { status: 503 });
  }
}
