import { NextRequest, NextResponse } from "next/server";

import { getMovieBySlug } from "@/lib/catalog/repository";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  }

  try {
    const movie = await getMovieBySlug(slug);

    if (!movie) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    return NextResponse.json(movie);
  } catch (error) {
    console.error("[API/movie] Error:", error);
    return NextResponse.json({ error: "Failed to fetch movie" }, { status: 500 });
  }
}
