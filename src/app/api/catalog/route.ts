import { NextRequest, NextResponse } from "next/server";

import { listMovies, getHomeCatalog } from "@/lib/catalog/repository";
import type { MovieType } from "@/types/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const kind = searchParams.get("kind") ?? "home";
  const query = searchParams.get("q") ?? "";
  const genre = searchParams.get("genre") ?? "";
  const country = searchParams.get("country") ?? "";
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : undefined;
  const type = searchParams.get("type") as MovieType | undefined;
  const cinema = searchParams.has("cinema") ? searchParams.get("cinema") === "true" : undefined;
  const limit = Math.min(60, Math.max(1, parseInt(searchParams.get("limit") ?? "24", 10)));
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10));

  try {
    if (kind === "home") {
      const data = await getHomeCatalog();
      return NextResponse.json(data);
    }

    const result = await listMovies({ query, genre, country, year, type, cinema, limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[API/catalog] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch catalog", items: [], total: 0 },
      { status: 500 },
    );
  }
}
