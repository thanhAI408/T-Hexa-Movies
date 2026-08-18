"use client";

import Link from "next/link";
import { ArrowLeft, Sun, Sunrise, Sunset, Moon } from "lucide-react";
import type { StoreConfig } from "@/lib/stores/config";

interface StoreHeaderProps {
  store: StoreConfig;
}

// Theme icons
function ThemeIcon({ slug, className }: { slug: string; className?: string }) {
  const iconProps = { className };
  switch (slug) {
    case "binh-minh":
      return <Sunrise {...iconProps} />;
    case "ban-mai":
      return <Sun {...iconProps} />;
    case "hoang-hon":
      return <Sunset {...iconProps} />;
    case "da-nguyet":
      return <Moon {...iconProps} />;
    default:
      return <Sun {...iconProps} />;
  }
}

export function StoreHeader({ store }: StoreHeaderProps) {
  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-xl transition-all duration-500"
      style={{
        backgroundColor: `${store.theme.background}f0`,
        borderColor: `${store.theme.border}`,
      }}
    >
      <div className="page-shell flex h-16 items-center justify-between">
        {/* Left: Navigation */}
        <div className="flex items-center gap-4">
          <Link
            href="/stores"
            className="group flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300"
            style={{
              color: store.theme.textSecondary,
              backgroundColor: `${store.theme.primaryMuted}`,
            }}
          >
            <ArrowLeft
              size={18}
              className="transition-transform duration-300 group-hover:-translate-x-1"
            />
            <span>4 Thời Gian</span>
          </Link>

          <div
            className="h-6 w-px"
            style={{ backgroundColor: `${store.theme.border}` }}
          />

          {/* Store Info */}
          <div className="flex items-center gap-3">
            <div
              className="relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-500"
              style={{
                background: store.theme.gradientAccent,
                boxShadow: `0 4px 20px ${store.theme.glow}`,
              }}
            >
              <ThemeIcon slug={store.slug} className="h-5 w-5 text-white" />
            </div>

            <div>
              <h1
                className="text-lg font-bold tracking-tight"
                style={{ color: store.theme.text }}
              >
                {store.name}
              </h1>
              <p className="text-xs" style={{ color: store.theme.textMuted }}>
                {store.effects.mood}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Quick Links */}
        <div className="flex items-center gap-2">
          {/* Theme indicator */}
          <div
            className="hidden items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium md:flex"
            style={{
              background: `${store.theme.primaryMuted}`,
              color: store.theme.primary,
            }}
          >
            <ThemeIcon slug={store.slug} className="h-4 w-4" />
            <span>{store.name}</span>
          </div>

          <Link
            href="/stores"
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300 hover:scale-105"
            style={{
              color: store.theme.textSecondary,
              backgroundColor: store.theme.surface,
              border: `1px solid ${store.theme.border}`,
            }}
          >
            <span>Khám phá</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
