import { z } from 'zod';
import type { YoutubeResult, YoutubeVideo } from '@/lib/youtube/types';

const schema = z.object({
  mode: z.enum(['popular', 'search', 'video', 'channel', 'comments']).default('popular'),
  q: z.string().trim().max(150).default(''),
  id: z.string().regex(/^[\w-]{11}$/).optional(),
  channel: z.string().regex(/^UC[\w-]{22}$/).optional(),
  page: z.string().regex(/^[\w=-]{1,300}$/).optional(),
  category: z.enum(['0', '10', '20', '22', '24', '25', '27', '28']).default('0'),
  order: z.enum(['relevance', 'date', 'viewCount']).default('relevance'),
});
const snippet = z.object({
  title: z.string().default(''), description: z.string().default(''), channelId: z.string().default(''),
  channelTitle: z.string().default(''), publishedAt: z.string().default(''),
  thumbnails: z.record(z.string(), z.object({ url: z.string() })).default({}),
});
const row = z.object({ id: z.union([z.string(), z.object({ videoId: z.string().optional() })]), snippet,
  statistics: z.object({ viewCount: z.string().optional(), subscriberCount: z.string().optional() }).optional(),
  contentDetails: z.object({ duration: z.string().optional() }).optional(),
});
const list = z.object({ items: z.array(row), nextPageToken: z.string().optional() });
class UpstreamError extends Error { constructor(public status: number) { super('YouTube request failed'); } }
function thumbnail(s: z.infer<typeof snippet>) { return s.thumbnails.high?.url || s.thumbnails.medium?.url || s.thumbnails.default?.url || ''; }
function normalize(item: z.infer<typeof row>): YoutubeVideo {
  return { id: typeof item.id === 'string' ? item.id : item.id.videoId || '', ...item.snippet,
    thumbnail: thumbnail(item.snippet), views: item.statistics?.viewCount, duration: item.contentDetails?.duration };
}
export async function GET(request: Request) {
  const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return Response.json({ error: 'Yêu cầu YouTube không hợp lệ.' }, { status: 400 });
  const p = parsed.data;
  if ((['video', 'comments'].includes(p.mode) && !p.id) || (p.mode === 'channel' && !p.channel) || (p.mode === 'search' && !p.q))
    return Response.json({ error: 'Thiếu từ khóa hoặc mã video/kênh.' }, { status: 400 });
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return Response.json({ error: 'Danh mục YouTube chưa được kết nối. Bạn vẫn có thể dán liên kết YouTube vào ô tìm kiếm để xem video.', code: 'NOT_CONFIGURED' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  async function api(endpoint: string, params: Record<string, string>) {
    const query = new URLSearchParams({ ...params, key: key! });
    const response = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${query}`, { signal: AbortSignal.timeout(8000), next: { revalidate: 300 } });
    if (!response.ok) throw new UpstreamError(response.status);
    return response.json();
  }
  try {
    const page: Record<string, string> = p.page ? { pageToken: p.page } : {};
    let result: YoutubeResult;
    if (p.mode === 'comments') {
      const data = z.object({ nextPageToken: z.string().optional(), items: z.array(z.object({ id: z.string(), snippet: z.object({ topLevelComment: z.object({ snippet: z.object({ authorDisplayName: z.string(), textDisplay: z.string(), likeCount: z.number() }) }) }) })) }).parse(await api('commentThreads', { part: 'snippet', videoId: p.id!, maxResults: '20', textFormat: 'plainText', ...page }));
      result = { items: [], nextPageToken: data.nextPageToken, comments: data.items.map(item => ({ id: item.id, author: item.snippet.topLevelComment.snippet.authorDisplayName, text: item.snippet.topLevelComment.snippet.textDisplay, likes: item.snippet.topLevelComment.snippet.likeCount })) };
    } else if (p.mode === 'video') {
      const data = list.parse(await api('videos', { part: 'snippet,statistics,contentDetails', id: p.id! }));
      result = { items: data.items.map(normalize) };
    } else if (p.mode === 'popular') {
      const data = list.parse(await api('videos', { part: 'snippet,statistics,contentDetails', chart: 'mostPopular', regionCode: 'VN', maxResults: '24', ...(p.category !== '0' ? { videoCategoryId: p.category } : {}), ...page }));
      result = { items: data.items.map(normalize), nextPageToken: data.nextPageToken };
    } else {
      const data = list.parse(await api('search', { part: 'snippet', type: 'video', maxResults: '24', videoEmbeddable: 'true', videoSyndicated: 'true', ...(p.mode === 'channel' ? { channelId: p.channel!, order: 'date' } : { q: p.q, order: p.order, relevanceLanguage: 'vi' }), ...page }));
      result = { items: data.items.map(normalize).filter(video => /^[\w-]{11}$/.test(video.id)), nextPageToken: data.nextPageToken };
      if (p.mode === 'channel' && !p.page) {
        const channel = list.parse(await api('channels', { part: 'snippet,statistics', id: p.channel! })).items[0];
        if (channel) result.channel = { title: channel.snippet.title, description: channel.snippet.description, thumbnail: thumbnail(channel.snippet), subscribers: channel.statistics?.subscriberCount };
      }
    }
    return Response.json(result, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } });
  } catch (error) {
    const unavailable = error instanceof UpstreamError && error.status === 403;
    return Response.json({ error: p.mode === 'comments' ? 'Không thể tải bình luận. Video có thể đã tắt bình luận.' : unavailable ? 'YouTube đang giới hạn truy cập hoặc cấu hình API chưa hợp lệ. Vui lòng thử lại sau.' : 'Chưa thể kết nối YouTube. Vui lòng thử lại.', code: 'UPSTREAM_UNAVAILABLE' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
