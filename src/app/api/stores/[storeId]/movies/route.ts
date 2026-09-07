import { NextRequest, NextResponse } from "next/server";
import { GET as discover } from "../discover/route";

// Hero and catalog must share filtering, fallback and source identity rules.
export async function GET(request: NextRequest, context: { params: Promise<{ storeId: string }> }) {
  const response = await discover(request, context);
  if (!response.ok || request.nextUrl.searchParams.get("groupByYear") !== "true") return response;
  const result = await response.json();
  const groupedByYear: Record<string, unknown[]> = {};
  for (const movie of result.items) {
    const year = movie.year ? String(movie.year) : "Không rõ";
    (groupedByYear[year] ??= []).push(movie);
  }
  return NextResponse.json({ ...result, groupedByYear });
}
