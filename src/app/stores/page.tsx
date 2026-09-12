"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Sparkles,
  Play,
  Music2,
  Gamepad2,
  Film,
  Compass,
  ShieldCheck,
  Zap,
  Search,
  Layers,
  Flame,
  CheckCircle2,
  Star,
  Tv,
} from "lucide-react";
import { STORE_LIST } from "@/lib/stores/config";
import { StoreLogo } from "@/components/stores/store-logo";
import { StoreCard } from "@/components/stores/store-card-variants";

interface MovieThumbnail {
  title: string;
  posterUrl: string;
  year?: number | string;
}

const DEFAULT_POSTERS: Record<string, MovieThumbnail[]> = {
  "binh-minh": [
    {
      title: "Máy Bay Mất Tích 4",
      posterUrl: "https://vsmov.com/storage/images/iZu83GB1IM7VXL2X90m7iLHYUHU.jpg",
      year: 2024,
    },
    {
      title: "Trùm, Cớm & Ác Quỷ",
      posterUrl: "https://vsmov.com/storage/images/jJJQ1PPXUEchqyZ9YyWzgSNU39Z.jpg",
      year: 2023,
    },
    {
      title: "Chiến Binh TEO",
      posterUrl: "https://vsmov.com/storage/images/r1AdjOSOUBZiy9GWABVvvZHNOGY.jpg",
      year: 2024,
    },
  ],
  "ban-mai": [
    {
      title: "Hành Trình Moana",
      posterUrl: "https://image.tmdb.org/t/p/w500/lwqKqiBsGVBtQBZF9ZTunthBCyI.jpg",
      year: 2024,
    },
    {
      title: "Tay Đấm Creed II",
      posterUrl: "https://vsmov.com/storage/images/9il7qNbeYnPMYlutsVYDsj4hRyb.jpg",
      year: 2023,
    },
    {
      title: "Câu Chuyện Đồ Chơi",
      posterUrl: "https://vsmov.com/storage/images/nsfVr4QbbunUrHINN9N7JdVAMTf.jpg",
      year: 2024,
    },
  ],
  "hoang-hon": [
    {
      title: "Ma Thổi Đèn",
      posterUrl: "https://vsmov.com/storage/images/cZH8Pp45c89V1EzFlfQU94eKZiq.jpg",
      year: 2024,
    },
    {
      title: "Đối Chứng",
      posterUrl: "https://vsmov.com/storage/images/zjdyowR7sH4upiKoAnTiAhg55Iy.jpg",
      year: 2024,
    },
    {
      title: "Sủng Ái",
      posterUrl: "https://vsmov.com/storage/images/iSskYDN193CJfTbSpFfscSwZ9Sx.jpg",
      year: 2023,
    },
  ],
  "da-nguyet": [
    {
      title: "Doraemon",
      posterUrl: "https://vsmov.com/storage/images/c2oiRa7V3bQzof4wVGzLXtWJ5QU.jpg",
      year: 2024,
    },
    {
      title: "Màn Đêm Kéo Đến",
      posterUrl: "https://vsmov.com/storage/images/9uoZrTXUiByDECmWopkIJhZxSzw.jpg",
      year: 2024,
    },
    {
      title: "Gia Đình Đạo Tặc",
      posterUrl: "https://vsmov.com/storage/images/Z1JeznJExodyj0iUbL1wgkts88.jpg",
      year: 2023,
    },
  ],
};

const STORE_META: Record<
  string,
  {
    serverCode: string;
    statusText: string;
    movieCount: string;
    badgeText: string;
    tagline: string;
    shortcuts: { label: string; query: string }[];
  }
