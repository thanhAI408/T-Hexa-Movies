"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { ChevronLeft, ChevronRight, Expand, List, Settings, Volume2, VolumeX } from "lucide-react";
import type { MovieDetailView } from "@/types/catalog";
import { saveWatchHistory, WatchHistoryEntry } from "@/components/home/continue-watching";
import { buildVidSrcEmbed, buildVidLinkEmbed } from "@/lib/streaming/fallback";

export default function WatchPage() {
  const params = useParams();
  const slug = params.slug as string;
  const episodeKey = params.episode as string;

  const [movie, setMovie] = useState<MovieDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentEpisode = episodeKey;
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [showSources, setShowSources] = useState(false);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hlsRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch movie data
  useEffect(() => {
    async function fetchMovie() {
      try {
        setLoading(true);
        const response = await fetch(`/api/movie/${slug}`);
        if (!response.ok) {
          throw new Error("Movie not found");
        }
        const data = await response.json();
        setMovie(data);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load movie");
        setLoading(false);
      }
    }
    fetchMovie();
  }, [slug]);

  const currentEpisodeData = movie?.episodes.find(
    (episode) => episode.episodeKey === currentEpisode,
  );
  const sources = useMemo(() => {
    const rawSources = [...(currentEpisodeData?.sources ?? [])];

    const tmdbId = (movie as any)?.tmdbId || (movie as any)?.externalIds?.tmdbId || null;
    const imdbId = (movie as any)?.imdbId || (movie as any)?.externalIds?.imdbId || null;
    const seasonNumber = currentEpisodeData?.seasonNumber ?? 1;
    const episodeNumber = currentEpisodeData?.episodeNumber ?? 1;

    if (tmdbId || imdbId) {
      const vidsrcEmbed = buildVidSrcEmbed({
        tmdbId,
        imdbId,
        type: movie?.type,
        seasonNumber,
        episodeNumber,
      });
      if (vidsrcEmbed && !rawSources.some((s) => s.provider === "vidsrc")) {
        rawSources.push({
          id: `vidsrc-${currentEpisode}`,
          provider: "vidsrc",
          serverName: "VidSrc (Fallback 1)",
          streamType: "embed",
          streamUrl: null,
          embedUrl: vidsrcEmbed,
          quality: "1080p",
          language: "Quốc tế (Eng/Sub)",
          health: "healthy",
          successCount: 1,
          failureCount: 0,
          startupLatencyMs: null,
          priorityScore: 18,
        });
      }

      const vidlinkEmbed = buildVidLinkEmbed({
        tmdbId,
        imdbId,
        type: movie?.type,
        seasonNumber,
        episodeNumber,
      });
      if (vidlinkEmbed && !rawSources.some((s) => s.provider === "vidlink")) {
        rawSources.push({
          id: `vidlink-${currentEpisode}`,
          provider: "vidlink",
          serverName: "VidLink (Fallback 2)",
          streamType: "embed",
          streamUrl: null,
          embedUrl: vidlinkEmbed,
          quality: "1080p",
          language: "Quốc tế (Eng/Sub)",
          health: "healthy",
          successCount: 1,
          failureCount: 0,
          startupLatencyMs: null,
          priorityScore: 17,
        });
      }
    }

    return rawSources;
  }, [currentEpisodeData, movie, currentEpisode]);
  const rankedSources = useMemo(() => {
    const sorted = [...sources].sort((a, b) => b.priorityScore - a.priorityScore);
    const healthy = sorted.filter((source) => source.health !== "unavailable");
    return healthy.length > 0 ? healthy : sorted;
  }, [sources]);
  const currentSource =
    sources.find((source) => source.id === selectedSourceId) ??
    rankedSources[0] ??
    null;

  // Initialize HLS player
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentSource || currentSource.streamType === "embed") return;

    // Cleanup previous HLS
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const url = currentSource.streamUrl ?? currentSource.embedUrl;
    if (!url) return;

    const initPlayer = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const HlsLib = (await import("hls.js")).default as any;
      if (currentSource.streamType === "hls" && HlsLib.isSupported()) {
        const hls = new HlsLib({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(HlsLib.Events.MANIFEST_PARSED, () => {
          video.dataset.playbackStartTime = String(performance.now());
          video.play().catch(() => {});
        });
        hls.on(HlsLib.Events.ERROR, (_event: unknown, data: unknown) => {
          const errData = data as { fatal?: boolean };
          if (errData.fatal) {
            console.error("HLS fatal error:", data);
            setShowSources(true);
          }
        });
        hlsRef.current = hls;
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari native HLS
        video.src = url;
        video.dataset.playbackStartTime = String(performance.now());
        video.play().catch(() => {});
      } else if (currentSource.streamType === "mp4" || url.endsWith(".mp4")) {
        video.src = url;
        video.dataset.playbackStartTime = String(performance.now());
        video.play().catch(() => {});
      }
    };

    initPlayer();
  }, [currentSource]);

  // Save watch history
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !movie || !currentEpisode || duration <= 0) return;

    const entry: WatchHistoryEntry = {
      movieId: movie.id,
      movieSlug: movie.slug,
      movieTitle: movie.title,
      posterUrl: movie.posterUrl,
      episodeKey: currentEpisode,
      episodeLabel: movie.episodes.find((e) => e.episodeKey === currentEpisode)?.episodeLabel ?? currentEpisode,
      currentTime: video.currentTime,
      duration: video.duration,
      updatedAt: Date.now(),
    };
    saveWatchHistory(entry);

    // Update current time and buffered
    setCurrentTime(video.currentTime);
    if (video.buffered.length > 0) {
      setBuffered(video.buffered.end(video.buffered.length - 1));
    }
  }, [movie, currentEpisode, duration]);

  // Record playback feedback
  const recordFeedback = useCallback(
    async (success: boolean, latencyMs?: number) => {
      if (!currentSource) return;
      try {
        await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceId: currentSource.id,
            success,
            startupLatencyMs: latencyMs,
          }),
        });
      } catch {
        // Silently fail feedback
      }
    },
    [currentSource],
  );

  // Player event handlers
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    // Record startup time on first play
    const video = videoRef.current;
    if (video && !video.dataset.playbackStarted) {
      video.dataset.playbackStarted = "true";
      const startTime = parseInt(video.dataset.playbackStartTime ?? "0", 10);
      const latency = startTime ? performance.now() - startTime : undefined;
      recordFeedback(true, latency);
    }
  };

  const handlePause = () => setIsPlaying(false);

  const handleError = () => {
    setIsPlaying(false);
    recordFeedback(false);
  };

  // Controls visibility
  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    controlsTimeout.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  // Player controls
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const seek = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
  };

  const seekTo = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  };

  // Format time
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-[#f4b55e]" />
          <p className="mt-4 text-[#8896a9]">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Không tìm thấy phim</h1>
          <p className="mt-2 text-[#8896a9]">{error ?? "Đã xảy ra lỗi"}</p>
          <Link href="/" className="mt-4 inline-block text-[#f4b55e] hover:underline">
            Quay về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  const currentEp = movie.episodes.find((e) => e.episodeKey === currentEpisode);
  const isEmbed = currentSource?.streamType === "embed";
  const embedUrl = currentSource?.embedUrl;

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b border-white/10 bg-[#07090d]/95 px-4">
        <Link
          href={`/phim/${movie.slug}`}
          className="flex items-center gap-2 text-sm text-[#8896a9] hover:text-white"
        >
          <ChevronLeft size={20} />
          <span className="hidden sm:inline">Quay lại</span>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="truncate text-sm font-semibold text-white">
            {movie.title} - {currentEp?.episodeLabel ?? episodeKey}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEpisodes(!showEpisodes)}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20"
          >
            <List size={16} />
            <span className="hidden sm:inline">Tập phim</span>
          </button>
          <button
            onClick={() => setShowSources(!showSources)}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20"
          >
            <Settings size={16} />
            <span className="hidden sm:inline">Nguồn</span>
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        {/* Player */}
        <div className="flex-1">
          <div
            ref={containerRef}
            className="relative aspect-video bg-black"
            onMouseMove={showControlsTemporarily}
            onMouseLeave={() => isPlaying && setShowControls(false)}
          >
            {isEmbed && embedUrl ? (
              <iframe
                src={embedUrl}
                className="h-full w-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  className="h-full w-full"
                  onClick={togglePlay}
                  onLoadedMetadata={handleLoadedMetadata}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onError={handleError}
                  onTimeUpdate={handleTimeUpdate}
                />

                {/* Controls overlay */}
                <div
                  className={`absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/80 via-transparent to-black/60 transition-opacity ${
                    showControls || !isPlaying ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {/* Top gradient is automatic */}

                  {/* Center play button */}
                  <div className="flex flex-1 items-center justify-center">
                    {!isPlaying && (
                      <button
                        onClick={togglePlay}
                        className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur transition hover:bg-white/30"
                      >
                        <ChevronRight size={36} className="ml-1 text-white" />
                      </button>
                    )}
                  </div>

                  {/* Bottom controls */}
                  <div className="p-4">
                    {/* Progress bar */}
                    <div className="mb-2 h-1 cursor-pointer rounded-full bg-white/20">
                      <div
                        className="h-full rounded-full bg-[#f4b55e] transition-all"
                        style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%" }}
                        onClick={(e) => {
                          const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                          if (rect) {
                            const percent = (e.clientX - rect.left) / rect.width;
                            seekTo(percent * duration);
                          }
                        }}
                      />
                      {/* Buffered */}
                      <div
                        className="pointer-events-none absolute -mt-1 h-1 w-full rounded-full bg-white/10"
                        style={{ width: duration > 0 ? `${(buffered / duration) * 100}%` : "0%" }}
                      />
                    </div>

                    {/* Control buttons */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <button onClick={togglePlay} className="text-white hover:text-[#f4b55e]">
                          {isPlaying ? (
                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                              <rect x="6" y="4" width="4" height="16" />
                              <rect x="14" y="4" width="4" height="16" />
                            </svg>
                          ) : (
                            <ChevronRight size={24} className="ml-0.5" />
                          )}
                        </button>
                        <button onClick={() => seek(-10)} className="text-white hover:text-[#f4b55e]">
                          <span className="text-xs">-10s</span>
                        </button>
                        <button onClick={() => seek(10)} className="text-white hover:text-[#f4b55e]">
                          <span className="text-xs">+10s</span>
                        </button>
                        <button onClick={toggleMute} className="text-white hover:text-[#f4b55e]">
                          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>
                      </div>

                      <span className="text-sm text-white/80">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>

                      <div className="ml-auto flex items-center gap-2">
                        <span className="text-xs text-white/60">
                          {currentSource?.quality ?? "Nguồn"}
                        </span>
                        <button
                          onClick={toggleFullscreen}
                          className="text-white hover:text-[#f4b55e]"
                        >
                          <Expand size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Episode info */}
          <div className="p-4">
            <h2 className="text-lg font-bold text-white">
              {movie.title}
            </h2>
            <p className="mt-1 text-sm text-[#8896a9]">
              {currentEp?.episodeLabel} {currentEp?.episodeTitle && `- ${currentEp.episodeTitle}`}
            </p>
          </div>
        </div>

        {/* Episodes sidebar */}
        {showEpisodes && movie.episodes.length > 0 && (
          <div className="w-full border-t border-white/10 lg:w-80 lg:border-t-0 lg:border-l">
            <div className="sticky top-14 max-h-[calc(100vh-56px)] overflow-y-auto p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">
                {movie.type === "series" ? "Danh sách tập" : "Tập phim"}
              </h3>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-3">
                {movie.episodes.map((ep) => (
                  <Link
                    key={ep.id}
                    href={`/xem/${movie.slug}/${encodeURIComponent(ep.episodeKey)}`}
                    className={`flex items-center justify-center rounded-lg px-2 py-2 text-xs font-medium transition ${
                      ep.episodeKey === currentEpisode
                        ? "bg-[#f4b55e] text-black"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    {ep.episodeLabel}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sources sidebar */}
        {showSources && sources.length > 0 && (
          <div className="w-full border-t border-white/10 lg:w-64 lg:border-t-0 lg:border-l">
            <div className="sticky top-14 max-h-[calc(100vh-56px)] overflow-y-auto p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">Nguồn phát</h3>
              <div className="space-y-2">
                {sources.map((source) => (
                  <button
                    key={source.id}
                    onClick={() => setSelectedSourceId(source.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition ${
                      source.id === currentSource?.id
                        ? "bg-[#f4b55e] text-black"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    <span className="font-medium capitalize">{source.streamType}</span>
                    <span className="text-[10px] opacity-70">
                      {source.serverName} {source.quality && `• ${source.quality}`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
