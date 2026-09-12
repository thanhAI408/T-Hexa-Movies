"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Zap,
  Film,
  Sun,
  Moon,
  Sunrise,
  Sunset,
} from "lucide-react";
import { StoreLogo } from "./store-logo";
import type { StoreConfig } from "@/lib/stores/config";
import { STORE_THEMES, RealScenicHero } from "./store-scenes";

export type CardVariantIndex = 0 | 1 | 2;

export interface StoreCardProps {
  store: StoreConfig;
  meta: {
    serverCode: string;
    statusText: string;
    movieCount: string;
    badgeText: string;
    tagline: string;
    shortcuts: { label: string; query: string }[];
  };
  accent: {
    glow: string;
    halo: string;
    badgeBg: string;
    borderHover: string;
    colorText: string;
  };
  posters: {
    title: string;
    posterUrl: string;
    year?: number | string;
  }[];
  variantIndex?: CardVariantIndex;
  onChangeVariant?: (index: CardVariantIndex) => void;
}

export const VARIANT_LABELS: Record<string, [string, string, string]> = {
  "binh-minh": [
    "Hừng Đông Đỉnh Núi",
    "Ánh Dương Rực Vàng",
    "Rạng Đông Biển Sớm (Đã Chọn)",
  ],
  "ban-mai": [
    "Nắng Sớm Xuyên Rừng (Đã Chọn)",
    "Quang Nắng Đồng Nội",
    "Vòm Nắng Tươi Mới",
  ],
  "hoang-hon": [
    "Ráng Chiều Rực Lửa (Đã Chọn)",
    "Nhật Lạc Chân Trời",
    "Chiều Tà Hoàng Kim",
  ],
  "da-nguyet": [
    "Cung Trăng Bạc",
    "Trăng Rằm Tỏa Sáng",
    "Vũ Trụ Ngân Hà (Đã Chọn)",
  ],
};

// =========================================================================
// MAIN ENTRY: RENDER 4 BẢN ĐỘC NHẤT CHÍNH THỨC THEO BẦU CHỌN
// =========================================================================
export function StoreCard(props: StoreCardProps) {
  const { store } = props;

  switch (store.slug) {
    case "binh-minh":
      // Bản đã chọn: Cung Vòm Rạng Đông Biển Sớm (Arch shape + Ocean Sunrise photo)
      return <BinhMinhFinalCard {...props} />;

    case "ban-mai":
      // Bản đã chọn: Nắng Sớm Xuyên Rừng (Cinematic Cover + Forest God Rays photo)
      return <BanMaiFinalCard {...props} />;

    case "hoang-hon":
      // Bản đã chọn: Ráng Chiều Rực Lửa (Cinematic Cover + Fiery Dusk Clouds photo)
      return <HoangHonFinalCard {...props} />;

    case "da-nguyet":
      // Bản đã chọn: Cổng Vòm Ngân Hà Vô Tận (Arch shape + Milky Way Galaxy photo)
      return <DaNguyetFinalCard {...props} />;

    default:
      return <BinhMinhFinalCard {...props} />;
  }
}

