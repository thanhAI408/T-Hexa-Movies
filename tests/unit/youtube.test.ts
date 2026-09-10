import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/youtube/route';
import { youtubeId } from '@/lib/youtube/types';
const item = { id: 'dQw4w9WgXcQ', snippet: { title: 'Video thật', channelTitle: 'Kênh', channelId: 'UCabcdefghijklmnopqrstuv', thumbnails: { high: { url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' } } } };
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
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
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(Response.json({ items: [item], nextPageToken: 'nextToken' }))); vi.stubGlobal('fetch', fetch);
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

it('hydrates search in ranked order and sends the duration filter upstream', async () => {
  vi.stubEnv('YOUTUBE_API_KEY', 'private-test-key');
  const second = { ...item, id: 'jNQXAC9IVRw' };
  const fetch = vi.fn(async (input: string) => {
    const url = new URL(input);
    if (url.pathname.endsWith('/search')) return Response.json({ items: [item, second], nextPageToken: 'next' });
    if (url.pathname.endsWith('/channels')) return Response.json({}, { status: 500 });
    return Response.json({ items: [{ ...second, statistics: { viewCount: '10' } }, { ...item, contentDetails: { duration: 'PT25M' } }] });
  });
  vi.stubGlobal('fetch', fetch);
  const response = await GET(new Request('https://local/api/youtube?mode=search&q=music&duration=long'));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.items.map((video: { id: string }) => video.id)).toEqual([item.id, second.id]);
  expect(result.items[0].duration).toBe('PT25M');
  expect(new URL(fetch.mock.calls[0][0]).searchParams.get('videoDuration')).toBe('long');
});
it('loads channel uploads without search and preserves playlist pagination', async () => {
  vi.stubEnv('YOUTUBE_API_KEY', 'private-test-key');
  const fetch = vi.fn(async (input: string) => {
    const url = new URL(input);
    if (url.pathname.endsWith('/channels')) return Response.json({ items: [{ ...item, id: item.snippet.channelId, contentDetails: { relatedPlaylists: { uploads: 'UUabcdefghijklmnopqrstuv' } }, statistics: { subscriberCount: '250', videoCount: '15' }, brandingSettings: { image: { bannerExternalUrl: 'https://yt3.googleusercontent.com/banner' } } }] });
    if (url.pathname.endsWith('/playlistItems')) return Response.json({ items: [{ contentDetails: { videoId: item.id } }], nextPageToken: 'next' });
    return Response.json({ items: [item] });
  });
  vi.stubGlobal('fetch', fetch);
  const result = await (await GET(new Request(`https://local/api/youtube?mode=channel&channel=${item.snippet.channelId}&page=page2`))).json();
  expect(result).toMatchObject({ nextPageToken: 'next', channel: { subscribers: '250', videoCount: '15' }, items: [{ id: item.id }] });
  expect(fetch.mock.calls.some(([url]) => new URL(url).pathname.endsWith('/search'))).toBe(false);
  const playlist = fetch.mock.calls.find(([url]) => new URL(url).pathname.endsWith('/playlistItems'))!;
  expect(new URL(playlist[0]).searchParams.get('pageToken')).toBe('page2');
});
