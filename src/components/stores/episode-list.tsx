"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { Play, ChevronDown, ChevronUp, Server, Search, CheckCircle2 } from "lucide-react";
import type { StoreConfig } from "@/lib/stores/config";
import type { ProviderEpisodeInput } from "@/types/catalog";

interface EpisodeListProps {
  store: StoreConfig;
  movieSlug: string;
  episodes: ProviderEpisodeInput[];
  currentEpisodeKey?: string;
}

// Group episodes by server
function groupByServer(episodes: ProviderEpisodeInput[]): Map<string, ProviderEpisodeInput[]> {
  const groups = new Map<string, ProviderEpisodeInput[]>();

  episodes.forEach((episode) => {
    const serverName = episode.serverName || "Server VIP";
    const existing = groups.get(serverName) || [];
    existing.push(episode);
    groups.set(serverName, existing);
  });

  return groups;
}

// Sort episodes by number
function sortEpisodes(episodes: ProviderEpisodeInput[]): ProviderEpisodeInput[] {
  return [...episodes].sort((a, b) => {
    const aNum = a.episodeNumber ?? 0;
    const bNum = b.episodeNumber ?? 0;
    return aNum - bNum;
  });
}

const EPISODES_PER_CHUNK = 50;

export function EpisodeList({ store, movieSlug, episodes, currentEpisodeKey }: EpisodeListProps) {
  const serverGroups = useMemo(() => groupByServer(episodes), [episodes]);
  const servers = useMemo(() => Array.from(serverGroups.entries()), [serverGroups]);

  // Default first server expanded
  const [expandedServers, setExpandedServers] = useState<Set<string>>(() => {
    const defaultServer = servers.length > 0 ? servers[0][0] : "Server VIP";
    return new Set([defaultServer]);
  });

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChunkIndex, setSelectedChunkIndex] = useState(0);

  const toggleServer = (serverName: string) => {
    const newExpanded = new Set(expandedServers);
    if (newExpanded.has(serverName)) {
      newExpanded.delete(serverName);
    } else {
      newExpanded.add(serverName);
    }
    setExpandedServers(newExpanded);
  };

  return (
    <div className="space-y-6">
      {/* Header Controls Bar */}
      <div 
        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 backdrop-blur-xl"
        style={{ background: store.theme.surface, borderColor: store.theme.border, boxShadow: store.theme.shadowSm }}
      >
        {/* Left: Search input & Total count */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: store.theme.textMuted }} />
            <input
              type="text"
              placeholder="Tìm số tập (VD: 12)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border pl-9 pr-3 py-2 text-xs font-medium outline-none transition-all focus:border-amber-500"
              style={{
                background: `${store.theme.background}aa`,
                borderColor: store.theme.border,
                color: store.theme.text,
              }}
            />
          </div>

          <span 
            className="rounded-lg px-3 py-1.5 text-xs font-bold"
            style={{ background: store.theme.primaryMuted, color: store.theme.primary }}
          >
            {episodes.length} tập
          </span>
        </div>

        {/* Right: View Mode Toggle & Server controls */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center rounded-xl border p-1" style={{ borderColor: store.theme.border }}>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-all"
              style={{
                background: viewMode === "grid" ? store.theme.gradientAccent : "transparent",
                color: viewMode === "grid" ? "#fff" : store.theme.textMuted,
              }}
              title="Lưới"
            >
              Lưới
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-all"
              style={{
                background: viewMode === "list" ? store.theme.gradientAccent : "transparent",
                color: viewMode === "list" ? "#fff" : store.theme.textMuted,
              }}
              title="Danh sách"
            >
              DS
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setExpandedServers(new Set(serverGroups.keys()))}
              className="rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all hover:scale-105"
              style={{ background: store.theme.surface, borderColor: store.theme.border, color: store.theme.textSecondary }}
            >
              Mở hết
            </button>
            <button
              type="button"
              onClick={() => setExpandedServers(new Set())}
              className="rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all hover:scale-105"
              style={{ background: store.theme.surface, borderColor: store.theme.border, color: store.theme.textSecondary }}
            >
              Thu gọn
            </button>
          </div>
        </div>
      </div>

      {/* Servers Accordion */}
      {servers.map(([serverName, serverEpisodes]) => {
        const sorted = sortEpisodes(serverEpisodes);
        const filtered = searchQuery.trim()
          ? sorted.filter((ep) => {
              const label = (ep.episodeLabel || "").toLowerCase();
              const num = String(ep.episodeNumber || "");
              const q = searchQuery.toLowerCase();
              return label.includes(q) || num.includes(q);
            })
          : sorted;

        // Chunking for long series (> 50 episodes)
        const totalChunks = Math.ceil(filtered.length / EPISODES_PER_CHUNK);
        const currentChunkEpisodes = totalChunks > 1
          ? filtered.slice(selectedChunkIndex * EPISODES_PER_CHUNK, (selectedChunkIndex + 1) * EPISODES_PER_CHUNK)
          : filtered;

        const isExpanded = expandedServers.has(serverName);

        return (
          <div
            key={serverName}
            className="overflow-hidden rounded-3xl border transition-all duration-300 backdrop-blur-xl"
            style={{
              borderColor: isExpanded ? store.theme.border : `${store.theme.border}80`,
              background: `${store.theme.surface}95`,
              boxShadow: isExpanded ? store.theme.shadowMd : "none",
            }}
          >
            {/* Server Header Bar */}
            <button
              type="button"
              onClick={() => toggleServer(serverName)}
              className="flex w-full items-center justify-between p-4 sm:p-5 transition-all hover:bg-white/5 text-left"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl transition-transform duration-300"
                  style={{
                    background: store.theme.gradientAccent,
                    color: "#fff",
                    boxShadow: `0 4px 14px ${store.theme.glow}`,
                  }}
                >
                  <Server size={18} />
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-bold tracking-tight" style={{ color: store.theme.text }}>
                    {serverName}
                  </h3>
                  <p className="text-xs" style={{ color: store.theme.textMuted }}>
                    {serverEpisodes.length} tập phim có sẵn
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className="rounded-full px-3 py-1 text-xs font-bold border"
                  style={{
                    background: store.theme.primaryMuted,
                    borderColor: store.theme.border,
                    color: store.theme.primary,
                  }}
                >
                  {serverEpisodes.length} tập
                </span>

                <div
                  className="flex h-8 w-8 items-center justify-center rounded-xl border transition-transform duration-300"
                  style={{
                    background: store.theme.surface,
                    borderColor: store.theme.border,
                    color: store.theme.text,
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                >
                  <ChevronDown size={16} />
                </div>
              </div>
            </button>

            {/* Server Episode Body */}
            {isExpanded && (
              <div className="border-t p-4 sm:p-6 space-y-4" style={{ borderColor: store.theme.border }}>
                {/* Chunk selector buttons if more than 50 episodes */}
                {totalChunks > 1 && (
                  <div className="flex flex-wrap gap-2 pb-2 border-b" style={{ borderColor: store.theme.border }}>
                    {Array.from({ length: totalChunks }).map((_, idx) => {
                      const start = idx * EPISODES_PER_CHUNK + 1;
                      const end = Math.min((idx + 1) * EPISODES_PER_CHUNK, filtered.length);
                      const isSelected = selectedChunkIndex === idx;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedChunkIndex(idx)}
                          className="rounded-xl px-3 py-1.5 text-xs font-bold transition-all hover:scale-105"
                          style={{
                            background: isSelected ? store.theme.gradientAccent : store.theme.surface,
                            color: isSelected ? "#fff" : store.theme.textSecondary,
                            border: `1px solid ${isSelected ? "transparent" : store.theme.border}`,
                          }}
                        >
                          Tập {start} - {end}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Grid View */}
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2.5">
                    {currentChunkEpisodes.map((episode, idx) => {
                      const episodeNumber = episode.episodeNumber ?? idx + 1;
                      const episodeLabel = episode.episodeLabel || `Tập ${episodeNumber}`;
                      const isCurrent = currentEpisodeKey === episode.episodeKey;

                      return (
                        <Link
                          key={`${serverName}-${episode.episodeKey}`}
                          href={`/stores/${store.slug}/watch/${movieSlug}?episode=${encodeURIComponent(episode.episodeKey)}`}
                          className="group relative flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm"
                          style={{
                            background: isCurrent ? store.theme.gradientAccent : store.theme.surface,
                            borderColor: isCurrent ? "transparent" : store.theme.border,
                            color: isCurrent ? "#fff" : store.theme.text,
                            boxShadow: isCurrent ? `0 8px 24px ${store.theme.glow}` : "none",
                          }}
                        >
                          <div 
                            className="flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110"
                            style={{
                              background: isCurrent ? "rgba(255,255,255,0.25)" : store.theme.primaryMuted,
                              color: isCurrent ? "#fff" : store.theme.primary,
                            }}
                          >
                            {isCurrent ? (
                              <CheckCircle2 size={15} />
                            ) : (
                              <Play size={13} fill="currentColor" className="ml-0.5" />
                            )}
                          </div>
                          <span className="mt-2 text-xs font-bold tracking-tight line-clamp-1">
                            {episodeLabel}
                          </span>
                          {episode.quality && (
                            <span 
                              className="mt-1 rounded px-1.5 py-0.2 text-[9px] font-black uppercase opacity-80"
                              style={{
                                background: isCurrent ? "rgba(255,255,255,0.2)" : store.theme.surface,
                              }}
                            >
                              {episode.quality}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  /* List View */
                  <div className="overflow-hidden rounded-2xl border" style={{ borderColor: store.theme.border }}>
                    <div className="divide-y" style={{ borderColor: store.theme.border }}>
                      {currentChunkEpisodes.map((episode, idx) => {
                        const episodeNumber = episode.episodeNumber ?? idx + 1;
                        const episodeLabel = episode.episodeLabel || `Tập ${episodeNumber}`;
                        const isCurrent = currentEpisodeKey === episode.episodeKey;

                        return (
                          <div
                            key={`${serverName}-${episode.episodeKey}`}
                            className="flex items-center justify-between p-3 sm:px-4 transition-colors hover:bg-white/5"
                            style={{
                              background: isCurrent ? `${store.theme.primary}15` : "transparent",
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono font-bold" style={{ color: store.theme.textMuted }}>
                                #{idx + 1}
                              </span>
                              <div>
                                <p className="text-xs sm:text-sm font-bold" style={{ color: isCurrent ? store.theme.primary : store.theme.text }}>
                                  {episodeLabel}
                                </p>
                                {episode.episodeTitle && (
                                  <p className="text-[11px]" style={{ color: store.theme.textMuted }}>
                                    {episode.episodeTitle}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {episode.quality && (
                                <span 
                                  className="rounded px-2 py-0.5 text-[10px] font-black uppercase"
                                  style={{ background: store.theme.surface, color: store.theme.textSecondary, border: `1px solid ${store.theme.border}` }}
                                >
                                  {episode.quality}
                                </span>
                              )}
                              <Link
                                href={`/stores/${store.slug}/watch/${movieSlug}?episode=${encodeURIComponent(episode.episodeKey)}`}
                                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all hover:scale-105"
                                style={{
                                  background: isCurrent ? store.theme.gradientAccent : store.theme.primaryMuted,
                                  color: isCurrent ? "#fff" : store.theme.primary,
                                }}
                              >
                                <Play size={12} fill="currentColor" />
                                <span>{isCurrent ? "Đang xem" : "Xem"}</span>
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
