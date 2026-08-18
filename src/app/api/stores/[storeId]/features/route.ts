import { NextRequest, NextResponse } from "next/server";
import { vsmovProvider } from "@/providers/vsmov";
import { ophimProvider } from "@/providers/ophim";
import { nguoncProvider } from "@/providers/nguonc";
import { kkphimProvider } from "@/providers/kkphim";
import { STORE_API_MAP } from "@/lib/stores/config";

// Provider instances
const PROVIDERS: Record<string, {
  getGenres: () => Promise<any[]>;
  getCountries: () => Promise<any[]>;
  getYears: () => Promise<number[]>;
  getCategories?: () => Promise<any[]>;
}> = {
  vsmov: vsmovProvider,
  ophim: ophimProvider,
  nguonc: nguoncProvider,
  kkphim: kkphimProvider,
};

// Valid store slugs
const VALID_STORES = [
  "binh-minh", "ban-mai", "hoang-hon", "da-nguyet",
  "xuan", "ha", "thu", "dong",
  "vsmov", "ophim", "nguonc", "kkphim"
];

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await context.params;

  if (!VALID_STORES.includes(storeId)) {
    return NextResponse.json(
      { error: "Invalid store ID" },
      { status: 400 }
    );
  }

  const apiId = STORE_API_MAP[storeId] || storeId;
  const provider = PROVIDERS[apiId];

  if (!provider) {
    return NextResponse.json(
      { error: "Store not found" },
      { status: 404 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "all";

    const result: Record<string, any> = {};

    if (type === "all" || type === "genres") {
      result.genres = await provider.getGenres();
    }

    if (type === "all" || type === "countries") {
      result.countries = await provider.getCountries();
    }

    if (type === "all" || type === "years") {
      result.years = await provider.getYears();
    }

    // Provider-specific features
    if (apiId === "ophim" && (type === "all" || type === "categories")) {
      // OPhim có thêm categories
      result.categories = [
        { slug: "phim-moi-cap-nhat", name: "Phim mới cập nhật", id: "latest" },
        { slug: "phim-bo", name: "Phim bộ", id: "series" },
        { slug: "phim-le", name: "Phim lẻ", id: "single" },
        { slug: "hoat-hinh", name: "Hoạt hình", id: "animation" },
        { slug: "tv-shows", name: "TV Shows", id: "tvshow" },
        { slug: "phim-chieu-rap", name: "Phim chiếu rạp", id: "cinema" },
      ];
    }

    if (apiId === "kkphim" && (type === "all" || type === "categories")) {
      // KKPhim có thêm cinema
      result.categories = [
        { slug: "latest", name: "Phim mới cập nhật", id: "latest" },
        { slug: "series", name: "Phim bộ", id: "series" },
        { slug: "single", name: "Phim lẻ", id: "single" },
        { slug: "animation", name: "Hoạt hình", id: "animation" },
        { slug: "tvshow", name: "TV Shows", id: "tvshow" },
        { slug: "cinema", name: "Phim chiếu rạp", id: "cinema" },
      ];
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(`[API] Store features ${storeId} error:`, error);
    return NextResponse.json(
      { error: "Failed to fetch store features" },
      { status: 500 }
    );
  }
}
