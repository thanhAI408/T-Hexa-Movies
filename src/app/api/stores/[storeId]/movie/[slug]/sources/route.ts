import { z } from "zod";
import { getVietnamesePlaybackBackups } from "@/lib/stores/actions";
import { resolveStoreProvider } from "@/lib/stores/discover";

export const maxDuration = 60;
const querySchema = z.object({ episode: z.string().min(1).max(100), server: z.string().min(1).max(150), season: z.coerce.number().int().min(1).max(1000) });
export async function GET(request: Request, context: { params: Promise<{ storeId: string; slug: string }> }) {
  const { storeId, slug } = await context.params;
  const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!resolveStoreProvider(storeId) || slug.length > 250 || !query.success) return Response.json({ error: "Invalid source request" }, { status: 400 });
  const sources = await getVietnamesePlaybackBackups(storeId, slug, query.data.episode, query.data.server, query.data.season);
  return Response.json({ sources });
}