// =========================================================================
// 1. KHO 01: BÌNH MINH - CUNG VÒM RẠNG ĐÔNG BIỂN SỚM (BẢN CHÍNH THỨC)
// =========================================================================
function BinhMinhFinalCard({ store, meta, posters }: StoreCardProps) {
  const scene = STORE_THEMES["binh-minh"][2]; // Rạng Đông Biển Sớm

  return (
    <div
      className="group relative flex flex-col justify-between overflow-hidden rounded-t-[48px] rounded-b-[28px] border-2 border-orange-500/40 bg-gradient-to-b from-[#240e1d] via-[#140710] to-[#0a0308] text-slate-100 transition-all duration-500 hover:-translate-y-2.5 hover:border-orange-400 hover:shadow-orange-950/60"
      style={{
        boxShadow: "0 24px 60px -15px rgba(0, 0, 0, 0.95), 0 0 45px -10px rgba(249, 115, 22, 0.3)",
      }}
    >
      {/* 1. ARCHED TOP PHOTO WINDOW (ẢNH THẬT RẠNG ĐÔNG BIỂN) */}
      <div className="relative w-full h-48 overflow-hidden rounded-t-[46px]">
        <RealScenicHero slug="binh-minh" variantIndex={2} className="h-full" />

        {/* Top Floating Badge */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5 rounded-full bg-black/65 px-3 py-1 border border-white/20 text-[10px] font-mono font-bold text-amber-200 backdrop-blur-md">
            <Sunrise size={13} className="text-orange-400 animate-pulse" />
            <span>CUNG VÒM BÌNH MINH • KHO 01</span>
          </div>
          <span className="rounded-full bg-orange-500/30 px-2 py-0.5 text-[9px] font-mono font-bold text-orange-200 border border-orange-400/40 backdrop-blur-md">
            HD 1080P
          </span>
        </div>

        {/* Store Logo Floating */}
        <div className="absolute right-4 bottom-3 z-10 transition-transform duration-500 group-hover:scale-110 drop-shadow-2xl">
          <StoreLogo slug={store.slug} size="md" />
        </div>
      </div>

      {/* 2. CARD BODY */}
      <div className="flex-1 p-5 pt-3 space-y-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              {meta.movieCount} Tác Phẩm
            </span>
            <span className="h-1 w-1 rounded-full bg-orange-500/50" />
            <span className="text-[10px] font-mono text-orange-300">
              Hừng Đông Rạng Rỡ
            </span>
          </div>

          <Link href={`/stores/${store.slug}`}>
            <h3 className="text-2xl font-black tracking-tight mt-0.5 text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-orange-200 to-rose-200 transition-colors group-hover:text-amber-200">
              {store.name}
            </h3>
          </Link>
        </div>

        {/* Status Pill & Poetic Tagline */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border bg-orange-500/20 text-orange-300 border-orange-500/40">
              🌅 Bình Minh Trên Biển
            </span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
              <CheckCircle2 size={11} />
              {meta.statusText}
            </span>
          </div>
          <p className="text-xs text-orange-100/75 line-clamp-2 leading-relaxed">
            {scene.themeDesc}
          </p>
        </div>

        {/* 3 Posters in Curved Frames */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 uppercase">
            <span>RẠP PHIM 35MM</span>
            <span className="text-orange-300/80">THUYẾT MINH CHUẨN</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {posters.map((m, idx) => (
              <Link
                key={idx}
                href={`/stores/${store.slug}`}
                className="group/p relative aspect-[2/3] overflow-hidden rounded-t-xl rounded-b-md border border-white/15 bg-black/80 shadow-md transition-all duration-300 hover:scale-106 hover:border-orange-400/60 hover:shadow-orange-950/50"
              >
                <Image
                  src={m.posterUrl}
                  alt={m.title}
                  fill
                  sizes="15vw"
                  className="object-cover transition-transform duration-500 group-hover/p:scale-110"
                  unoptimized
                />
              </Link>
            ))}
          </div>
        </div>

        {/* Shortcuts */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {meta.shortcuts.map((sc) => (
            <Link
              key={sc.label}
              href={`/stores/${store.slug}?category=${encodeURIComponent(sc.query)}`}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-orange-200 transition-all hover:border-orange-400/40 hover:bg-orange-500/20"
            >
              {sc.label}
            </Link>
          ))}
        </div>
      </div>

      {/* 3. FOOTER ACTION BUTTON */}
      <div className="p-5 pt-0">
        <Link
          href={`/stores/${store.slug}`}
          className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-rose-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-orange-600/30 transition-all hover:scale-102 hover:opacity-95"
        >
          <span>Bước Qua Cổng Vòm {store.name}</span>
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}

// =========================================================================
// 2. KHO 02: BAN MAI - NẮNG SỚM XUYÊN RỪNG (BẢN CHÍNH THỨC)
// =========================================================================
function BanMaiFinalCard({ store, meta, posters }: StoreCardProps) {
  const scene = STORE_THEMES["ban-mai"][0]; // Nắng Sớm Xuyên Rừng

  return (
    <div
      className="group relative flex flex-col justify-between overflow-hidden rounded-[34px] border border-sky-400/30 bg-gradient-to-b from-[#0a1e33] via-[#061322] to-[#030a13] text-slate-100 transition-all duration-500 hover:-translate-y-2.5 hover:border-sky-400/70 hover:shadow-sky-950/60"
      style={{
        boxShadow: "0 24px 60px -15px rgba(0, 0, 0, 0.95), 0 0 45px -10px rgba(56, 189, 248, 0.25)",
      }}
    >
      {/* 1. TOP HERO: REAL PHOTOGRAPHY (NẮNG MAI QUA RỪNG) */}
      <div className="relative w-full h-48 overflow-hidden">
        <RealScenicHero slug="ban-mai" variantIndex={0} className="h-full" />

        {/* Top Controls Over Photo */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 border border-white/15 text-[10px] font-mono font-bold text-sky-200 backdrop-blur-md">
            <Sun size={13} className="text-sky-400 animate-spin" style={{ animationDuration: "12s" }} />
            <span>KHO 02 • BAN MAI</span>
          </div>
          <span className="rounded-full bg-sky-500/30 px-2 py-0.5 text-[9px] font-mono font-bold text-sky-200 border border-sky-400/40 backdrop-blur-md">
            BOM TẤN
          </span>
        </div>

        {/* Store Logo Floating */}
        <div className="absolute right-4 bottom-3 z-10 transition-transform duration-500 group-hover:scale-110 drop-shadow-2xl">
          <StoreLogo slug={store.slug} size="md" />
        </div>
      </div>

      {/* 2. CARD CONTENT BODY */}
      <div className="flex-1 p-5 pt-3 space-y-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
              {meta.movieCount} Phim
            </span>
            <span className="h-1 w-1 rounded-full bg-sky-500/50" />
            <span className="text-[10px] font-medium font-mono text-sky-300">
              Nắng Sớm Tinh Khôi
            </span>
          </div>

          <Link href={`/stores/${store.slug}`}>
            <h3 className="text-2xl font-black tracking-tight mt-0.5 text-transparent bg-clip-text bg-gradient-to-r from-yellow-100 via-sky-200 to-white transition-colors group-hover:text-sky-200">
              {store.name}
            </h3>
          </Link>
        </div>

        {/* Status Pill & Poetic Tagline */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border bg-sky-500/20 text-sky-300 border-sky-400/40">
              ☀️ Nắng Mai Rực Rỡ
            </span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
              <CheckCircle2 size={11} />
              {meta.statusText}
            </span>
          </div>
          <p className="text-xs text-sky-100/75 line-clamp-2 leading-relaxed">
            {scene.themeDesc}
          </p>
        </div>

        {/* 3. FLUID CINEMA POSTERS */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 uppercase">
            <span>SUẤT CHIẾU NỔI BẬT</span>
            <span className="text-sky-300/80">35MM CINEMA HD</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {posters.map((m, idx) => (
              <Link
                key={idx}
                href={`/stores/${store.slug}`}
                className="group/p relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/10 bg-black/80 shadow-lg transition-all duration-300 hover:scale-106 hover:border-sky-400/60 hover:shadow-sky-950/50"
              >
                <Image
                  src={m.posterUrl}
                  alt={m.title}
                  fill
                  sizes="15vw"
                  className="object-cover transition-transform duration-500 group-hover/p:scale-110"
                  unoptimized
                />
              </Link>
            ))}
          </div>
        </div>

        {/* Shortcuts */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {meta.shortcuts.map((sc) => (
            <Link
              key={sc.label}
              href={`/stores/${store.slug}?category=${encodeURIComponent(sc.query)}`}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-sky-200 transition-all hover:border-sky-400/40 hover:bg-sky-500/20"
            >
              {sc.label}
            </Link>
          ))}
        </div>
      </div>

      {/* 4. FOOTER ACTION BUTTON */}
      <div className="p-5 pt-0">
        <Link
          href={`/stores/${store.slug}`}
          className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-500 to-amber-400 px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-sky-500/30 transition-all hover:scale-102 hover:opacity-95"
        >
          <span>Khám Phá Cụm Rạp {store.name}</span>
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}

// =========================================================================
// 3. KHO 03: HOÀNG HÔN - RÁNG CHIỀU RỰC LỬA (BẢN CHÍNH THỨC)
// =========================================================================
function HoangHonFinalCard({ store, meta, posters }: StoreCardProps) {
  const scene = STORE_THEMES["hoang-hon"][0]; // Ráng Chiều Rực Lửa

  return (
    <div
      className="group relative flex flex-col justify-between overflow-hidden rounded-[34px] border border-rose-500/30 bg-gradient-to-b from-[#260a1d] via-[#170512] to-[#0c0209] text-slate-100 transition-all duration-500 hover:-translate-y-2.5 hover:border-rose-400/70 hover:shadow-rose-950/60"
      style={{
        boxShadow: "0 24px 60px -15px rgba(0, 0, 0, 0.95), 0 0 45px -10px rgba(244, 63, 94, 0.25)",
      }}
    >
      {/* 1. TOP HERO: REAL PHOTOGRAPHY (RÁNG CHIỀU ĐỎ RỰC) */}
      <div className="relative w-full h-48 overflow-hidden">
        <RealScenicHero slug="hoang-hon" variantIndex={0} className="h-full" />

        {/* Top Controls Over Photo */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 border border-white/15 text-[10px] font-mono font-bold text-rose-200 backdrop-blur-md">
            <Sunset size={13} className="text-rose-400 animate-pulse" />
            <span>KHO 03 • HOÀNG HÔN</span>
          </div>
          <span className="rounded-full bg-rose-500/30 px-2 py-0.5 text-[9px] font-mono font-bold text-rose-200 border border-rose-400/40 backdrop-blur-md">
            PHIM BỘ
          </span>
        </div>

        {/* Store Logo Floating */}
        <div className="absolute right-4 bottom-3 z-10 transition-transform duration-500 group-hover:scale-110 drop-shadow-2xl">
          <StoreLogo slug={store.slug} size="md" />
        </div>
      </div>

      {/* 2. CARD CONTENT BODY */}
      <div className="flex-1 p-5 pt-3 space-y-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
              {meta.movieCount} Phim
            </span>
            <span className="h-1 w-1 rounded-full bg-rose-500/50" />
            <span className="text-[10px] font-medium font-mono text-rose-300">
              Ráng Chiều Lộng Lẫy
            </span>
          </div>

          <Link href={`/stores/${store.slug}`}>
            <h3 className="text-2xl font-black tracking-tight mt-0.5 text-transparent bg-clip-text bg-gradient-to-r from-rose-100 via-orange-200 to-amber-200 transition-colors group-hover:text-rose-200">
              {store.name}
            </h3>
          </Link>
        </div>

        {/* Status Pill & Poetic Tagline */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border bg-rose-500/20 text-rose-300 border-rose-500/40">
              🌇 Ráng Chiều Rực Lửa
            </span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
              <CheckCircle2 size={11} />
              {meta.statusText}
            </span>
          </div>
          <p className="text-xs text-rose-100/75 line-clamp-2 leading-relaxed">
            {scene.themeDesc}
          </p>
        </div>

        {/* 3. FLUID CINEMA POSTERS */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 uppercase">
            <span>SUẤT CHIẾU NỔI BẬT</span>
            <span className="text-rose-300/80">35MM CINEMA HD</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {posters.map((m, idx) => (
              <Link
                key={idx}
                href={`/stores/${store.slug}`}
                className="group/p relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/10 bg-black/80 shadow-lg transition-all duration-300 hover:scale-106 hover:border-rose-400/60 hover:shadow-rose-950/50"
              >
                <Image
                  src={m.posterUrl}
                  alt={m.title}
                  fill
                  sizes="15vw"
                  className="object-cover transition-transform duration-500 group-hover/p:scale-110"
                  unoptimized
                />
              </Link>
            ))}
          </div>
        </div>

        {/* Shortcuts */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {meta.shortcuts.map((sc) => (
            <Link
              key={sc.label}
              href={`/stores/${store.slug}?category=${encodeURIComponent(sc.query)}`}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-rose-200 transition-all hover:border-rose-400/40 hover:bg-rose-500/20"
            >
              {sc.label}
            </Link>
          ))}
        </div>
      </div>

      {/* 4. FOOTER ACTION BUTTON */}
      <div className="p-5 pt-0">
        <Link
          href={`/stores/${store.slug}`}
          className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-rose-600/30 transition-all hover:scale-102 hover:opacity-95"
        >
          <span>Khám Phá Cụm Rạp {store.name}</span>
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}

// =========================================================================
// 4. KHO 04: DẠ NGUYỆT - CỔNG VÒM NGÂN HÀ VÔ TẬN (BẢN CHÍNH THỨC)
// =========================================================================
function DaNguyetFinalCard({ store, meta, posters }: StoreCardProps) {
  const scene = STORE_THEMES["da-nguyet"][2]; // Vũ Trụ Ngân Hà

  return (
    <div
      className="group relative flex flex-col justify-between overflow-hidden rounded-t-[48px] rounded-b-[28px] border-2 border-indigo-400/40 bg-gradient-to-b from-[#131138] via-[#0a0823] to-[#040312] text-slate-100 transition-all duration-500 hover:-translate-y-2.5 hover:border-indigo-400 hover:shadow-indigo-950/60"
      style={{
        boxShadow: "0 24px 60px -15px rgba(0, 0, 0, 0.95), 0 0 45px -10px rgba(129, 140, 248, 0.3)",
      }}
    >
      {/* 1. ARCHED TOP PHOTO WINDOW (ẢNH THẬT DẢI NGÂN HÀ) */}
      <div className="relative w-full h-48 overflow-hidden rounded-t-[46px]">
        <RealScenicHero slug="da-nguyet" variantIndex={2} className="h-full" />

        {/* Top Floating Badge */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5 rounded-full bg-black/65 px-3 py-1 border border-white/20 text-[10px] font-mono font-bold text-indigo-200 backdrop-blur-md">
            <Moon size={13} className="text-cyan-300 animate-pulse" />
            <span>CỔNG VÒM DẠ NGUYỆT • KHO 04</span>
          </div>
          <span className="rounded-full bg-indigo-500/30 px-2 py-0.5 text-[9px] font-mono font-bold text-indigo-200 border border-indigo-400/40 backdrop-blur-md">
            ANIME
          </span>
        </div>

        {/* Store Logo Floating */}
        <div className="absolute right-4 bottom-3 z-10 transition-transform duration-500 group-hover:scale-110 drop-shadow-2xl">
          <StoreLogo slug={store.slug} size="md" />
        </div>
      </div>

      {/* 2. CARD BODY */}
      <div className="flex-1 p-5 pt-3 space-y-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              {meta.movieCount} Tác Phẩm
            </span>
            <span className="h-1 w-1 rounded-full bg-indigo-500/50" />
            <span className="text-[10px] font-mono text-indigo-300">
              Nguyệt Dạ Huyền Ảo
            </span>
          </div>

          <Link href={`/stores/${store.slug}`}>
            <h3 className="text-2xl font-black tracking-tight mt-0.5 text-transparent bg-clip-text bg-gradient-to-r from-indigo-100 via-purple-200 to-cyan-200 transition-colors group-hover:text-indigo-200">
              {store.name}
            </h3>
          </Link>
        </div>

        {/* Status Pill & Poetic Tagline */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border bg-indigo-500/20 text-indigo-300 border-indigo-400/40">
              🌙 Vũ Trụ Ngân Hà
            </span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
              <CheckCircle2 size={11} />
              {meta.statusText}
            </span>
          </div>
          <p className="text-xs text-indigo-100/75 line-clamp-2 leading-relaxed">
            {scene.themeDesc}
          </p>
        </div>

        {/* 3 Posters in Curved Frames */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 uppercase">
            <span>RẠP PHIM 35MM</span>
            <span className="text-indigo-300/80">ANIME & ĐỘC QUYỀN</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {posters.map((m, idx) => (
              <Link
                key={idx}
                href={`/stores/${store.slug}`}
                className="group/p relative aspect-[2/3] overflow-hidden rounded-t-xl rounded-b-md border border-white/15 bg-black/80 shadow-md transition-all duration-300 hover:scale-106 hover:border-indigo-400/60 hover:shadow-indigo-950/50"
              >
                <Image
                  src={m.posterUrl}
                  alt={m.title}
                  fill
                  sizes="15vw"
                  className="object-cover transition-transform duration-500 group-hover/p:scale-110"
                  unoptimized
                />
              </Link>
            ))}
          </div>
        </div>

        {/* Shortcuts */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {meta.shortcuts.map((sc) => (
            <Link
              key={sc.label}
              href={`/stores/${store.slug}?category=${encodeURIComponent(sc.query)}`}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-indigo-200 transition-all hover:border-indigo-400/40 hover:bg-indigo-500/20"
            >
              {sc.label}
            </Link>
          ))}
        </div>
      </div>

      {/* 3. FOOTER ACTION BUTTON */}
      <div className="p-5 pt-0">
        <Link
          href={`/stores/${store.slug}`}
          className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-102 hover:opacity-95"
        >
          <span>Bước Qua Cổng Vòm {store.name}</span>
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
