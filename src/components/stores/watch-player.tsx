"use client";

import Hls from "hls.js";
import { useState, useRef, useEffect, useMemo, useCallback, useEffectEvent } from "react";
import {
  AlertCircle,
  RotateCcw,
  Radio,
  Globe,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Server,
  ArrowRightLeft,
} from "lucide-react";
import { STORE_API_MAP, type StoreConfig } from "@/lib/stores/config";
import { PLAYER_SANDBOX, PLAYER_PERMISSIONS, safePlaybackUrl } from "@/lib/streaming/player-policy";
import type { ProviderId } from "@/types/catalog";
import {
  type PlaybackSource,
  buildVidSrcEmbed,
  buildVidLinkEmbed,
} from "@/lib/streaming/fallback";

const EMPTY_SOURCES: PlaybackSource[] = [];

interface WatchPlayerProps {
  store: StoreConfig;
  movieSlug: string;
  movieTitle: string;
  embedUrl?: string | null;
  streamUrl?: string | null;
  quality?: string | null;
  language?: string | null;
  fallbackSources?: PlaybackSource[];
  backupSourcesUrl?: string;
  tmdbId?: string | null;
  imdbId?: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  movieType?: string | null;
}

export function WatchPlayer(props: WatchPlayerProps) {
  const [directOnly, setDirectOnly] = useState(true);
  return <div className="space-y-3">
    <label className="flex items-start gap-3 rounded-xl border p-3 text-sm" style={{ color: props.store.theme.text, borderColor: props.store.theme.border }}>
      <input type="checkbox" checked={directOnly} onChange={event => setDirectOnly(event.target.checked)} className="mt-1" />
      <span>Chỉ phát trực tiếp
        <span className="block text-xs opacity-75">Chỉ dùng nguồn phát trực tiếp. Bỏ chọn để mở thêm nguồn dự phòng; một số nguồn có thể có quảng cáo.</span>
      </span>
    </label>
    <PlaybackSession key={`${props.movieSlug}:${props.fallbackSources?.[0]?.id}:${props.seasonNumber}:${props.episodeNumber}:${directOnly}`} {...props} directOnly={directOnly} enableEmbedded={() => setDirectOnly(false)} />
  </div>;
}

