import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/youtube/route';
import { youtubeId } from '@/lib/youtube/types';
const item = { id: 'dQw4w9WgXcQ', snippet: { title: 'Video thật', channelTitle: 'Kênh', channelId: 'UCabcdefghijklmnopqrstuv', thumbnails: { high: { url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' } } } };
afterEach(() => vi.unstubAllEnvs());
describe('YouTube integration', () => {
  it('accepts supported video URLs and rejects lookalike domains and scripts', () => {
    expect(youtubeId('https://youtu.be/dQw4w9WgXcQ?t=4')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(youtubeId('javascript:alert(1)')).toBeNull();
  });
  it('reports missing configuration honestly', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', '');
    const response = await GET(new Request('https://local/api/youtube'));
    expect(response.status).toBe(503); expect((await response.json()).code).toBe('NOT_CONFIGURED');
  });
  it('keeps API keys server-side and preserves pagination and source metadata', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', 'private-test-key');
    const fetch = vi.fn().mockResolvedValue(Response.json({ items: [item], nextPageToken: 'nextToken' })); vi.stubGlobal('fetch', fetch);
    const response = await GET(new Request('https://local/api/youtube?mode=search&q=music&page=page2&order=date'));
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.hostname).toBe('www.googleapis.com'); expect(url.searchParams.get('videoEmbeddable')).toBe('true');
    expect(url.searchParams.get('pageToken')).toBe('page2'); expect(url.searchParams.get('order')).toBe('date');
    const text = await response.text(); expect(text).not.toContain('private-test-key');
    expect(JSON.parse(text)).toMatchObject({ nextPageToken: 'nextToken', items: [{ id: item.id, title: 'Video thật' }] });
  });
  it('never returns upstream credential-bearing errors', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', 'private-test-key'); vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('URL?key=private-test-key')));
    const response = await GET(new Request('https://local/api/youtube')); expect(response.status).toBe(503); expect(await response.text()).not.toContain('private-test-key');
  });
  it.each(['mode=video', 'mode=search', 'mode=channel&channel=bad', 'id=../../foo', 'category=bad', 'mode=other'])('validates %s before calling upstream', async query => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    expect((await GET(new Request(`https://local/api/youtube?${query}`))).status).toBe(400); expect(fetch).not.toHaveBeenCalled();
  });
  it('keeps comment text as data without rendering HTML', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', 'private-test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ items: [{ id: 'comment1', snippet: { topLevelComment: { snippet: { authorDisplayName: 'A', textDisplay: '<script>alert(1)</script>', likeCount: 2 } } } }] })));
    const response = await GET(new Request('https://local/api/youtube?mode=comments&id=dQw4w9WgXcQ'));
    expect((await response.json()).comments[0]).toEqual({ id: 'comment1', author: 'A', text: '<script>alert(1)</script>', likes: 2 });
  });
});
