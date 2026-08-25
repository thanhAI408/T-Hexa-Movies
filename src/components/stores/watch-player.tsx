"use client";

import { useState, useRef } from "react";
import { AlertCircle, RotateCcw, Sparkles, Film, Radio } from "lucide-react";
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
        className="relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-3xl border p-8"
        style={{
          background: store.theme.surface,
          borderColor: store.theme.border,
          boxShadow: store.theme.shadowLg,
        }}
      >
        <div 
          className="absolute inset-0 opacity-25" 
          style={{ background: `radial-gradient(circle at 50% 50%, ${store.theme.glow} 0%, transparent 60%)` }} 
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

  return (
    <div className="relative w-full space-y-4">
      {/* Ambient Theater Backlight Glow */}
      <div
        className="absolute -inset-4 sm:-inset-6 rounded-3xl opacity-35 blur-3xl pointer-events-none transition-all duration-700"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${store.theme.primary} 0%, ${store.theme.secondary} 40%, transparent 80%)`,
        }}
      />

      {/* Video Viewport Box */}
      <div
        className="relative aspect-video w-full overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-2xl"
        style={{
          borderColor: store.theme.border,
          boxShadow: `0 20px 60px -15px ${store.theme.glow}, 0 0 1px 1px ${store.theme.border}`,
          background: "#000000",
        }}
      >
        {embedUrl ? (
          <iframe
            ref={iframeRef}
            src={embedUrl}
            className="h-full w-full border-0"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            style={{ background: "#000000" }}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        ) : streamUrl ? (
          <video
            src={streamUrl}
            controls
            autoPlay
            className="h-full w-full"
            style={{ background: "#000000" }}
            playsInline
            onLoadedData={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
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
              Đang kết nối tín hiệu rạp...
            </p>
          </div>
        )}

        {/* Error overlay */}
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
              Tín hiệu luồng bị gián đoạn
            </h3>
            <p className="mt-1 text-xs max-w-sm" style={{ color: store.theme.textMuted }}>
              Máy chủ phản hồi chậm hoặc tập phim cần làm mới.
            </p>
            <button
              type="button"
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
                window.location.reload();
              }}
              className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-all hover:scale-105 shadow-lg"
              style={{ background: store.theme.gradientAccent, color: "#fff" }}
            >
              <RotateCcw size={14} />
              Tải lại trang
            </button>
          </div>
        )}
      </div>

      {/* Video Bar Info */}
      <div 
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3.5 sm:px-5 backdrop-blur-xl"
        style={{ background: store.theme.surface, borderColor: store.theme.border }}
      >
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold">
          <span 
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-white"
            style={{ background: store.theme.gradientAccent }}
          >
            <Radio size={12} className="animate-pulse" />
            <span>Trực Tuyến</span>
          </span>

          {quality && (
            <span 
              className="rounded-lg px-2.5 py-1 border font-bold uppercase tracking-wider"
              style={{ background: store.theme.primaryMuted, borderColor: store.theme.border, color: store.theme.primary }}
            >
              {quality}
            </span>
          )}

          {language && (
            <span 
              className="rounded-lg px-2.5 py-1 border"
              style={{ background: store.theme.surface, borderColor: store.theme.border, color: store.theme.textSecondary }}
            >
              Ngôn ngữ: {language}
            </span>
          )}
        </div>

        <p className="text-[11px] font-medium" style={{ color: store.theme.textMuted }}>
          💡 Mẹo: Bật chế độ Toàn màn hình để có trải nghiệm xem tốt nhất
        </p>
      </div>
    </div>
  );
}
