import { z } from "zod";
import { searchStoreCatalog } from "@/lib/stores/discover";
import { STORE_API_MAP, STORES } from "@/lib/stores/config";
import { movieReference } from "@/lib/stores/movie-reference";
import type { StoreSearchGroup } from "@/types/global-search";

const stores = ["binh-minh", "ban-mai", "hoang-hon", "da-nguyet"] as const;
const schema = z.object({
  q: z.string().trim().min(1).max(150),
  store: z.enum(stores).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(24),
});
export async function GET(request: Request) {
  const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return Response.json({ error: "Từ khóa hoặc trang tìm kiếm không hợp lệ." }, { status: 400 });
  const { q, store, page, limit } = parsed.data;
  const groups = await Promise.all((store ? [store] : stores).map(async (storeId): Promise<StoreSearchGroup> => {
    const common = { storeId, storeName: STORES[storeId].name, provider: STORE_API_MAP[storeId] };
    try {
      const result = await searchStoreCatalog(storeId, q, page, limit);
      const items = result.items.filter(movie => movie.provider === common.provider).map(movie => ({
        id: movieReference(movie.provider, movie.providerSlug), title: movie.title,
        originalTitle: movie.originalTitle, year: movie.year, posterUrl: movie.posterUrl, quality: movie.quality,
        storeId, storeName: common.storeName,
        href: `/stores/${storeId}/movie/${encodeURIComponent(movieReference(movie.provider, movie.providerSlug))}`,
      }));
      return { ...common, status: "available", items: items.filter((item, index) => items.findIndex(other => other.id === item.id) === index), pagination: result.pagination };
    } catch {
      return { ...common, status: "unavailable", items: [], pagination: null };
    }
  }));
  const allFailed = groups.every(group => group.status === "unavailable");
  return Response.json({ query: q, groups, partial: groups.some(group => group.status === "unavailable") }, {
    status: allFailed ? 503 : 200,
    headers: { "Cache-Control": allFailed ? "no-store" : "public, s-maxage=30, stale-while-revalidate=30" },
  });
}
