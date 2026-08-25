"use client";

import Link from "next/link";
import { Play, ChevronRight, Sparkles, Heart, Calendar, Clock, Film } from "lucide-react";
import type { StoreConfig } from "@/lib/stores/config";
import type { ProviderMovieInput } from "@/types/catalog";
import { useState, useEffect, useRef, useMemo } from "react";

interface StoreHeroProps {
  store: StoreConfig;
}

function cleanPosterUrl(url: any): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const cleaned = trimmed.replace(/^\/+/, "");
  if (cleaned.startsWith("uploads/movies/")) {
    return `https://phimimg.com/${cleaned}`;
  }
  return `https://phimimg.com/uploads/movies/${cleaned}`;
}

export function StoreHero({ store }: StoreHeroProps) {
  const [featuredMovie, setFeaturedMovie] = useState<ProviderMovieInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    async function fetchFeatured() {
      try {
        const response = await fetch(`/api/stores/${store.slug}/movies?page=1&limit=1&sort=updated`);
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          setFeaturedMovie(data.items[0]);
        }
      } catch (error) {
        console.error("Failed to fetch featured movie:", error);
      } finally {
        setLoading(false);
        setTimeout(() => setIsVisible(true), 50);
      }
    }

    fetchFeatured();
  }, [store.slug]);

  // Track mouse position for parallax
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        setMousePos({
          x: ((e.clientX - rect.left) / rect.width) * 100,
          y: ((e.clientY - rect.top) / rect.height) * 100,
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const themeMood = {
    'binh-minh': { emoji: '🌅', name: 'Bình Minh', tagline: 'Khoảnh khắc mặt trời vừa ló — Dịu dàng, ấm áp, đậm chất thơ' },
    'ban-mai': { emoji: '☀️', name: 'Ban Mai', tagline: 'Buổi sáng tươi đẹp — Tràn đầy năng lượng tích cực' },
    'hoang-hon': { emoji: '🌆', name: 'Hoàng Hôn', tagline: 'Cuối ngày điện ảnh — Sâu lắng, ấm áp, hoài niệm' },
    'da-nguyet': { emoji: '🌙', name: 'Dạ Nguyệt', tagline: 'Đêm trăng huyền bí — Sang trọng, cuốn hút, tĩnh lặng' },
  };

  const mood = themeMood[store.slug as keyof typeof themeMood] || themeMood['hoang-hon'];

  const backdrop = useMemo(() => {
    if (!featuredMovie) return null;
    return cleanPosterUrl(featuredMovie.backdropUrl) || cleanPosterUrl(featuredMovie.posterUrl);
  }, [featuredMovie]);

  // Loading state
  if (loading) {
    return (
      <section className="relative overflow-hidden" style={{ background: store.theme.background }}>
        <div className="page-shell relative flex min-h-[420px] items-center py-16">
          <div className="max-w-2xl space-y-4">
            <div className="h-8 w-44 rounded-full skeleton" />
            <div className="h-12 w-full max-w-lg rounded-2xl skeleton" />
            <div className="h-6 w-3/4 rounded-xl skeleton" />
            <div className="flex gap-3 pt-2">
              <div className="h-12 w-36 rounded-2xl skeleton" />
              <div className="h-12 w-32 rounded-2xl skeleton" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Fallback if no featured movie
  if (!featuredMovie) {
    return (
      <section className="relative overflow-hidden py-20 text-center" style={{ background: store.theme.background }}>
        <div className="page-shell relative z-10 max-w-xl mx-auto space-y-6">
          <div className="text-7xl animate-bounce">{mood.emoji}</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: store.theme.text }}>
            Chào mừng đến {store.name}
          </h2>
          <p className="text-base leading-relaxed" style={{ color: store.theme.textSecondary }}>
            {mood.tagline}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section 
      ref={sectionRef} 
      className="relative overflow-hidden transition-colors duration-500" 
      style={{ background: store.theme.background }}
    >
      {/* Background with Ambient Backdrop Blur */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out"
        style={{
          backgroundImage: backdrop ? `url(${backdrop})` : "none",
          transform: `scale(1.06) translate(${(mousePos.x - 50) * 0.015}%, ${(mousePos.y - 50) * 0.015}%)`,
          filter: "brightness(0.85)",
        }}
      >
        {/* Multi-layer gradient overlays for perfect text contrast */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(to right,
                ${store.theme.background} 0%,
                ${store.theme.background}f2 35%,
                ${store.theme.background}aa 65%,
                ${store.theme.background}50 100%
              ),
              linear-gradient(to top,
                ${store.theme.background} 0%,
                ${store.theme.background}80 40%,
                transparent 100%
              )
            `,
          }}
        />

        {/* Ambient spotlight follow mouse */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
          style={{
            background: `radial-gradient(700px circle at ${mousePos.x}% ${mousePos.y}%, ${store.theme.glow} 0%, transparent 60%)`,
            opacity: isVisible ? 0.35 : 0,
          }}
        />
      </div>

      {/* Main Content Banner */}
      <div className="page-shell relative py-12 sm:py-16 md:py-20 lg:py-24">
        <div
          className="max-w-2xl lg:max-w-3xl transition-all duration-700 space-y-4"
          style={{
            transform: isVisible ? "translateY(0)" : "translateY(24px)",
            opacity: isVisible ? 1 : 0,
          }}
        >
          {/* Mood Badge */}
          <div
            className="inline-flex items-center gap-2.5 rounded-full px-4 py-1.5 text-xs font-bold tracking-wide shadow-sm"
            style={{
              background: store.theme.primaryMuted,
              color: store.theme.primary,
              border: `1px solid ${store.theme.border}`,
            }}
          >
            <span className="text-base">{mood.emoji}</span>
            <span>{mood.name}</span>
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                style={{ background: store.theme.primary }}
              />
              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{ background: store.theme.primary }}
              />
            </span>
          </div>

          {/* Title */}
          <h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]"
            style={{
              color: store.theme.text,
              textShadow: `0 4px 24px ${store.theme.glow}`,
            }}
          >
            {featuredMovie.title}
          </h1>

          {featuredMovie.originalTitle && featuredMovie.originalTitle !== featuredMovie.title && (
            <p
              className="text-base sm:text-lg md:text-xl font-medium"
              style={{ color: store.theme.textSecondary }}
            >
              {featuredMovie.originalTitle}
            </p>
          )}

          {/* Meta Tags */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold pt-1">
            {featuredMovie.year && (
              <span
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 border backdrop-blur-md shadow-xs"
                style={{
                  background: store.theme.surface,
                  borderColor: store.theme.border,
                  color: store.theme.text,
                }}
              >
                <Calendar size={13} style={{ color: store.theme.primary }} />
                <span>{featuredMovie.year}</span>
              </span>
            )}

            {featuredMovie.quality && (
              <span
                className="rounded-xl px-3 py-1.5 font-bold uppercase tracking-wider text-white shadow-xs"
                style={{ background: store.theme.gradientAccent }}
              >
                {featuredMovie.quality}
              </span>
            )}

            {featuredMovie.type && (
              <span
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 border backdrop-blur-md shadow-xs"
                style={{
                  background: store.theme.primaryMuted,
                  borderColor: store.theme.border,
                  color: store.theme.primary,
                }}
              >
                <Film size={13} />
                <span>{featuredMovie.type === "single" ? "Phim lẻ" : featuredMovie.type === "series" ? "Phim bộ" : "Hoạt hình"}</span>
              </span>
            )}
          </div>

          {/* Description */}
          {featuredMovie.description && (
            <p
              className="line-clamp-3 text-sm sm:text-base leading-relaxed max-w-xl"
              style={{ color: store.theme.textSecondary }}
            >
              {featuredMovie.description}
            </p>
          )}

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <Link
              href={`/stores/${store.slug}/watch/${featuredMovie.providerSlug}`}
              className="group flex items-center gap-2.5 rounded-2xl px-7 py-3.5 text-sm sm:text-base font-bold transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl"
              style={{
                background: store.theme.gradientAccent,
                color: store.theme.textInverse,
                boxShadow: `0 8px 25px ${store.theme.glow}`,
              }}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                <Play size={13} fill="currentColor" className="ml-0.5" />
              </div>
              <span>Xem ngay</span>
              <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              href={`/stores/${store.slug}/movie/${featuredMovie.providerSlug}`}
              className="flex items-center gap-2 rounded-2xl border px-6 py-3.5 text-xs sm:text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95 backdrop-blur-md"
              style={{
                background: store.theme.surface,
                borderColor: store.theme.border,
                color: store.theme.text,
                boxShadow: store.theme.shadowSm,
              }}
            >
              <Sparkles size={15} style={{ color: store.theme.primary }} />
              <span>Thông tin chi tiết</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
