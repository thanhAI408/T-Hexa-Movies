import { NextRequest, NextResponse } from "next/server";
import { vsmovProvider } from "@/providers/vsmov";
import { ophimProvider } from "@/providers/ophim";
import { nguoncProvider } from "@/providers/nguonc";
import { kkphimProvider } from "@/providers/kkphim";
import { STORE_API_MAP } from "@/lib/stores/config";

const PROVIDER_MAP: Record<string, { getMovie: typeof vsmovProvider.getMovie }> = {
  vsmov: vsmovProvider,
  ophim: ophimProvider,
  nguonc: nguoncProvider,
  kkphim: kkphimProvider,
};

// Valid store slugs (both new and old)
const VALID_STORES = [
  "binh-minh", "ban-mai", "hoang-hon", "da-nguyet",
  "xuan", "ha", "thu", "dong",
  "vsmov", "ophim", "nguonc", "kkphim"
];

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ storeId: string; slug: string }> }
) {
  const { storeId, slug } = await context.params;

  if (!VALID_STORES.includes(storeId)) {
    return NextResponse.json(
      { error: "Invalid store ID" },
      { status: 400 }
    );
  }

  // Get API provider from store config
  const apiId = STORE_API_MAP[storeId] || storeId;
  const provider = PROVIDER_MAP[apiId];

  if (!provider) {
    return NextResponse.json(
      { error: "Store not found" },
      { status: 404 }
    );
  }

  if (!slug || slug.trim() === "") {
    return NextResponse.json(
      { error: "Movie slug is required" },
      { status: 400 }
    );
  }

  try {
    const result = await provider.getMovie(slug);

    if (!result) {
      return NextResponse.json(
        { error: "Movie not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(`[API] Store ${storeId} (${apiId}) movie ${slug} error:`, error);
    return NextResponse.json(
      { error: "Failed to fetch movie details" },
      { status: 500 }
    );
  }
}
