"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import {
  Film,
  Play,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Sparkles,
  Layers,
} from "lucide-react";

import { MobileMenu } from "@/components/layout/mobile-menu";
import { SearchCommand } from "@/components/search/search-command";
import { StoreLogo } from "@/components/stores/store-logo";

export const STORE_NAV_ITEMS = [
  {
    href: "/stores/binh-minh",
    slug: "binh-minh",
    label: "Bình Minh",
    icon: Sunrise,
    glow: "hover:text-orange-300 hover:shadow-orange-500/20",
    activeClass: "bg-orange-500/15 text-orange-300 border-orange-500/40 shadow-sm shadow-orange-500/20",
    dotColor: "bg-orange-400",
  },
  {
    href: "/stores/ban-mai",
    slug: "ban-mai",
    label: "Ban Mai",
    icon: Sun,
    glow: "hover:text-sky-300 hover:shadow-sky-500/20",
    activeClass: "bg-sky-500/15 text-sky-300 border-sky-500/40 shadow-sm shadow-sky-500/20",
    dotColor: "bg-sky-400",
  },
  {
    href: "/stores/hoang-hon",
    slug: "hoang-hon",
    label: "Hoàng Hôn",
    icon: Sunset,
    glow: "hover:text-rose-300 hover:shadow-rose-500/20",
    activeClass: "bg-rose-500/15 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-500/20",
    dotColor: "bg-rose-400",
  },
  {
    href: "/stores/da-nguyet",
    slug: "da-nguyet",
    label: "Dạ Nguyệt",
    icon: Moon,
    glow: "hover:text-indigo-300 hover:shadow-indigo-500/20",
    activeClass: "bg-indigo-500/15 text-indigo-300 border-indigo-500/40 shadow-sm shadow-indigo-500/20",
    dotColor: "bg-indigo-400",
  },
] as const;

export const PRIMARY_NAV = [
  { href: "/stores", label: "Kho phim" },
  { href: "/youtube", label: "YouTube ▶" },
  { href: "/stores/binh-minh", label: "Bình Minh" },
  { href: "/stores/ban-mai", label: "Ban Mai" },
  { href: "/stores/hoang-hon", label: "Hoàng Hôn" },
  { href: "/stores/da-nguyet", label: "Dạ Nguyệt" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  if (pathname === "/youtube" || pathname.startsWith("/youtube/")) return null;

  const isAllStoresActive = pathname === "/stores" || pathname === "/";

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#060813]/85 backdrop-blur-2xl transition-all duration-300 shadow-2xl">
      {/* Top Ambient Thin Gradient Line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

      <div className="page-shell flex h-[68px] items-center justify-between gap-4 sm:gap-6">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-5">
          <Link
            href="/stores"
            className="group relative shrink-0 transition-transform duration-300 hover:scale-105 focus-visible:outline-offset-4"
            aria-label="T-Hexa Movies — Kho phim"
          >
            <div className="relative">
              <Image
                src="/logo.png"
                alt="T-Hexa"
                width={1074}
                height={637}
                priority
                className="h-[42px] w-[74px] object-contain object-left drop-shadow-[0_2px_12px_rgba(234,88,12,0.35)]"
              />
            </div>
          </Link>

          {/* Desktop Navigation Hub */}
          <nav className="hidden items-center gap-1.5 xl:flex" aria-label="Điều hướng chính">
            {/* 1. Hub All Stores */}
            <Link
              href="/stores"
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-200 border ${
                isAllStoresActive
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20"
                  : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Film size={13} className="text-amber-400" />
              <span>Kho Phim</span>
            </Link>

            {/* 2. YouTube Portal Link */}
            <Link
              href="/youtube"
              className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3.5 py-1.5 text-xs font-bold text-red-300 transition-all duration-200 hover:bg-red-500/20 hover:border-red-400 hover:text-white"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              <span>YouTube</span>
              <Play size={10} fill="currentColor" />
            </Link>

            {/* Divider */}
            <div className="h-4 w-px bg-white/15 mx-1" />

            {/* 3. 4 Stores with Radiant Badges */}
            {STORE_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.slug}
                  href={item.href}
                  className={`group flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-200 border ${
                    isActive
                      ? item.activeClass
                      : `border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5 ${item.glow}`
                  }`}
                >
                  <StoreLogo slug={item.slug} size="sm" showGlow={false} />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className={`h-1.5 w-1.5 rounded-full ${item.dotColor} animate-pulse`} />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Search Input */}
        <div className="hidden w-full max-w-[340px] md:block">
          <Suspense fallback={<div className="h-10 rounded-full bg-white/5" />}>
            <SearchCommand />
          </Suspense>
        </div>

        {/* Mobile Menu */}
        <MobileMenu items={PRIMARY_NAV} />
      </div>
    </header>
  );
}
