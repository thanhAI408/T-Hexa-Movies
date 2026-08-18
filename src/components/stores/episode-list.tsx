"use client";

import Link from "next/link";
import { useState } from "react";
import { Play, ChevronDown, ChevronUp, Film, Server } from "lucide-react";
import type { StoreConfig } from "@/lib/stores/config";
import type { ProviderEpisodeInput } from "@/types/catalog";

interface EpisodeListProps {
  store: StoreConfig;
  movieSlug: string;
  episodes: ProviderEpisodeInput[];
}

// Group episodes by server
function groupByServer(episodes: ProviderEpisodeInput[]): Map<string, ProviderEpisodeInput[]> {
  const groups = new Map<string, ProviderEpisodeInput[]>();

  episodes.forEach((episode) => {
    const serverName = episode.serverName || "Server mặc định";
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

export function EpisodeList({ store, movieSlug, episodes }: EpisodeListProps) {
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set(["default"]));
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const serverGroups = groupByServer(episodes);
  const servers = Array.from(serverGroups.entries());

  const toggleServer = (serverName: string) => {
    const newExpanded = new Set(expandedServers);
    if (newExpanded.has(serverName)) {
      newExpanded.delete(serverName);
    } else {
      newExpanded.add(serverName);
    }
    setExpandedServers(newExpanded);
  };

  // Expand all / Collapse all
  const expandAll = () => {
    setExpandedServers(new Set(serverGroups.keys()));
  };

  const collapseAll = () => {
    setExpandedServers(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl border p-1" style={{ borderColor: `${store.theme.primary}30` }}>
            <button
              onClick={() => setViewMode("grid")}
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-300"
              style={{
                background: viewMode === "grid" ? store.theme.primary : "transparent",
                color: viewMode === "grid" ? "#fff" : store.theme.muted,
              }}
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
                <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3z"/>
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-300"
              style={{
                background: viewMode === "list" ? store.theme.primary : "transparent",
                color: viewMode === "list" ? "#fff" : store.theme.muted,
              }}
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
              </svg>
            </button>
          </div>

          <p className="text-sm font-medium" style={{ color: store.theme.muted }}>
            {episodes.length} tập
          </p>
        </div>

        {/* Expand/Collapse All */}
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-300 hover:scale-105"
            style={{
              background: `${store.theme.primary}10`,
              color: store.theme.primary,
            }}
          >
            Mở rộng tất cả
          </button>
          <button
            onClick={collapseAll}
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-300 hover:scale-105"
            style={{
              background: `${store.theme.surface}50`,
              color: store.theme.muted,
            }}
          >
            Thu gọn
          </button>
        </div>
      </div>

      {/* Servers */}
      {servers.map(([serverName, serverEpisodes], serverIndex) => {
        const sortedEpisodes = sortEpisodes(serverEpisodes);
        const isExpanded = expandedServers.has(serverName);

        return (
          <div
            key={serverName}
            className="overflow-hidden rounded-2xl border transition-all duration-300"
            style={{
              borderColor: isExpanded ? store.theme.primary : `${store.theme.primary}20`,
              background: `${store.theme.surface}30`,
            }}
          >
            {/* Server Header */}
            <button
              onClick={() => toggleServer(serverName)}
              className="flex w-full items-center justify-between p-4 transition-all duration-300 hover:bg-white/5"
            >
              <div className="flex items-center gap-4">
                {/* Server Icon */}
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${store.theme.primary}20, ${store.theme.glow}20)`,
                    color: store.theme.primary,
                  }}
                >
                  <Server size={20} />
                </div>

                <div className="text-left">
                  <p className="text-base font-semibold" style={{ color: store.theme.text }}>
                    {serverName}
                  </p>
                  <p className="text-sm" style={{ color: store.theme.muted }}>
                    {serverEpisodes.length} tập
                  </p>
                </div>
              </div>

              {/* Episode count badge */}
              <div className="flex items-center gap-3">
                <span
                  className="rounded-lg px-3 py-1.5 text-sm font-semibold"
                  style={{
                    background: `${store.theme.primary}15`,
                    color: store.theme.primary,
                  }}
                >
                  {serverEpisodes.length} tập
                </span>

                {/* Expand/Collapse Icon */}
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300"
                  style={{
                    background: isExpanded ? store.theme.primary : `${store.theme.primary}20`,
                    color: isExpanded ? "#fff" : store.theme.primary,
                  }}
                >
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>
            </button>

            {/* Episodes */}
            <div
              className="overflow-hidden transition-all duration-500"
              style={{
                maxHeight: isExpanded ? "2000px" : "0",
                opacity: isExpanded ? 1 : 0,
              }}
            >
              <div className="border-t p-4" style={{ borderColor: `${store.theme.primary}20` }}>
                {viewMode === "grid" ? (
                  // Grid View
                  <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
                    {sortedEpisodes.map((episode, index) => {
                      const episodeNumber = episode.episodeNumber ?? index + 1;
                      const episodeLabel = episode.episodeLabel || `Tập ${episodeNumber}`;

                      return (
                        <Link
                          key={`${serverName}-${episode.episodeKey}`}
                          href={`/stores/${store.slug}/watch/${movieSlug}?episode=${encodeURIComponent(episode.episodeKey)}`}
                          className="group flex flex-col items-center justify-center rounded-xl border p-3 transition-all duration-300 hover:scale-105 hover:border-transparent"
                          style={{
                            borderColor: `${store.theme.primary}30`,
                            background: `${store.theme.surface}50`,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = store.theme.primary;
                            e.currentTarget.style.borderColor = store.theme.primary;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = `${store.theme.surface}50`;
                            e.currentTarget.style.borderColor = `${store.theme.primary}30`;
                          }}
                        >
                          <div
                            className="flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300"
                            style={{
                              background: `${store.theme.primary}20`,
                              color: store.theme.primary,
                            }}
                          >
                            <Play size={18} fill="currentColor" />
                          </div>
                          <span
                            className="mt-2 text-xs font-semibold"
                            style={{ color: store.theme.text }}
                          >
                            {episodeLabel}
                          </span>
                          {episode.quality && (
                            <span
                              className="mt-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                              style={{
                                background: `${store.theme.primary}30`,
                                color: store.theme.primary,
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
                  // List View
                  <div className="rounded-xl border overflow-hidden" style={{ borderColor: `${store.theme.primary}20` }}>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b" style={{ borderColor: `${store.theme.primary}20`, background: `${store.theme.surface}50` }}>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: store.theme.muted }}>#</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: store.theme.muted }}>Tập</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: store.theme.muted }}>Tiêu đề</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: store.theme.muted }}>Chất lượng</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase" style={{ color: store.theme.muted }}>Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedEpisodes.map((episode, index) => {
                          const episodeNumber = episode.episodeNumber ?? index + 1;
                          const episodeLabel = episode.episodeLabel || `Tập ${episodeNumber}`;

                          return (
                            <tr
                              key={`${serverName}-${episode.episodeKey}`}
                              className="border-b transition-colors duration-200 hover:bg-white/5"
                              style={{ borderColor: `${store.theme.primary}10` }}
                            >
                              <td className="px-4 py-3 text-sm" style={{ color: store.theme.muted }}>{index + 1}</td>
                              <td className="px-4 py-3 text-sm font-semibold" style={{ color: store.theme.text }}>{episodeLabel}</td>
                              <td className="px-4 py-3 text-sm" style={{ color: store.theme.muted }}>{episode.episodeTitle || "-"}</td>
                              <td className="px-4 py-3">
                                {episode.quality ? (
                                  <span
                                    className="rounded px-2 py-1 text-xs font-bold uppercase"
                                    style={{
                                      background: `${store.theme.primary}20`,
                                      color: store.theme.primary,
                                    }}
                                  >
                                    {episode.quality}
                                  </span>
                                ) : "-"}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Link
                                  href={`/stores/${store.slug}/watch/${movieSlug}?episode=${encodeURIComponent(episode.episodeKey)}`}
                                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:scale-105"
                                  style={{
                                    background: store.theme.primary,
                                    color: "#fff",
                                  }}
                                >
                                  <Play size={12} fill="currentColor" />
                                  Xem
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
