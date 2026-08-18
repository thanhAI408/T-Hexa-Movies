"use client";

import { Clock3, Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { PosterImage } from "@/components/movie/poster-image";

export const HISTORY_KEY = "t-hexa-watch-history-v1";

export interface WatchHistoryEntry {
  movieId: string;
  movieSlug: string;
  movieTitle: string;
  posterUrl: string | null;
  episodeKey: string;
  episodeLabel: string;
  currentTime: number;
  duration: number;
  updatedAt: number;
}

export function readWatchHistory(): WatchHistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WatchHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveWatchHistory(entry: WatchHistoryEntry) {
  const next = [
    entry,
    ...readWatchHistory().filter(
      (item) => !(item.movieId === entry.movieId && item.episodeKey === entry.episodeKey),
    ),
  ].slice(0, 24);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("t-hexa-history-updated"));
}

export function ContinueWatching() {
  const [items, setItems] = useState<WatchHistoryEntry[]>([]);

  useEffect(() => {
    const update = () => setItems(readWatchHistory());
    update();
    window.addEventListener("storage", update);
    window.addEventListener("t-hexa-history-updated", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("t-hexa-history-updated", update);
    };
  }, []);

  const visible = items.filter((item) => item.duration > 0 && item.currentTime > 5).slice(0, 8);
  if (!visible.length) return null;

  return (
    <section className="content-auto py-7" aria-labelledby="continue-title">
      <div className="mb-4 flex items-center gap-2">
        <Clock3 size={18} className="text-[#f1b864]" />
        <h2 id="continue-title" className="text-xl font-bold text-white sm:text-2xl">
          Tiếp tục xem
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((item) => {
          const progress = Math.min(100, Math.max(0, (item.currentTime / item.duration) * 100));
          return (
            <Link
              key={`${item.movieId}:${item.episodeKey}`}
              href={`/xem/${item.movieSlug}/${encodeURIComponent(item.episodeKey)}`}
              className="group flex min-w-0 gap-3 rounded-2xl border border-white/8 bg-white/[0.035] p-2.5 transition hover:border-white/16 hover:bg-white/[0.06]"
            >
              <PosterImage
                src={item.posterUrl}
                alt=""
                sizes="64px"
                className="h-[86px] w-[60px] shrink-0 rounded-xl"
              />
              <span className="flex min-w-0 flex-1 flex-col justify-center">
                <span className="truncate text-sm font-semibold text-white">{item.movieTitle}</span>
                <span className="mt-1 text-xs text-[#8e99aa]">{item.episodeLabel}</span>
                <span className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                  <span
                    className="block h-full rounded-full bg-[#cf3543]"
                    style={{ width: `${progress}%` }}
                  />
                </span>
                <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-[#f0b969]">
                  <Play size={10} fill="currentColor" /> {Math.round(progress)}%
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
