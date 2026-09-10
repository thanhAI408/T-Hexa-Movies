import type { YoutubeVideo } from './types';

/** Keep discovery varied without changing ranked search results or upstream cache keys. */
export function discoveryBatch(videos: YoutubeVideo[], previous: string[], random = Math.random) {
  const unique = [...new Map(videos.map(video => [video.id, video])).values()];
  for (let index = unique.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1));
    [unique[index], unique[target]] = [unique[target], unique[index]];
  }
  const seen = new Set(previous);
  const ranked = [...unique.filter(video => !seen.has(video.id)), ...unique.filter(video => seen.has(video.id))];
  // Small catalogs can contain only previously displayed videos. Still change the lead card.
  if (ranked.length > 1 && ranked[0].id === previous[0]) ranked.push(ranked.shift()!);
  return { items: ranked.slice(0, 24), pending: ranked.slice(24) };
}
