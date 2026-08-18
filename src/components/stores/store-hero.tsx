"use client";

import Link from "next/link";
import { Play, ChevronRight, Sparkles, Heart, Share2, Calendar, Clock, Film } from "lucide-react";
import type { StoreConfig } from "@/lib/stores/config";
import type { ProviderMovieInput } from "@/types/catalog";
import { useState, useEffect, useRef } from "react";

interface StoreHeroProps {
  store: StoreConfig;
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
        setTimeout(() => setIsVisible(true), 100);
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

  // Theme mood
  const themeMood = {
    'binh-minh': { emoji: '🌅', name: 'Bình Minh', tagline: 'Khoảnh khắc mặt trời vừa ló' },
    'ban-mai': { emoji: '☀️', name: 'Ban Mai', tagline: 'Buổi sáng tươi đẹp' },
    'hoang-hon': { emoji: '🌆', name: 'Hoàng Hôn', tagline: 'Cuối ngày điện ảnh' },
    'da-nguyet': { emoji: '🌙', name: 'Dạ Nguyệt', tagline: 'Đêm trăng huyền bí' },
  };

  const mood = themeMood[store.slug as keyof typeof themeMood] || themeMood['hoang-hon'];

  // Loading state
  if (loading) {
    return (
      <section className="relative overflow-hidden" style={{ background: store.theme.background }}>
        {/* Animated gradient background */}
        <div
          className="absolute inset-0 animate-pulse"
          style={{
            background: `radial-gradient(ellipse at 30% 50%, ${store.theme.primary}15 0%, transparent 50%),
                         radial-gradient(ellipse at 70% 50%, ${store.theme.secondary}15 0%, transparent 50%)`,
          }}
        />

        <div className="page-shell relative flex h-[450px] items-center">
          <div className="max-w-2xl space-y-5">
            <div
              className="h-8 w-40 rounded-full animate-pulse"
              style={{ background: `${store.theme.surface}` }}
            />
            <div
              className="h-14 w-96 rounded-xl animate-pulse"
              style={{ background: `${store.theme.surface}` }}
            />
            <div
              className="h-20 w-full max-w-lg rounded animate-pulse"
              style={{ background: `${store.theme.surface}` }}
            />
          </div>
        </div>
      </section>
    );
  }