> = {
  "binh-minh": {
    serverCode: "KHO 01 • BÌNH MINH",
    statusText: "Tốc Độ Cao",
    movieCount: "19,350+ Phim",
    badgeText: "Phim Mới & Thuyết Minh",
    tagline: "Kho phim cập nhật liên tục mỗi giờ với thuyết minh chuẩn rạp.",
    shortcuts: [
      { label: "🎬 Chiếu Rạp", query: "chieu-rap" },
      { label: "📺 Phim Bộ", query: "phim-bo" },
      { label: "🎙️ Thuyết Minh", query: "thuyet-minh" },
    ],
  },
  "ban-mai": {
    serverCode: "KHO 02 • BAN MAI",
    statusText: "Máy Chủ Siêu Tốc",
    movieCount: "14,800+ Phim",
    badgeText: "Chiếu Rạp & Bom Tấn",
    tagline: "Tuyển tập bom tấn hành động Hollywood & phim chiếu rạp mới nhất.",
    shortcuts: [
      { label: "💥 Bom Tấn", query: "bom-tan" },
      { label: "🚀 Viễn Tưởng", query: "vien-tuong" },
      { label: "🍿 Chiếu Rạp", query: "chieu-rap" },
    ],
  },
  "hoang-hon": {
    serverCode: "KHO 03 • HOÀNG HÔN",
    statusText: "Trực Tuyến 24/7",
    movieCount: "16,200+ Phim",
    badgeText: "Bản HD & Phim Bộ",
    tagline: "Thiên đường phim bộ Châu Á, phim truyền hình và bản HD sắc nét.",
    shortcuts: [
      { label: "💎 Bản HD", query: "hd" },
      { label: "❤️ Tình Cảm", query: "tinh-cam" },
      { label: "⚔️ Cổ Trang", query: "co-trang" },
    ],
  },
  "da-nguyet": {
    serverCode: "KHO 04 • DẠ NGUYỆT",
    statusText: "Băng Thông Cao",
    movieCount: "22,100+ Phim",
    badgeText: "Anime & Độc Quyền",
    tagline: "Kho lưu trữ khổng lồ Anime, phim lẻ kinh điển và các tác phẩm tuyển chọn.",
    shortcuts: [
      { label: "✨ Anime", query: "anime" },
      { label: "🎬 Phim Lẻ", query: "phim-le" },
      { label: "👻 Kinh Dị", query: "kinh-di" },
    ],
  },
};

