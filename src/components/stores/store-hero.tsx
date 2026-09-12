"use client";

import Link from "next/link";
import { Play, ChevronRight, Sparkles, Calendar, Film, Ticket, Star } from "lucide-react";
import type { StoreConfig } from "@/lib/stores/config";
import type { ProviderMovieInput } from "@/types/catalog";
import { useState, useEffect, useRef, useMemo } from "react";
import { getCachedHero, setCachedHero } from "@/lib/stores/cache";
import { useTheme } from "./theme-provider";
import { STORE_THEMES } from "./store-scenes";

interface StoreHeroProps {
  store: StoreConfig;
}

function cleanPosterUrl(url: unknown): string | null {
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

function StoreHeroContent({ store }: StoreHeroProps) {
  const { layoutMode } = useTheme();
  // Initialize instantly from in-memory cache if available
  const initialCached = useMemo(() => getCachedHero(store.slug), [store.slug]);
  const [featuredMovie, setFeaturedMovie] = useState<ProviderMovieInput | null>(initialCached);
  const [loading, setLoading] = useState(!initialCached);
  const [isVisible, setIsVisible] = useState(Boolean(initialCached));
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchFeatured() {
      try {
        const response = await fetch(`/api/stores/${store.slug}/movies?page=1&limit=1&sort=updated`);
        if (!response.ok) return;
        const data = await response.json();
        if (data.items && data.items.length > 0 && isMounted) {
          setFeaturedMovie(data.items[0]);
          setCachedHero(store.slug, data.items[0]);
        }
      } catch (error) {
        console.error("Failed to fetch featured movie:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
          setTimeout(() => setIsVisible(true), 30);
        }
      }
    }

    fetchFeatured();

    return () => {
      isMounted = false;
    };
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
    "binh-minh": { emoji: "🌅", name: "Bình Minh", subtitle: "Hừng đông điện ảnh", tagline: "Khoảnh khắc mặt trời vừa ló — Dịu dàng, ấm áp, đậm chất thơ" },
    "ban-mai": { emoji: "☀️", name: "Ban Mai", subtitle: "Ánh dương rạng rỡ", tagline: "Buổi sáng tươi đẹp — Tràn đầy năng lượng tích cực" },
    "hoang-hon": { emoji: "🌆", name: "Hoàng Hôn", subtitle: "Ráng chiều huyền ảo", tagline: "Cuối ngày điện ảnh — Sâu lắng, ấm áp, hoài niệm" },
    "da-nguyet": { emoji: "🌙", name: "Dạ Nguyệt", subtitle: "Đêm trăng vũ trụ", tagline: "Đêm trăng huyền bí — Sang trọng, cuốn hút, tĩnh lặng" },
  };

  const mood = themeMood[store.slug as keyof typeof themeMood] || themeMood["hoang-hon"];
  const scene = STORE_THEMES[store.slug]?.[0] || STORE_THEMES["binh-minh"][0];

  const backdrop = useMemo(() => {
    if (!featuredMovie) return null;
    return cleanPosterUrl(featuredMovie.backdropUrl) || cleanPosterUrl(featuredMovie.posterUrl);
  }, [featuredMovie]);

  const poster = useMemo(() => {
    if (!featuredMovie) return null;
    return cleanPosterUrl(featuredMovie.posterUrl) || backdrop;
  }, [featuredMovie, backdrop]);

  // Loading state
  if (loading && !featuredMovie) {
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

  // ==========================================
  // KIỂU 1: ĐIỆN ẢNH TOÀN CẢNH (CINEMATIC STUDIO)
  // ==========================================
  if (layoutMode === "cinematic") {
    return (
      <section
        ref={sectionRef}
        className="relative overflow-hidden transition-all duration-700"
        style={{ background: store.theme.background }}
      >
        {/* Layer 1: Nature Scenic Real Photography Ambient Blend */}
        {scene?.photoUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-screen transition-transform duration-1000"
            style={{
              backgroundImage: `url(${scene.photoUrl})`,
              transform: `scale(1.04) translate(${(mousePos.x - 50) * 0.01}%, ${(mousePos.y - 50) * 0.01}%)`,
              filter: "blur(2px)",
            }}
          />
        )}

        {/* Layer 2: Movie Backdrop with Anamorphic Fade */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out"
          style={{
            backgroundImage: backdrop ? `url(${backdrop})` : "none",
            transform: `scale(1.06) translate(${(mousePos.x - 50) * 0.015}%, ${(mousePos.y - 50) * 0.015}%)`,
            filter: "brightness(0.75)",
          }}
        >
          {/* Multi-layer gradient overlays for contrast */}
          <div
            className="absolute inset-0"
            style={{
              background: `
                linear-gradient(to right,
                  ${store.theme.background} 0%,
                  ${store.theme.background}f5 40%,
                  ${store.theme.background}b3 70%,
                  ${store.theme.background}60 100%
                ),
                linear-gradient(to top,
                  ${store.theme.background} 0%,
                  ${store.theme.background}99 30%,
                  transparent 100%
                )
              `,
            }}
          />

          {/* Mouse follow spotlight glow */}
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
            style={{
              background: `radial-gradient(800px circle at ${mousePos.x}% ${mousePos.y}%, ${store.theme.glow} 0%, transparent 65%)`,
              opacity: isVisible ? 0.35 : 0,
            }}
          />
        </div>

        {/* Layer 3: Main Panoramic Content */}
        <div className="page-shell relative py-10 sm:py-14 md:py-16 lg:py-20">
          <div
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center transition-all duration-700"
            style={{
              transform: isVisible ? "translateY(0)" : "translateY(24px)",
              opacity: isVisible ? 1 : 0,
            }}
          >
            {/* Left Column: Floating Glass Movie Card */}
            <div className="lg:col-span-8 space-y-4.5">
              {/* Theme Badge */}
              <div className="flex flex-wrap items-center gap-2">
                <div
                  className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold tracking-wide shadow-lg backdrop-blur-xl"
                  style={{
                    background: `${store.theme.primary}22`,
                    color: store.theme.primary,
                    border: `1px solid ${store.theme.primary}44`,
                  }}
                >
                  <span className="text-base">{mood.emoji}</span>
                  <span>{store.name}</span>
                  <span className="opacity-50">•</span>
                  <span className="text-[11px] font-medium tracking-normal opacity-90">{mood.subtitle}</span>
                  <span className="relative flex h-2 w-2 ml-0.5">
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

                <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
                  🎬 Kiểu 1: Điện Ảnh Toàn Cảnh
                </span>
              </div>

              {/* Movie Title */}
              <h2
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08]"
                style={{
                  color: store.theme.text,
                  textShadow: `0 4px 30px ${store.theme.glow}`,
                }}
              >
                {featuredMovie.title}
              </h2>

              {featuredMovie.originalTitle && featuredMovie.originalTitle !== featuredMovie.title && (
                <p
                  className="text-base sm:text-lg md:text-xl font-medium tracking-wide"
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
                    className="rounded-xl px-3 py-1.5 font-bold uppercase tracking-wider text-white shadow-md"
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

                {scene?.badge && (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-xl px-3 py-1.5 bg-black/40 border border-white/10 text-[11px] text-white/80 backdrop-blur-md">
                    <Sparkles size={11} style={{ color: store.theme.accent }} />
                    <span>{scene.badge}</span>
                  </span>
                )}
              </div>

              {/* Description */}
              {featuredMovie.description && (
                <p
                  className="line-clamp-3 text-sm sm:text-base leading-relaxed max-w-2xl"
                  style={{ color: store.theme.textSecondary }}
                >
                  {featuredMovie.description}
                </p>
              )}

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <Link
                  href={`/stores/${store.slug}/watch/${featuredMovie.providerSlug}`}
                  className="group relative flex items-center gap-2.5 rounded-2xl px-7 py-3.5 text-sm sm:text-base font-bold transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl overflow-hidden"
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
                  <span>Chi tiết tác phẩm</span>
                </Link>
              </div>
            </div>

            {/* Right Column: Floating 3D Poster */}
            {poster && (
              <div className="hidden lg:flex lg:col-span-4 justify-center">
                <div className="relative group">
                  <div
                    className="absolute -inset-4 rounded-3xl opacity-40 blur-2xl transition-all duration-700 group-hover:opacity-75"
                    style={{ background: store.theme.gradientAccent }}
                  />
                  <div
                    className="relative w-64 aspect-[2/3] overflow-hidden rounded-2xl border shadow-2xl transition-all duration-500 group-hover:scale-103 group-hover:-rotate-1"
                    style={{
                      borderColor: `${store.theme.primary}60`,
                      background: store.theme.surface,
                    }}
                  >
                    <img
                      src={poster}
                      alt={featuredMovie.title}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <span className="text-[11px] font-bold text-white px-2 py-0.5 rounded-md bg-black/60 border border-white/10 backdrop-blur-md">
                        PHIM TIÊU BIỂU
                      </span>
                      <span className="text-[10px] font-mono text-white/80">
                        {store.name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  // ==========================================
  // KIỂU 2: RẠP CHIẾU HOÀNG GIA 35MM (THEATER 35MM)
  // ==========================================
  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden transition-all duration-700"
      style={{ background: store.theme.background }}
    >
      {/* 35mm Top Film Sprocket Strip */}
      <div className="w-full bg-black/90 border-y border-white/15 py-1.5 overflow-hidden select-none">
        <div className="page-shell flex items-center justify-between gap-2 text-[10px] font-mono tracking-widest text-white/40">
          <div className="flex items-center gap-3">
            {[...Array(8)].map((_, i) => (
              <span key={i} className="inline-block w-3.5 h-2 rounded-[2px] bg-white/20 border border-white/20" />
            ))}
            <span className="text-white/60 font-bold">KODAK 35mm FILM • #THEXA-{store.slug.toUpperCase()}</span>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <span className="text-amber-400/80 font-bold">★ PREMIERE THEATER 35MM ★</span>
            {[...Array(8)].map((_, i) => (
              <span key={i} className="inline-block w-3.5 h-2 rounded-[2px] bg-white/20 border border-white/20" />
            ))}
          </div>
        </div>
      </div>

      {/* Stage Atmosphere Background */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out opacity-25"
        style={{
          backgroundImage: backdrop ? `url(${backdrop})` : "none",
          filter: "blur(4px)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 50% 10%, ${store.theme.glow} 0%, transparent 60%),
            linear-gradient(to bottom, ${store.theme.background} 0%, ${store.theme.background}f0 100%)
          `,
        }}
      />

      {/* Center Theater Stage */}
      <div className="page-shell relative py-8 sm:py-12 md:py-16">
        {/* Vintage Marquee Header Badge */}
        <div className="flex flex-col items-center justify-center text-center mb-8 space-y-2">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold tracking-widest uppercase border backdrop-blur-xl shadow-xl"
            style={{
              background: `linear-gradient(90deg, ${store.theme.surface} 0%, ${store.theme.primaryMuted} 50%, ${store.theme.surface} 100%)`,
              borderColor: store.theme.primary,
              color: store.theme.primary,
              boxShadow: `0 0 20px ${store.theme.glow}`,
            }}
          >
            <Star size={13} fill="currentColor" />
            <span>Rạp Chiếu Hoàng Gia 35mm • {store.name}</span>
            <Star size={13} fill="currentColor" />
          </div>
          <p className="text-xs font-mono tracking-wider" style={{ color: store.theme.textMuted }}>
            SUẤT CHIẾU ĐẶC BIỆT • DOLBY ATMOS DIGITAL SOUND • 24 FPS
          </p>
        </div>

        {/* Two-Column Theater Premiere Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: Classic VIP Ticket Stub */}
          <div className="lg:col-span-7 flex flex-col justify-between rounded-3xl p-6 sm:p-8 border-2 border-dashed relative overflow-hidden backdrop-blur-2xl shadow-2xl"
            style={{
              background: `linear-gradient(135deg, ${store.theme.surface}f0 0%, ${store.theme.background}f5 100%)`,
              borderColor: `${store.theme.primary}80`,
            }}
          >
            {/* Ticket Notches (cutout effect left & right) */}
            <div
              className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border"
              style={{ background: store.theme.background, borderColor: store.theme.border }}
            />
            <div
              className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border"
              style={{ background: store.theme.background, borderColor: store.theme.border }}
            />

            <div className="space-y-4">
              {/* Ticket Top Meta */}
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: store.theme.border }}>
                <div className="flex items-center gap-2">
                  <Ticket size={16} style={{ color: store.theme.primary }} />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: store.theme.primary }}>
                    THIÊN HÀ VIP PASS
                  </span>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/40 border border-white/10 text-white/90">
                  HÀNG GHẾ: VIP-01
                </span>
              </div>

              {/* Movie Title */}
              <div>
                <h3
                  className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight leading-tight"
                  style={{ color: store.theme.text }}
                >
                  {featuredMovie.title}
                </h3>
                {featuredMovie.originalTitle && (
                  <p className="text-sm font-medium mt-1" style={{ color: store.theme.textSecondary }}>
                    {featuredMovie.originalTitle}
                  </p>
                )}
              </div>

              {/* Ticket Details Grid */}
              <div className="grid grid-cols-3 gap-2 py-2 text-xs font-mono">
                <div className="rounded-xl p-2.5 bg-black/30 border border-white/5">
                  <span className="block text-[10px] opacity-60">NĂM CHIẾU</span>
                  <span className="font-bold text-sm" style={{ color: store.theme.primary }}>{featuredMovie.year || "2026"}</span>
                </div>
                <div className="rounded-xl p-2.5 bg-black/30 border border-white/5">
                  <span className="block text-[10px] opacity-60">ĐỊNH DẠNG</span>
                  <span className="font-bold text-sm" style={{ color: store.theme.accent }}>{featuredMovie.quality || "35mm HD"}</span>
                </div>
                <div className="rounded-xl p-2.5 bg-black/30 border border-white/5">
                  <span className="block text-[10px] opacity-60">THỂ LOẠI</span>
                  <span className="font-bold text-sm truncate" style={{ color: store.theme.secondary }}>
                    {featuredMovie.type === "series" ? "Phim Bộ" : "Phim Lẻ"}
                  </span>
                </div>
              </div>

              {/* Synopsis */}
              {featuredMovie.description && (
                <p className="line-clamp-2 text-xs sm:text-sm leading-relaxed" style={{ color: store.theme.textSecondary }}>
                  {featuredMovie.description}
                </p>
              )}
            </div>

            {/* Ticket Bottom Actions & Barcode */}
            <div className="mt-6 pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: store.theme.border }}>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Link
                  href={`/stores/${store.slug}/watch/${featuredMovie.providerSlug}`}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg"
                  style={{
                    background: store.theme.gradientAccent,
                    color: store.theme.textInverse,
                    boxShadow: `0 6px 20px ${store.theme.glow}`,
                  }}
                >
                  <Play size={14} fill="currentColor" />
                  <span>Xé Vé Vào Xem</span>
                </Link>

                <Link
                  href={`/stores/${store.slug}/movie/${featuredMovie.providerSlug}`}
                  className="flex items-center justify-center gap-1.5 rounded-xl border px-4 py-3 text-xs font-semibold transition-all hover:scale-105"
                  style={{
                    background: store.theme.surface,
                    borderColor: store.theme.border,
                    color: store.theme.text,
                  }}
                >
                  <span>Chi Tiết</span>
                  <ChevronRight size={14} />
                </Link>
              </div>

              {/* Barcode Graphic */}
              <div className="flex flex-col items-end opacity-75">
                <div className="text-[13px] font-mono tracking-widest text-white/70 select-none">
                  ||| | |||| || ||||| | |||
                </div>
                <span className="text-[9px] font-mono text-white/50">#THX-PREMIERE-VIP</span>
              </div>
            </div>
          </div>

          {/* Right: Vintage Cinema Screen Mockup */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="relative w-full max-w-md aspect-video sm:aspect-[4/3] rounded-2xl overflow-hidden border-2 shadow-2xl group"
              style={{
                borderColor: `${store.theme.primary}aa`,
                boxShadow: `0 0 40px ${store.theme.glow}`,
              }}
            >
              {/* Projector Light Beam Glow */}
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 pointer-events-none z-10"
              />
              <img
                src={backdrop || poster || ""}
                alt={featuredMovie.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />

              {/* Center Play Trailer Button */}
              <Link
                href={`/stores/${store.slug}/watch/${featuredMovie.providerSlug}`}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 group-hover:scale-105 transition-transform"
              >
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all duration-300 group-hover:scale-110"
                  style={{
                    background: store.theme.gradientAccent,
                    boxShadow: `0 0 30px ${store.theme.glow}`,
                  }}
                >
                  <Play size={24} fill="white" className="ml-1 text-white" />
                </div>
                <span className="rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white tracking-wider border border-white/20 backdrop-blur-md">
                  CHIẾU RẠP 35MM
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 35mm Bottom Film Sprocket Strip */}
      <div className="w-full bg-black/90 border-y border-white/15 py-1.5 overflow-hidden select-none">
        <div className="page-shell flex items-center justify-between gap-2 text-[10px] font-mono tracking-widest text-white/40">
          <div className="flex items-center gap-3">
            {[...Array(8)].map((_, i) => (
              <span key={i} className="inline-block w-3.5 h-2 rounded-[2px] bg-white/20 border border-white/20" />
            ))}
            <span className="text-white/60">THEATER SOUND SYSTEM 7.1</span>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <span className="text-white/50">T-HEXA CINEMA ARCHIVE</span>
            {[...Array(8)].map((_, i) => (
              <span key={i} className="inline-block w-3.5 h-2 rounded-[2px] bg-white/20 border border-white/20" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function StoreHero(props: StoreHeroProps) {
  return <StoreHeroContent key={props.store.slug} {...props} />;
}