  // No featured movie - show welcome
  if (!featuredMovie) {
    return (
      <section className="relative overflow-hidden" style={{ background: store.theme.background }}>
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${store.theme.primary}15 0%, transparent 50%)`,
          }}
        />

        <div className="page-shell relative py-24 text-center">
          <div className="mx-auto max-w-md">
            <div className="text-8xl mb-6 animate-bounce">
              {mood.emoji}
            </div>

            <h2 className="text-3xl font-bold" style={{ color: store.theme.text }}>
              Chào mừng đến {store.name}
            </h2>

            <p className="mt-4" style={{ color: store.theme.textSecondary }}>
              {mood.tagline}
            </p>

            <Link
              href={`/stores/${store.slug}`}
              className="mt-8 inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-lg font-bold transition-all duration-300 hover:scale-105"
              style={{
                background: store.theme.gradientAccent,
                color: store.theme.textInverse,
                boxShadow: `0 10px 40px ${store.theme.glow}`,
              }}
            >
              <Play size={24} fill="currentColor" />
              Khám phá ngay
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="relative overflow-hidden" style={{ background: store.theme.background }}>
      {/* Dynamic parallax background */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-out"
        style={{
          backgroundImage: featuredMovie.backdropUrl
            ? `url(${featuredMovie.backdropUrl})`
            : featuredMovie.posterUrl
              ? `url(${featuredMovie.posterUrl})`
              : "none",
          transform: `scale(1.1) translate(${(mousePos.x - 50) * 0.02}%, ${(mousePos.y - 50) * 0.02}%)`,
        }}
      >
        {/* Multi-layer gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(to bottom,
                ${store.theme.background}ee 0%,
                ${store.theme.background}99 20%,
                ${store.theme.background}80 40%,
                ${store.theme.background}ee 100%
              )
            `,
          }}
        />

        {/* Spotlight effect */}
        <div
          className="pointer-events-none absolute inset-0 transition-all duration-1000"
          style={{
            background: `radial-gradient(600px circle at ${mousePos.x}% ${mousePos.y}%, ${store.theme.primary}15 0%, transparent 40%)`,
            opacity: isVisible ? 1 : 0,
          }}
        />
      </div>

      {/* Floating decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${10 + i * 12}%`,
              top: `${15 + (i % 4) * 20}%`,
              animation: `float-${i % 4} ${6 + i}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          >
            <div
              className="h-2 w-2 rounded-full opacity-30"
              style={{ background: store.theme.primary }}
            />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="page-shell relative py-16 md:py-24 lg:py-32">
        <div
          className="max-w-3xl transition-all duration-1000"
          style={{
            transform: isVisible ? "translateY(0)" : "translateY(40px)",
            opacity: isVisible ? 1 : 0,
          }}
        >
          {/* Theme badge */}
          <div
            className="inline-flex items-center gap-3 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-700"
            style={{
              background: `${store.theme.primaryMuted}`,
              color: store.theme.primary,
              border: `1px solid ${store.theme.border}`,
              transform: isVisible ? "translateX(0)" : "translateX(-30px)",
            }}
          >
            <span className="text-2xl">{mood.emoji}</span>
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
            className="mt-8 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl transition-all duration-700"
            style={{
              color: store.theme.text,
              textShadow: `0 4px 30px ${store.theme.glow}`,
              transform: isVisible ? "translateY(0)" : "translateY(30px)",
              transitionDelay: "100ms",
            }}
          >
            {featuredMovie.title}
          </h1>

          {featuredMovie.originalTitle && featuredMovie.originalTitle !== featuredMovie.title && (
            <p
              className="mt-3 text-xl md:text-2xl transition-all duration-700"
              style={{
                color: store.theme.textSecondary,
                transform: isVisible ? "translateY(0)" : "translateY(30px)",
                transitionDelay: "150ms",
              }}
            >
              {featuredMovie.originalTitle}
            </p>
          )}

          {/* Meta badges */}
          <div
            className="mt-6 flex flex-wrap items-center gap-3 transition-all duration-700"
            style={{
              transform: isVisible ? "translateY(0)" : "translateY(30px)",
              transitionDelay: "200ms",
            }}
          >
            {featuredMovie.quality && (
              <span
                className="rounded-lg px-4 py-1.5 text-sm font-bold uppercase tracking-wider"
                style={{
                  background: store.theme.gradientAccent,
                  color: store.theme.textInverse,
                  boxShadow: `0 4px 15px ${store.theme.glow}`,
                }}
              >
                {featuredMovie.quality}
              </span>
            )}
            {featuredMovie.year && (
              <span className="flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium" style={{ background: `${store.theme.surface}80`, color: store.theme.text }}>
                <Calendar size={14} />
                {featuredMovie.year}
              </span>
            )}
            {featuredMovie.durationMinutes && (
              <span className="flex items-center gap-2 text-sm" style={{ color: store.theme.textSecondary }}>
                <Clock size={14} />
                {featuredMovie.durationMinutes} phút
              </span>
            )}
            {featuredMovie.type && (
              <span className="rounded-lg px-4 py-1.5 text-sm font-medium" style={{ background: `${store.theme.primaryMuted}`, color: store.theme.primary }}>
                <Film size={14} className="inline mr-1" />
                {featuredMovie.type === "single" && "Phim lẻ"}
                {featuredMovie.type === "series" && "Phim bộ"}
                {featuredMovie.type === "animation" && "Hoạt hình"}
              </span>
            )}
          </div>

          {/* Genres */}
          {featuredMovie.genres.length > 0 && (
            <div
              className="mt-5 flex flex-wrap gap-2 transition-all duration-700"
              style={{
                transform: isVisible ? "translateY(0)" : "translateY(30px)",
                transitionDelay: "250ms",
              }}
            >
              {featuredMovie.genres.slice(0, 4).map((genre) => (
                <span
                  key={genre.id}
                  className="rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-300 hover:scale-105"
                  style={{
                    background: `${store.theme.primaryMuted}`,
                    color: store.theme.primary,
                    border: `1px solid ${store.theme.border}`,
                  }}
                >
                  {genre.name}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {featuredMovie.description && (
            <p
              className="mt-6 max-w-2xl text-base leading-relaxed line-clamp-3 md:text-lg transition-all duration-700"
              style={{
                color: store.theme.textSecondary,
                transform: isVisible ? "translateY(0)" : "translateY(30px)",
                transitionDelay: "300ms",
              }}
            >
              {featuredMovie.description}
            </p>
          )}

          {/* Action Buttons */}
          <div
            className="mt-10 flex flex-wrap items-center gap-4 transition-all duration-700"
            style={{
              transform: isVisible ? "translateY(0)" : "translateY(30px)",
              transitionDelay: "400ms",
            }}
          >
            <Link
              href={`/stores/${store.slug}/watch/${featuredMovie.providerSlug}?episode=1`}
              className="group relative flex items-center gap-3 rounded-2xl px-10 py-5 text-lg font-bold transition-all duration-500 hover:scale-105 hover:shadow-2xl"
              style={{
                background: store.theme.gradientAccent,
                color: store.theme.textInverse,
                boxShadow: `0 10px 40px ${store.theme.glow}`,
              }}
            >
              <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/20 transition-transform duration-300 group-hover:scale-110">
                <Play size={28} fill="currentColor" className="ml-1" />
              </span>
              <span className="relative">Xem ngay</span>
              <ChevronRight size={22} className="relative transition-transform duration-300 group-hover:translate-x-2" />
            </Link>

            <Link
              href={`/stores/${store.slug}/movie/${featuredMovie.providerSlug}`}
              className="group flex items-center gap-2 rounded-2xl px-6 py-5 text-base font-medium transition-all duration-300 hover:scale-105"
              style={{
                background: `${store.theme.surface}80`,
                color: store.theme.text,
                border: `1px solid ${store.theme.border}`,
              }}
            >
              <Sparkles size={20} style={{ color: store.theme.primary }} />
              <span>Chi tiết</span>
            </Link>

            <button
              className="group flex items-center gap-2 rounded-2xl px-6 py-5 text-base font-medium transition-all duration-300 hover:scale-105"
              style={{
                background: `${store.theme.primaryMuted}`,
                color: store.theme.primary,
              }}
            >
              <Heart size={20} className="transition-transform duration-300 group-hover:scale-125" />
              <span>Yêu thích</span>
            </button>
          </div>
        </div>
      </div>

      {/* Gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, transparent 0%, ${store.theme.background} 100%)`,
        }}
      />

      <style jsx global>{`
        @keyframes float-0 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        @keyframes float-1 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(-90deg); }
        }
        @keyframes float-2 {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-25px) scale(1.2); }
        }
        @keyframes float-3 {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(10px, -10px); }
          50% { transform: translate(0, -20px); }
          75% { transform: translate(-10px, -10px); }
        }
      `}</style>
    </section>
  );
}
