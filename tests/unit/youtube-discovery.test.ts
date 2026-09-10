import { describe, expect, it } from 'vitest';
import { discoveryBatch } from '@/lib/youtube/discovery';
import type { YoutubeVideo } from '@/lib/youtube/types';
const videos = Array.from({ length: 50 }, (_, index) => ({ id: String(index) } as YoutubeVideo));
describe('discovery rotation', () => {
  it('selects different videos on the next refresh and preserves the remainder', () => {
    const first = discoveryBatch(videos, [], () => .5);
    const second = discoveryBatch(videos, first.items.map(video => video.id), () => .5);
    expect(second.items).toHaveLength(24);
    expect(second.items.every(video => !first.items.some(old => old.id === video.id))).toBe(true);
    expect(new Set([...second.items, ...second.pending].map(video => video.id)).size).toBe(50);
    expect(videos[0].id).toBe('0');
  });
  it('deduplicates and handles small or empty catalogs', () => {
    expect(discoveryBatch([], []).items).toEqual([]);
    expect(discoveryBatch([videos[0], videos[0]], ['0']).items).toHaveLength(1);
    expect(discoveryBatch(videos.slice(0, 2), ['0', '1'], () => .99).items[0].id).toBe('1');
  });
});
