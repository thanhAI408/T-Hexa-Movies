import { NextRequest, NextResponse } from "next/server";

import { listMovies } from "@/lib/catalog/repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const limit = Math.min(60, Math.max(1, parseInt(searchParams.get("limit") ?? "6", 10)));
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10));

  if (!query.trim()) {
    return NextResponse.json({ items: [], total: 0 });
  }

  try {
    const result = await listMovies({ query, limit, offset });

    const items = result.items.map((movie) => ({
      id: movie.id,
      slug: movie.slug,
      title: movie.title,
      originalTitle: movie.originalTitle,
      posterUrl: movie.posterUrl,
      year: movie.year,
      type: movie.type,
      quality: movie.quality,
    }));

    return NextResponse.json({ items, total: result.total });
  } catch (error) {
    console.error("[API/search] Error:", error);
    return NextResponse.json(
      { error: "Search failed", items: [], total: 0 },
      { status: 500 },
    );
  }
}
