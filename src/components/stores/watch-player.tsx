"use client";

import { useState, useRef, useEffect } from "react";
import { AlertCircle, RotateCcw, ExternalLink } from "lucide-react";
import type { StoreConfig } from "@/lib/stores/config";

interface WatchPlayerProps {
  store: StoreConfig;
  movieSlug: string;
  movieTitle: string;
  embedUrl?: string | null;
  streamUrl?: string | null;
  quality?: string | null;
  language?: string | null;
}

export function WatchPlayer({
  store,
  movieSlug,
  movieTitle,
  embedUrl,
  streamUrl,
  quality,
  language,
}: WatchPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // No source available
  if (!embedUrl && !streamUrl) {
    return (
      <div
        className="relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-2xl border"
        style={{
          background: `${store.theme.surface}`,
          borderColor: `${store.theme.primary}30`,
        }}
      >
        <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 50% 50%, ${store.theme.primary}30 0%, transparent 50%)` }} />

        <div className="relative text-center">
          <div
            className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl"
            style={{ background: `linear-gradient(135deg, ${store.theme.primary}20, ${store.theme.glow}20)` }}
          >
            <AlertCircle size={40} style={{ color: store.theme.primary }} />
          </div>
          <p className="text-xl font-bold" style={{ color: store.theme.text }}>
            Không có nguồn video
          </p>
          <p className="mt-2 text-sm" style={{ color: store.theme.muted }}>
            Phim này hiện không có nguồn phát video
          </p>
        </div>
      </div>
    );
  }

  // If embed URL, show iframe player
  if (embedUrl) {
    return (
      <div className="relative w-full">
        <div
          className="relative aspect-video w-full overflow-hidden rounded-2xl"
          style={{
            boxShadow: `0 20px 60px ${store.theme.glow}`,
          }}
        >
          {/* Video iframe */}
          <iframe
            ref={iframeRef}
            src={embedUrl}
            className="h-full w-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            style={{ background: store.theme.background }}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />

          {/* Watermark click blocker - bottom right where VSMOV watermark usually appears */}
          <div
            className="absolute bottom-2 right-2 h-8 w-20 cursor-default"
            style={{ pointerEvents: "auto" }}
            onClick={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
          />

          {/* Loading overlay */}
          {isLoading && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: `${store.theme.background}f0` }}
            >
              <div className="text-center">
                <div
                  className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-transparent"
                  style={{ borderTopColor: store.theme.primary }}
                />
                <p className="text-sm font-medium" style={{ color: store.theme.muted }}>
                  Đang tải video...
                </p>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {hasError && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: `${store.theme.background}f0` }}
            >
              <div className="text-center">
                <div
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ background: `${store.theme.primary}20` }}
                >
                  <AlertCircle size={32} style={{ color: store.theme.primary }} />
                </div>
                <p className="text-lg font-bold" style={{ color: store.theme.text }}>
                  Video không khả dụng
                </p>
                <p className="mt-2 text-sm" style={{ color: store.theme.muted }}>
                  Hãy thử chọn tập hoặc nguồn khác
                </p>
                <button
                  onClick={() => {
                    setHasError(false);
                    setIsLoading(true);
                    window.location.reload();
                  }}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold transition-all hover:scale-105"
                  style={{ background: store.theme.primary, color: "#fff" }}
                >
                  <RotateCcw size={18} />
                  Tải lại
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Video Info Bar */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {quality && (
              <span
                className="rounded-full px-4 py-2 text-sm font-semibold"
                style={{
                  background: `${store.theme.primary}15`,
                  color: store.theme.primary,
                }}
              >
                {quality}
              </span>
            )}
            {language && (
              <span className="text-sm" style={{ color: store.theme.muted }}>
                Ngôn ngữ: {language}
              </span>
            )}
          </div>

          <p className="text-xs" style={{ color: store.theme.muted }}>
            Điều khiển video nằm trong player. Nếu video không phát, hãy thử chọn tập khác.
          </p>
        </div>
      </div>
    );
  }

  // If direct stream URL, show native video player
  if (streamUrl) {
    return (
      <div className="relative w-full">
        <div
          className="relative aspect-video w-full overflow-hidden rounded-2xl"
          style={{
            boxShadow: `0 20px 60px ${store.theme.glow}`,
          }}
        >
          <video
            src={streamUrl}
            controls
            autoPlay
            className="h-full w-full"
            style={{ background: store.theme.background }}
            playsInline
            onLoadedData={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          >
            <track kind="captions" />
          </video>

          {/* Loading overlay */}
          {isLoading && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: `${store.theme.background}f0` }}
            >
              <div
                className="h-16 w-16 animate-spin rounded-full border-4 border-transparent"
                style={{ borderTopColor: store.theme.primary }}
              />
            </div>
          )}

          {/* Error overlay */}
          {hasError && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: `${store.theme.background}f0` }}
            >
              <div className="text-center">
                <div
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ background: `${store.theme.primary}20` }}
                >
                  <AlertCircle size={32} style={{ color: store.theme.primary }} />
                </div>
                <p className="text-lg font-bold" style={{ color: store.theme.text }}>
                  Video không khả dụng
                </p>
                <button
                  onClick={() => {
                    setHasError(false);
                    setIsLoading(true);
                    window.location.reload();
                  }}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold"
                  style={{ background: store.theme.primary, color: "#fff" }}
                >
                  <RotateCcw size={18} />
                  Tải lại
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quality & Language Info */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {quality && (
              <span
                className="rounded-full px-4 py-2 text-sm font-semibold"
                style={{
                  background: `${store.theme.primary}15`,
                  color: store.theme.primary,
                }}
              >
                {quality}
              </span>
            )}
            {language && (
              <span className="text-sm" style={{ color: store.theme.muted }}>
                Ngôn ngữ: {language}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
