import { NextRequest, NextResponse } from "next/server";
import { discoverMovies, discoverQuerySchema, resolveStoreProvider, SearchTooBroadError } from "@/lib/stores/discover";

export async function GET(request: NextRequest, context: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await context.params;
  if (!resolveStoreProvider(storeId)) return NextResponse.json({ error: "Kho phim không hợp lệ." }, { status: 400 });
  const query = discoverQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!query.success) return NextResponse.json({ error: "Bộ lọc hoặc số trang không hợp lệ." }, { status: 400 });
  try {
    return NextResponse.json(await discoverMovies(storeId, query.data));
  } catch (error) {
    if (error instanceof SearchTooBroadError) return NextResponse.json({ error: error.message }, { status: 422 });
    console.error(`[Discover] ${storeId}:`, error instanceof Error ? error.message : "Provider failed");
    return NextResponse.json({ error: "Nguồn phim tạm thời không phản hồi. Vui lòng thử lại." }, { status: 503 });
  }
}