function PlaybackSession({
  store,
  movieTitle,
  embedUrl,
  streamUrl,
  quality,
  language,
  fallbackSources = EMPTY_SOURCES,
  backupSourcesUrl,
  tmdbId,
  imdbId,
  seasonNumber,
  episodeNumber,
  movieType,
  directOnly,
  enableEmbedded,
}: WatchPlayerProps & { directOnly: boolean; enableEmbedded: () => void }) {
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [autoFallbackNotice, setAutoFallbackNotice] = useState<string | null>(null);
  const failedSources = useRef(new Set<number>());
  const exhaustedSource = useRef<number | null>(null);
  const [vnBackups, setVnBackups] = useState<PlaybackSource[]>([]);
  const [backupsPending, setBackupsPending] = useState(Boolean(backupSourcesUrl));

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 1. Build all available playback sources (Primary -> Fallback 1: VidSrc -> Fallback 2: VidLink -> Fallback 3: VN)
  const baseSources = useMemo<PlaybackSource[]>(() => {
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
        provider: STORE_API_MAP[store.slug] as ProviderId,
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
        name: "Dự phòng 1: Tinh Tú",
        provider: "vidsrc",
        serverName: "Tinh Tú (Quốc tế 1)",
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
        name: "Dự phòng 2: Ngân Hà",
        provider: "vidlink",
        serverName: "Ngân Hà (Quốc tế 2)",
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

  const eligibleSources = useMemo(() => baseSources.flatMap(source => {
    const streamUrl = safePlaybackUrl(source.streamUrl);
    const embedUrl = directOnly ? null : safePlaybackUrl(source.embedUrl);
    if (!streamUrl && !embedUrl) return [];
    return [{ ...source, streamUrl, embedUrl: streamUrl ? null : embedUrl, streamType: streamUrl ? (source.streamType === "mp4" ? "mp4" as const : "hls" as const) : "embed" as const }];
  }), [baseSources, directOnly]);
  const allSources = useMemo(() => [...eligibleSources, ...vnBackups], [eligibleSources, vnBackups]);

  const [showFallbacks, setShowFallbacks] = useState(true);

  useEffect(() => {
    if (!backupSourcesUrl) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 45000);
    fetch(backupSourcesUrl, { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (!data || controller.signal.aborted) return;
        if (!Array.isArray(data.sources)) return;
        const sources: PlaybackSource[] = data.sources.flatMap((source: PlaybackSource) => {
          const streamUrl = safePlaybackUrl(source.streamUrl);
          const embedUrl = directOnly ? null : safePlaybackUrl(source.embedUrl);
          if ((!streamUrl && !embedUrl) || eligibleSources.some(existing => (existing.streamUrl || existing.embedUrl) === (streamUrl || embedUrl))) return [];
          return [{ ...source, streamUrl, embedUrl: streamUrl ? null : embedUrl, streamType: streamUrl ? (source.streamType === "mp4" ? "mp4" as const : "hls" as const) : "embed" as const }];
        });
        setVnBackups(sources);
        // Continue an exhausted chain when the deferred Vietnamese lookup finishes.
        if (sources.length && exhaustedSource.current !== null && eligibleSources.length > exhaustedSource.current) {
          exhaustedSource.current = null;
          setActiveSourceIndex(eligibleSources.length);
          setHasError(false);
          setIsLoading(true);
          setAutoFallbackNotice(`Đã tìm thấy nguồn dự phòng, đang chuyển sang ${sources[0].name}`);
        }
      })
      .catch(() => { /* Optional backups must not interrupt the primary player. */ })
      .finally(() => { window.clearTimeout(timeout); setBackupsPending(false); });
    return () => { controller.abort(); window.clearTimeout(timeout); };
  }, [backupSourcesUrl, eligibleSources, directOnly]);

  const currentSource = allSources[activeSourceIndex] || allSources[0];

  // Auto-failover logic to next tier
  const handleSourceError = useCallback(() => {
    if (failedSources.current.has(activeSourceIndex)) return;
    failedSources.current.add(activeSourceIndex);
    setIsLoading(false);
    setShowFallbacks(true);

    // Find next non-failed source index
    const nextIndex = allSources.findIndex(
      (_, idx) => idx > activeSourceIndex && !failedSources.current.has(idx)
    );

    if (nextIndex !== -1) {
      exhaustedSource.current = null;
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
      exhaustedSource.current = activeSourceIndex;
      setHasError(true);
    }
  }, [activeSourceIndex, allSources, currentSource]);

  // Handle switching source manually
  const switchSource = (index: number) => {
    exhaustedSource.current = null;
    failedSources.current.delete(index);
    setRetryKey(value => value + 1);
    setActiveSourceIndex(index);
    setIsLoading(true);
    setHasError(false);
    setAutoFallbackNotice(null);
  };

  const handleMediaError = useEffectEvent(() => handleSourceError());

  useEffect(() => {
    const video = videoRef.current;
    const url = currentSource?.streamUrl;
    if (!video || !url || currentSource?.streamType === "embed") return;
    // Chromium can report native HLS as "maybe" and still reject a valid
    // playlist with MEDIA_ERR_SRC_NOT_SUPPORTED. Prefer the MSE player when
    // available; reserve native HLS for browsers without Hls.js support.
    if (currentSource?.streamType === "mp4" || (!Hls.isSupported() && video.canPlayType("application/vnd.apple.mpegurl"))) {
      video.src = url;
      return () => { video.removeAttribute("src"); video.load(); };
    }
    if (!Hls.isSupported()) { handleMediaError(); return; }
    const hls = new Hls({ maxBufferLength: 30 });
    hls.on(Hls.Events.ERROR, (_, data) => { if (data.fatal) handleMediaError(); });
    hls.loadSource(url);
    hls.attachMedia(video);
    return () => hls.destroy();
  }, [currentSource, retryKey]);

  useEffect(() => {
    if (!isLoading) return;
    const timer = window.setTimeout(() => {
      setIsLoading(false);
      setShowFallbacks(true);
      setAutoFallbackNotice("Nguồn tải lâu. Bạn có thể bấm phát hoặc chọn máy chủ khác bên dưới.");
    }, 15000);
    return () => window.clearTimeout(timer);
  }, [isLoading, activeSourceIndex, retryKey]);

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
            {directOnly && baseSources.some(source => safePlaybackUrl(source.embedUrl)) ? "Nguồn này dùng trình phát riêng" : backupsPending ? "Đang tìm nguồn phát trực tiếp" : "Không tìm thấy nguồn phát phù hợp"}
          </h3>
          <p className="text-xs max-w-sm text-slate-400" style={{ color: store.theme.textMuted }}>
            {directOnly ? "Chọn nút bên dưới để mở trình phát của nguồn. Một số nguồn có thể có quảng cáo." : "Chưa có nguồn phát cho tập này. Bạn vui lòng chọn tập khác hoặc thử lại sau."}
          </p>
          {directOnly && baseSources.some(source => safePlaybackUrl(source.embedUrl)) && (
            <button type="button" onClick={enableEmbedded} className="rounded-xl px-5 py-3 font-semibold" style={{ background: store.theme.primary, color: store.theme.textInverse }}>
              Phát bằng trình phát của nguồn
            </button>
          )}
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
            key={`iframe-${currentSource.id}-${activeEmbedUrl}-${retryKey}`}
            title={movieTitle}
            ref={iframeRef}
            src={activeEmbedUrl}
            className="h-full w-full border-0"
            allowFullScreen
            sandbox={PLAYER_SANDBOX}
            allow={PLAYER_PERMISSIONS}
            referrerPolicy="origin-when-cross-origin"
            style={{ background: "#000000" }}
            onLoad={() => setIsLoading(false)}
            onErrorCapture={handleSourceError}
          />
        ) : activeStreamUrl ? (
          <video
            key={`video-${currentSource.id}-${activeStreamUrl}-${retryKey}`}
            ref={videoRef}
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

        {/* Loading overlay */}
        {isLoading && (
          <div
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center backdrop-blur-md"
            style={{ background: `${store.theme.background}e6` }}
          >
            <div
              className="h-12 w-12 animate-spin rounded-full border-3 border-transparent"
              style={{ borderTopColor: store.theme.primary, borderRightColor: store.theme.accent }}
            />
            <p className="mt-4 text-xs font-bold uppercase tracking-widest" style={{ color: store.theme.text }}>
              Đang tải video ({currentSource.name})...
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
              Video đang bị gián đoạn
            </h3>
            <p className="mt-1 text-xs max-w-md" style={{ color: store.theme.textMuted }}>
              Chưa thể phát video từ {currentSource.name}. Bạn hãy thử nguồn khác bên dưới hoặc tải lại trang.
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              {directOnly && baseSources.some(source => safePlaybackUrl(source.embedUrl)) && (
                <button type="button" onClick={enableEmbedded} className="rounded-xl px-4 py-2 text-xs font-semibold" style={{ background: store.theme.primary, color: store.theme.textInverse }}>
                  Thử trình phát của nguồn
                </button>
              )}
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
                  failedSources.current.clear();
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
          <button type="button" onClick={handleSourceError} className="rounded-xl border px-3 py-1.5 text-xs" style={{ color: store.theme.text, borderColor: store.theme.border }}>
            Nguồn lỗi? Thử nguồn tiếp theo
          </button>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mr-1" style={{ color: store.theme.textMuted }}>
            <Server size={14} style={{ color: store.theme.primary }} />
            <span>Máy chủ phát:</span>
          </div>

          {(showFallbacks
            ? allSources
            : allSources.filter((s) => s.tier === "primary" || s.tier === "backup_vn")
          ).map((source) => {
            const index = allSources.findIndex((s) => s.id === source.id);
            const isActive = index === activeSourceIndex;
            return (
              <button
                key={source.id}
                type="button"
                data-playback-source={source.tier}
                aria-pressed={isActive}
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

          {!showFallbacks && allSources.length > (allSources.filter((s) => s.tier === "primary" || s.tier === "backup_vn").length) && (
            <button
              type="button"
              onClick={() => setShowFallbacks(true)}
              className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold border opacity-75 hover:opacity-100 hover:scale-105 transition-all"
              style={{ borderColor: store.theme.border, color: store.theme.textMuted }}
            >
              <span>+ Nguồn dự phòng VIP</span>
            </button>
          )}
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
