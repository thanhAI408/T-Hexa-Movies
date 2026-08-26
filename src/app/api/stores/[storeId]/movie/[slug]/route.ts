import { NextRequest, NextResponse } from "next/server";
import { getMovieDetail } from "@/lib/stores/actions";

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

  if (!slug || slug.trim() === "") {
    return NextResponse.json(
      { error: "Movie slug is required" },
      { status: 400 }
    );
  }

  try {
    const result = await getMovieDetail(storeId, slug);

    if (!result) {
      return NextResponse.json(
        { error: "Movie not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(`[API] Store ${storeId} movie ${slug} error:`, error);
    return NextResponse.json(
      { error: "Failed to fetch movie details" },
      { status: 500 }
    );
  }
}