export default function StoresPage() {
  const router = useRouter();
  const [ytQuery, setYtQuery] = useState("");
  const [storePosters, setStorePosters] = useState<Record<string, MovieThumbnail[]>>(DEFAULT_POSTERS);

  // Dynamically load trending posters for each store
  useEffect(() => {
    const fetchStorePreviews = async () => {
      const slugs = ["binh-minh", "ban-mai", "hoang-hon", "da-nguyet"];
      for (const slug of slugs) {
        try {
          const res = await fetch(`/api/stores/${slug}/movies?page=1&limit=3`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.items) && data.items.length > 0) {
              const validPosters: MovieThumbnail[] = data.items
                .filter((m: { posterUrl?: string }) => Boolean(m.posterUrl))
                .slice(0, 3)
                .map((m: { title: string; posterUrl: string; year?: number }) => ({
                  title: m.title,
                  posterUrl: m.posterUrl,
                  year: m.year || "",
                }));

              if (validPosters.length > 0) {
                setStorePosters((prev) => ({ ...prev, [slug]: validPosters }));
              }
            }
          }
        } catch {
          // keep fallback posters
        }
      }
    };

    fetchStorePreviews();
  }, []);

  const handleYtSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (ytQuery.trim()) {
      router.push(`/youtube?q=${encodeURIComponent(ytQuery.trim())}`);
    } else {
      router.push("/youtube");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-white">
      {/* ========================================================================= */}
      {/* HERO SECTION: CINEMATIC MARQUEE & 35MM RETRO-MODERN HEADLINE */}
      {/* ========================================================================= */}
      <div className="relative z-10">
        <div className="page-shell relative pt-16 pb-10 sm:pt-20 sm:pb-14 text-center space-y-6">
          {/* Top Marquee Badge */}
          <div className="inline-flex items-center gap-2.5 rounded-full border border-amber-400/40 bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/20 px-5 py-2 text-xs font-bold text-amber-300 backdrop-blur-xl shadow-xl shadow-amber-950/30">
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            <Sparkles size={14} className="text-amber-300" />
            <span className="tracking-wider uppercase">T-HEXA CINEMA 35MM • KHO PHIM ĐA NGUỒN</span>
          </div>

          {/* Headline */}
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.08]">
              <span className="bg-gradient-to-r from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-transparent drop-shadow-sm">
                Chọn Kho Phim
              </span>
              <br />
              <span className="text-2xl sm:text-4xl md:text-5xl font-extralight tracking-widest text-slate-300">
                Thưởng Thức Điện Ảnh Đỉnh Cao
              </span>
            </h1>
          </div>

          {/* Subtitle */}
          <p className="mx-auto max-w-2xl text-xs sm:text-sm md:text-base text-slate-400 leading-relaxed">
            Hệ thống 4 máy chủ phát độc lập kết hợp công nghệ đèn chiếu 35mm.
            <br />
            <span className="text-amber-300 font-semibold">
              ✨ Tự động chuyển nguồn dự phòng tức thì — Trải nghiệm xem liền mạch, không gián đoạn.
            </span>
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CỤM 1: TRUNG TÂM GIẢI TRÍ YOUTUBE ĐIỆN ẢNH (CINEMA YOUTUBE HUB) */}
      {/* ========================================================================= */}
      <div className="page-shell relative z-10 mb-14">
        <div
          className="group relative overflow-hidden rounded-3xl border border-amber-500/35 bg-gradient-to-br from-[#1c1007]/90 via-[#0e0705]/95 to-[#050302]/95 p-6 sm:p-9 backdrop-blur-2xl transition-all duration-500 hover:border-amber-400/60"
          style={{
            boxShadow:
              "0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 35px -8px rgba(251, 191, 36, 0.25)",
          }}
        >
          {/* Ambient Lighting Behind Card */}
          <div className="pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full bg-amber-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 right-1/4 h-64 w-64 rounded-full bg-red-600/20 blur-3xl" />

          {/* 35mm Sprocket Strip Across Top of Hub */}
          <div className="absolute top-0 inset-x-0 flex items-center justify-between border-b border-amber-500/20 bg-black/40 px-6 py-1.5 text-[9px] font-mono text-amber-300/60 select-none">
            <span className="tracking-widest">▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪</span>
            <span className="font-bold tracking-widest uppercase text-amber-200">
              YOUTUBE ENTERTAINMENT STAGE • T-HEXA
            </span>
            <span className="tracking-widest">▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪</span>
          </div>

          <div className="relative z-10 pt-4 grid gap-8 lg:grid-cols-12 lg:items-center">
            {/* Left Content */}
            <div className="space-y-4 lg:col-span-7">
              {/* Kicker badge */}
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                <span className="flex h-5 w-7 items-center justify-center rounded-md bg-red-600 text-white shadow-md shadow-red-950/60">
                  <Play size={12} fill="currentColor" />
                </span>
                <span>YOUTUBE TRÊN T-HEXA • PHÁT KHÔNG GIÁN ĐOẠN</span>
              </div>

              {/* Title & Description */}
              <div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                  Xem & Khám Phá trên{" "}
                  <span className="bg-gradient-to-r from-red-500 via-amber-400 to-amber-200 bg-clip-text text-transparent">
                    YouTube
                  </span>
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                  Hàng triệu video âm nhạc, trailer phim chiếu rạp bom tấn, clip giải trí và
                  livestream với trải nghiệm xem mượt mà, tiện lợi.
                </p>
              </div>

              {/* DIRECT INTERACTIVE SEARCH BAR */}
              <form onSubmit={handleYtSearch} className="flex flex-col sm:flex-row gap-2 pt-1 max-w-lg">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400" />
                  <input
                    type="text"
                    value={ytQuery}
                    onChange={(e) => setYtQuery(e.target.value)}
                    placeholder="Tìm trailer, nhạc phim, video YouTube..."
                    className="w-full rounded-2xl border border-amber-500/35 bg-black/50 py-3 pl-10 pr-4 text-xs text-white placeholder-slate-400 backdrop-blur-xl transition-all focus:border-amber-400 focus:bg-black/70 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                  />
                </div>
                <button
                  type="submit"
                  className="flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-red-600 via-amber-600 to-amber-500 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-red-950/60 transition-all hover:scale-105 active:scale-95 hover:opacity-95"
                >
                  <Search size={14} />
                  <span>Tìm video</span>
                </button>
              </form>

              {/* QUICK DISCOVERY CATEGORY CHIPS */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-semibold text-slate-400 mr-1">Khám phá nhanh:</span>
                <Link
                  href="/youtube?category=10"
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-300 transition-all hover:scale-105 hover:border-amber-400 hover:bg-amber-500/25"
                >
                  <Music2 size={12} />
                  <span>Nhạc & OST Phim</span>
                </Link>
                <Link
                  href="/youtube?category=24"
                  className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold text-rose-300 transition-all hover:scale-105 hover:border-rose-400 hover:bg-rose-500/25"
                >
                  <Film size={12} />
                  <span>Trailer & Phim ngắn</span>
                </Link>
                <Link
                  href="/youtube?category=20"
                  className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-[11px] font-semibold text-purple-300 transition-all hover:scale-105 hover:border-purple-400 hover:bg-purple-500/25"
                >
                  <Gamepad2 size={12} />
                  <span>Trò Chơi</span>
                </Link>
                <Link
                  href="/youtube?mode=popular"
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300 transition-all hover:scale-105 hover:border-emerald-400 hover:bg-emerald-500/25"
                >
                  <Flame size={12} />
                  <span>Xu Hướng</span>
                </Link>
              </div>
            </div>

            {/* Right Visual Art: Interactive Equalizer Stage & Play CTA */}
            <div className="relative flex items-center justify-center lg:col-span-5 min-h-[220px]">
              <div className="relative w-full max-w-[340px] rounded-2xl border border-amber-500/30 bg-black/60 p-5 backdrop-blur-xl shadow-2xl">
                {/* Visual Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                      Rạp Chiếu Âm Nhạc
                    </span>
                  </div>
                  <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    Live 24/7
                  </span>
                </div>

                {/* Animated Equalizer Visual */}
                <div className="my-5 flex items-end justify-center gap-1.5 h-16">
                  {Array.from({ length: 18 }, (_, i) => (
                    <div
                      key={i}
                      className="w-2 rounded-t bg-gradient-to-t from-red-600 via-amber-500 to-amber-300 animate-pulse"
                      style={{
                        height: `${20 + ((i * 23) % 75)}%`,
                        animationDuration: `${0.5 + ((i * 13) % 8) * 0.1}s`,
                      }}
                    />
                  ))}
                </div>

                {/* CTA Action button */}
                <Link
                  href="/youtube"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 py-3 text-xs font-bold text-white shadow-lg transition-all hover:scale-102 hover:opacity-95"
                >
                  <Play size={14} fill="currentColor" />
                  <span>Vào Trung Tâm YouTube Ngay</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CỤM 2: 4 KHO PHIM ĐIỆN ẢNH VỚI POSTER THỰC TẾ & THƯỚC PHIM 35MM (WAO FACTOR) */}
      {/* ========================================================================= */}
      <div className="page-shell relative z-10 pb-24">
        {/* Section Header */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-white/10 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-300">
              <Film size={14} />
              <span>4 KHO PHIM 35MM • HỆ THỐNG MÁY CHỦ HỢP NHẤT</span>
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-white tracking-tight">
              Khám Phá Các Cụm Rạp T-Hexa
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md">
            Mỗi kho liên kết trực tiếp với máy chủ chuyên biệt. Nhấp vào poster để xem chi tiết hoặc
            dùng lối tắt thể loại để lọc nhanh.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* 4 KHÔNG GIAN ĐIỆN ẢNH ĐỘC BẢN - THIẾT KẾ ĐÃ BẦU CHỌN & HOÀN THIỆN */}
        {/* ========================================================================= */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border border-white/10 bg-black/50 p-4 backdrop-blur-2xl shadow-xl">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Sparkles size={16} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold uppercase tracking-wider text-amber-300 text-xs font-mono">
                  4 Cụm Rạp Điện Ảnh Độc Bản
                </span>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-mono text-emerald-400 font-bold">
                  Trực Tuyến 24/7
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Mỗi cụm rạp mang một linh hồn và vẻ đẹp thiên nhiên riêng biệt: Bình Minh rạng ngời, Ban Mai tinh khiết, Hoàng Hôn lộng lẫy, Dạ Nguyệt huyền bí.
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3 text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1 text-orange-300">🌅 Bình Minh (Biển Sớm)</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-sky-300">☀️ Ban Mai (Nắng Rừng)</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-rose-300">🌇 Hoàng Hôn (Ráng Chiều)</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-indigo-300">🌙 Dạ Nguyệt (Ngân Hà)</span>
          </div>
        </div>

        {/* 4 Store Cinema Pods */}
        <div className="grid gap-7 sm:gap-8 md:grid-cols-2 lg:grid-cols-4">
          {STORE_LIST.map((store) => {
            const themeAccents = {
              "binh-minh": {
                glow: "#EA580C",
                halo: "from-orange-500/30 via-amber-500/20 to-transparent",
                badgeBg: "bg-orange-500/15 text-orange-400 border-orange-500/40",
                borderHover: "hover:border-orange-500/70 hover:shadow-orange-950/50",
                colorText: "text-orange-400",
              },
              "ban-mai": {
                glow: "#0284C7",
                halo: "from-sky-500/30 via-cyan-500/20 to-transparent",
                badgeBg: "bg-sky-500/15 text-sky-400 border-sky-500/40",
                borderHover: "hover:border-sky-500/70 hover:shadow-sky-950/50",
                colorText: "text-sky-400",
              },
              "hoang-hon": {
                glow: "#F97316",
                halo: "from-amber-500/30 via-rose-500/20 to-transparent",
                badgeBg: "bg-amber-500/15 text-amber-400 border-amber-500/40",
                borderHover: "hover:border-amber-500/70 hover:shadow-amber-950/50",
                colorText: "text-amber-400",
              },
              "da-nguyet": {
                glow: "#818CF8",
                halo: "from-indigo-500/30 via-purple-500/20 to-transparent",
                badgeBg: "bg-indigo-500/15 text-indigo-400 border-indigo-500/40",
                borderHover: "hover:border-indigo-500/70 hover:shadow-indigo-950/50",
                colorText: "text-indigo-400",
              },
            };

            const accent =
              themeAccents[store.id as keyof typeof themeAccents] || themeAccents["hoang-hon"];
            const meta = STORE_META[store.slug] || {
              serverCode: "KHO • T-HEXA",
              statusText: "Trực Tuyến",
              movieCount: "15,000+ Phim",
              badgeText: "Chiếu Rạp & HD",
              tagline: store.description,
              shortcuts: [],
            };
            const posters = storePosters[store.slug] || DEFAULT_POSTERS[store.slug] || [];

            return (
              <StoreCard
                key={store.id}
                store={store}
                meta={meta}
                accent={accent}
                posters={posters}
              />
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* CINEMA FEATURE HIGHLIGHTS */}
        {/* ========================================================================= */}
        <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Zap,
              title: "Xem phim trực tuyến",
              desc: "Phát phim trực tiếp trên trình duyệt, hỗ trợ Full HD & 4K siêu mượt.",
              color: "text-amber-400",
            },
            {
              icon: ShieldCheck,
              title: "4 Nguồn dự phòng",
              desc: "Tự động đảo máy chủ dự phòng ngay lập tức nếu video gặp sự cố gián đoạn.",
              color: "text-emerald-400",
            },
            {
              icon: Film,
              title: "Đa dạng thể loại",
              desc: "Hàng vạn phim lẻ, phim bộ, anime, hoạt hình và chương trình giải trí tổng hợp.",
              color: "text-sky-400",
            },
            {
              icon: Compass,
              title: "Lọc phim thông minh",
              desc: "Tìm kiếm phim theo tên, diễn viên, quốc gia, năm phát hành và nguồn phát.",
              color: "text-purple-400",
            },
          ].map((feature, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3.5 rounded-2xl border border-amber-500/20 bg-[#0a0704]/70 p-5 backdrop-blur-xl transition-all duration-300 hover:bg-white/[0.06] hover:border-amber-500/50 hover:shadow-xl"
            >
              <div className={`p-2.5 rounded-xl bg-white/5 ${feature.color} shrink-0`}>
                <feature.icon size={22} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">{feature.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
