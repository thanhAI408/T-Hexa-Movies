"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  AlertCircle,
  RotateCcw,
  Sparkles,
  Film,
  Radio,
  Globe,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Server,
  ArrowRightLeft,
} from "lucide-react";
import type { StoreConfig } from "@/lib/stores/config";
import {
  type PlaybackSource,
  buildVidSrcEmbed,
  buildVidLinkEmbed,
} from "@/lib/streaming/fallback";

interface WatchPlayerProps {
  store: StoreConfig;
  movieSlug: string;
  movieTitle: string;
  embedUrl?: string | null;
  streamUrl?: string | null;
  quality?: string | null;
  language?: string | null;
  fallbackSources?: PlaybackSource[];
  tmdbId?: string | null;
  imdbId?: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  movieType?: string | null;
}

export function WatchPlayer({
  store,
  movieSlug,
  movieTitle,
  embedUrl,
  streamUrl,
  quality,
  language,
  fallbackSources = [],
  tmdbId,
  imdbId,
  seasonNumber,
  episodeNumber,
  movieType,
}: WatchPlayerProps) {
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [autoFallbackNotice, setAutoFallbackNotice] = useState<string | null>(null);
  const [failedSources, setFailedSources] = useState<Set<number>>(new Set());

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 1. Build all available playback sources (Primary -> Fallback 1: VidSrc -> Fallback 2: VidLink -> Fallback 3: VN)
  const allSources = useMemo<PlaybackSource[]>(() => {
    if (fallbackSources.length > 0) {
      return fallbackSources;
    }

    const sources: PlaybackSource[] = [];

    // A. Primary Store Source
    if (embedUrl || streamUrl) {
      sources.push({
        id: "primary",
        tier: "primary",
        name: "Nguồn Chính (Gốc)",
        provider: (store.slug as any) || "kkphim",
        serverName: `${store.name} VIP`,
        streamType: streamUrl ? "hls" : "embed",
        embedUrl: embedUrl,
        streamUrl: streamUrl,
        quality: quality || "FHD",
        language: language || "Vietsub",
        badge: "Mặc định",
        description: `Máy chủ phát trực tiếp từ ${store.name}`,
      });
    }

    // B. Fallback 1: VidSrc
    const vidsrcUrl = buildVidSrcEmbed({
      tmdbId,
      imdbId,
      type: movieType,
      seasonNumber,
      episodeNumber,
    });
    if (vidsrcUrl) {
      sources.push({
        id: "vidsrc",
        tier: "vidsrc",
        name: "Fallback 1: VidSrc",
        provider: "vidsrc",
        serverName: "VidSrc VIP (Quốc Tế 1)",
        streamType: "embed",
        embedUrl: vidsrcUrl,
        streamUrl: null,
        quality: "1080p Ultra",
        language: "Quốc tế (Eng/Sub)",
        badge: "Fallback 1",
        description: "Nguồn phát dự phòng quốc tế số 1 qua TMDB/IMDb",
      });
    }

    // C. Fallback 2: VidLink
    const vidlinkUrl = buildVidLinkEmbed({
      tmdbId,
      imdbId,
      type: movieType,
      seasonNumber,
      episodeNumber,
    });
    if (vidlinkUrl) {
      sources.push({
        id: "vidlink",
        tier: "vidlink",
        name: "Fallback 2: VidLink",
        provider: "vidlink",
        serverName: "VidLink VIP (Quốc Tế 2)",
        streamType: "embed",
        embedUrl: vidlinkUrl,
        streamUrl: null,
        quality: "1080p Fast",
        language: "Quốc tế (Eng/Sub)",
        badge: "Fallback 2",
        description: "Nguồn phát dự phòng quốc tế số 2 tốc độ cao",
      });
    }

    return sources;
  }, [
    fallbackSources,
    embedUrl,
    streamUrl,
    quality,
    language,
    store.slug,
    store.name,
    tmdbId,
    imdbId,
    movieType,
    seasonNumber,
    episodeNumber,
  ]);

  // Reset states when input URLs or episode changes
  useEffect(() => {
    setActiveSourceIndex(0);
    setIsLoading(true);
    setHasError(false);
    setAutoFallbackNotice(null);
    setFailedSources(new Set());
  }, [embedUrl, streamUrl, episodeNumber]);

  const currentSource = allSources[activeSourceIndex] || allSources[0];

  // Auto-failover logic to next tier
  const handleSourceError = useCallback(() => {
    setIsLoading(false);
    setFailedSources((prev) => new Set([...prev, activeSourceIndex]));

    // Find next non-failed source index
    const nextIndex = allSources.findIndex(
      (_, idx) => idx > activeSourceIndex && !failedSources.has(idx)
    );

    if (nextIndex !== -1) {
      const nextSource = allSources[nextIndex];
      const prevSource = currentSource;
      setAutoFallbackNotice(
        `⚠️ ${prevSource?.name || "Nguồn hiện tại"} không phản hồi, đã tự động chuyển sang ${nextSource.name}`
      );
      setActiveSourceIndex(nextIndex);
      setIsLoading(true);
      setHasError(false);
    } else {
      // All sources exhausted
      setHasError(true);
    }
  }, [activeSourceIndex, allSources, currentSource, failedSources]);

  // Handle switching source manually
  const switchSource = (index: number) => {
    if (index === activeSourceIndex) return;
    setActiveSourceIndex(index);
    setIsLoading(true);
    setHasError(false);
    setAutoFallbackNotice(null);
  };

  // No sources available at all
  if (!currentSource || (!currentSource.embedUrl && !currentSource.streamUrl)) {
    return (
      <div
        className="relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-3xl border p-8"
        style={{
          background: store.theme.surface,
          borderColor: store.theme.border,
          boxShadow: store.theme.shadowLg,
        }}
      >
        <div
          className="absolute inset-0 opacity-25"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${store.theme.glow} 0%, transparent 60%)`,
          }}
        />

        <div className="relative text-center space-y-3 z-10">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: store.theme.primaryMuted, color: store.theme.primary }}
          >
            <AlertCircle size={32} />
          </div>
          <h3 className="text-lg font-bold" style={{ color: store.theme.text }}>
            Không tìm thấy nguồn phát video
          </h3>
          <p className="text-xs max-w-sm text-slate-400" style={{ color: store.theme.textMuted }}>
            Tập phim này hiện đang được cập nhật hoặc máy chủ tạm thời không phản hồi. Vui lòng chọn tập hoặc máy chủ khác.
          </p>
        </div>
      </div>
    );
  }

  const activeEmbedUrl = currentSource.embedUrl;
  const activeStreamUrl = currentSource.streamUrl;

  const getTierIcon = (tier: PlaybackSource["tier"]) => {
    switch (tier) {
      case "primary":
        return <Zap size={14} className="text-amber-400" />;
      case "vidsrc":
        return <Globe size={14} className="text-sky-400" />;
      case "vidlink":
        return <Radio size={14} className="text-indigo-400" />;
      case "backup_vn":
      default:
        return <ShieldCheck size={14} className="text-emerald-400" />;
    }
  };

  return (
    <div className="relative w-full space-y-4">
      {/* Ambient Theater Backlight Glow */}
      <div
        className="absolute -inset-4 sm:-inset-6 rounded-3xl opacity-35 blur-3xl pointer-events-none transition-all duration-700"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${store.theme.primary} 0%, ${store.theme.secondary} 40%, transparent 80%)`,
        }}
      />

      {/* Auto-Fallback Notification Banner */}
      {autoFallbackNotice && (
        <div
          className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 text-xs font-semibold backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-300"
          style={{
            background: `${store.theme.primary}18`,
            borderColor: store.theme.primary,
            color: store.theme.text,
          }}
        >
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={15} style={{ color: store.theme.primary }} />
            <span>{autoFallbackNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setAutoFallbackNotice(null)}
            className="rounded-lg px-2 py-1 text-[11px] underline opacity-80 hover:opacity-100"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Video Viewport Box */}
      <div
        className="relative aspect-video w-full overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-2xl"
        style={{
          borderColor: store.theme.border,
          boxShadow: `0 20px 60px -15px ${store.theme.glow}, 0 0 1px 1px ${store.theme.border}`,
          background: "#000000",
        }}
      >
        {activeEmbedUrl ? (
          <iframe
            key={`iframe-${currentSource.id}-${activeEmbedUrl}`}
            ref={iframeRef}
            src={activeEmbedUrl}
            className="h-full w-full border-0"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            style={{ background: "#000000" }}
            onLoad={() => setIsLoading(false)}
            onError={handleSourceError}
          />
        ) : activeStreamUrl ? (
          <video
            key={`video-${currentSource.id}-${activeStreamUrl}`}
            ref={videoRef}
            src={activeStreamUrl}
            controls
            autoPlay
            className="h-full w-full"
            style={{ background: "#000000" }}
            playsInline
            onLoadedData={() => setIsLoading(false)}
            onError={handleSourceError}
          >
            <track kind="captions" />
          </video>
        ) : null}

        {/* Anti-watermark overlay */}
        <div
          className="absolute bottom-2 right-2 h-8 w-20 cursor-default pointer-events-auto"
          onClick={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
        />

        {/* Loading overlay */}
        {isLoading && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-md"
            style={{ background: `${store.theme.background}e6` }}
          >
            <div
              className="h-12 w-12 animate-spin rounded-full border-3 border-transparent"
              style={{ borderTopColor: store.theme.primary, borderRightColor: store.theme.accent }}
            />
            <p className="mt-4 text-xs font-bold uppercase tracking-widest" style={{ color: store.theme.text }}>
              Đang kết nối tín hiệu ({currentSource.name})...
            </p>
          </div>
        )}

        {/* Error overlay with multi-tier retry buttons */}
        {hasError && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center backdrop-blur-xl"
            style={{ background: `${store.theme.background}fa` }}
          >
            <div
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: store.theme.primaryMuted, color: store.theme.primary }}
            >
              <AlertCircle size={28} />
            </div>
            <h3 className="text-base font-bold" style={{ color: store.theme.text }}>
              Tín hiệu luồng phát bị gián đoạn
            </h3>
            <p className="mt-1 text-xs max-w-md" style={{ color: store.theme.textMuted }}>
              Máy chủ hiện tại ({currentSource.name}) không phản hồi. Bạn có thể chọn nhanh một trong các máy chủ dự phòng dưới đây:
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              {allSources.map((src, idx) => (
                <button
                  key={src.id}
                  type="button"
                  onClick={() => switchSource(idx)}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all hover:scale-105 shadow-md"
                  style={{
                    background: idx === activeSourceIndex ? store.theme.gradientAccent : store.theme.surface,
                    border: `1px solid ${store.theme.border}`,
                    color: idx === activeSourceIndex ? "#fff" : store.theme.text,
                  }}
                >
                  {getTierIcon(src.tier)}
                  <span>{src.name}</span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setFailedSources(new Set());
                  setHasError(false);
                  setIsLoading(true);
                  window.location.reload();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all hover:scale-105"
                style={{ background: store.theme.surface, borderColor: store.theme.border, color: store.theme.textMuted }}
              >
                <RotateCcw size={13} />
                <span>Tải lại trang</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Multi-Tier Server Selector Bar */}
      <div
        className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border p-3.5 sm:px-5 backdrop-blur-xl"
        style={{ background: store.theme.surface, borderColor: store.theme.border }}
      >
        {/* Server Switcher Pill Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mr-1" style={{ color: store.theme.textMuted }}>
            <Server size={14} style={{ color: store.theme.primary }} />
            <span>Máy chủ phát:</span>
          </div>

          {allSources.map((source, index) => {
            const isActive = index === activeSourceIndex;
            return (
              <button
                key={source.id}
                type="button"
                onClick={() => switchSource(index)}
                className="group relative flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  background: isActive ? store.theme.gradientAccent : store.theme.primaryMuted,
                  color: isActive ? store.theme.textInverse : store.theme.text,
                  border: `1px solid ${isActive ? "transparent" : store.theme.border}`,
                  boxShadow: isActive ? `0 4px 14px ${store.theme.glow}` : "none",
                }}
                title={source.description}
              >
                {getTierIcon(source.tier)}
                <span>{source.name}</span>
                {isActive && <CheckCircle2 size={13} className="ml-0.5" />}
              </button>
            );
          })}
        </div>

        {/* Quality & Language Meta Badges */}
        <div className="flex items-center gap-2 text-xs font-semibold ml-auto">
          {currentSource.quality && (
            <span
              className="rounded-lg px-2.5 py-1 border font-bold uppercase tracking-wider"
              style={{
                background: store.theme.primaryMuted,
                borderColor: store.theme.border,
                color: store.theme.primary,
              }}
            >
              {currentSource.quality}
            </span>
          )}

          {currentSource.language && (
            <span
              className="rounded-lg px-2.5 py-1 border text-[11px]"
              style={{
                background: store.theme.surface,
                borderColor: store.theme.border,
                color: store.theme.textSecondary,
              }}
            >
              {currentSource.language}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
