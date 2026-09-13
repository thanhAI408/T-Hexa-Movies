export interface YoutubeVideo {
  id: string; title: string; description: string; thumbnail: string;
  channelId: string; channelTitle: string; publishedAt: string;
  categoryId?: string; views?: string; duration?: string; channelThumbnail?: string;
  defaultAudioLanguage?: string; defaultLanguage?: string;
}
export interface YoutubeResult {
  items: YoutubeVideo[]; nextPageToken?: string;
  channel?: { title: string; description: string; thumbnail: string; subscribers?: string; banner?: string; videoCount?: string; customUrl?: string };
  comments?: { id: string; author: string; text: string; likes: number }[];
}
export function youtubeId(input: string): string | null {
  if (/^[\w-]{11}$/.test(input)) return input;
  try {
    const url = new URL(input);
    if (!['https:', 'http:'].includes(url.protocol)) return null;
    const host = url.hostname.replace(/^www\.|^m\./, '');
    const id = host === 'youtu.be' ? url.pathname.slice(1) : ['youtube.com', 'youtube-nocookie.com'].includes(host) ? url.searchParams.get('v') || /^\/(?:shorts|embed|live)\/([\w-]+)/.exec(url.pathname)?.[1] : null;
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}
