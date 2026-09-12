"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Sun, Sunrise, Sunset, Moon, ChevronDown, Check, Sparkles, Film } from "lucide-react";
import { STORE_LIST, type StoreConfig } from "@/lib/stores/config";
import { StoreLogo } from "@/components/stores/store-logo";
import { prefetchStore, getLastStoreFilter } from "@/lib/stores/cache";
import { useTheme } from "./theme-provider";

interface StoreHeaderProps {
  store: StoreConfig;
}

// Theme icons helper
function ThemeIcon({ slug, className, style }: { slug: string; className?: string; style?: React.CSSProperties }) {
  const iconProps = { className, style };
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
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const { layoutMode, setLayoutMode } = useTheme();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setShowThemeMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur-2xl transition-colors duration-500"
      style={{
        backgroundColor: `${store.theme.background}e6`,
        borderColor: store.theme.border,
      }}
    >
      <div className="page-shell flex min-h-16 flex-wrap items-center justify-between gap-3 py-2">
        {/* Left: Hub Navigation & Store Info */}
        <div className="flex items-center gap-3.5">
          <Link
            href="/stores"
            className="group flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold tracking-wide border transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              color: store.theme.text,
              backgroundColor: store.theme.surface,
              borderColor: store.theme.border,
              boxShadow: store.theme.shadowSm,
            }}
          >
            <ArrowLeft
              size={16}
              className="transition-transform duration-300 group-hover:-translate-x-1"
            />
            Tất cả kho phim
          </Link>

          <div
            className="h-5 w-px opacity-30"
            style={{ backgroundColor: store.theme.textMuted }}
          />

          {/* Current Store Badge & Info */}
          <div className="flex items-center gap-2.5">
            <StoreLogo slug={store.slug} size="sm" />

            <div>
              <div className="flex items-center gap-1.5">
                <h1
                  className="text-sm sm:text-base font-bold tracking-tight"
                  style={{ color: store.theme.text }}
                >
                  {store.name}
                </h1>
              </div>
              <p className="hidden md:block text-[11px] font-medium" style={{ color: store.theme.textMuted }}>
                {store.description}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Layout Switcher & Theme Dropdown */}
        <div className="flex items-center gap-2.5">
          {/* Interactive Layout Mode Toggle: Kiểu 1 (Toàn Cảnh) vs Kiểu 2 (Rạp 35mm) */}
          <div
            className="flex items-center gap-1 p-1 rounded-2xl border backdrop-blur-xl transition-all shadow-sm"
            style={{
              backgroundColor: store.theme.surface,
              borderColor: store.theme.border,
            }}
          >
            <button
              type="button"
              onClick={() => setLayoutMode("cinematic")}
              title="Kiểu 1: Điện Ảnh Toàn Cảnh (Cinematic Floating Glass)"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                layoutMode === "cinematic"
                  ? "shadow-md scale-102"
                  : "opacity-65 hover:opacity-100"
              }`}
              style={{
                backgroundColor: layoutMode === "cinematic" ? store.theme.primary : "transparent",
                color: layoutMode === "cinematic" ? store.theme.textInverse : store.theme.text,
              }}
            >
              <Film size={13} />
              <span className="hidden md:inline">Kiểu 1: Toàn Cảnh</span>
              <span className="md:hidden">K.1</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode("theater")}
              title="Kiểu 2: Rạp Chiếu Hoàng Gia 35mm (Vintage Premiere Theater)"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                layoutMode === "theater"
                  ? "shadow-md scale-102"
                  : "opacity-65 hover:opacity-100"
              }`}
              style={{
                backgroundColor: layoutMode === "theater" ? store.theme.primary : "transparent",
                color: layoutMode === "theater" ? store.theme.textInverse : store.theme.text,
              }}
            >
              <Sparkles size={13} />
              <span className="hidden md:inline">Kiểu 2: Rạp 35mm</span>
              <span className="md:hidden">K.2</span>
            </button>
          </div>

          <div className="relative" ref={themeMenuRef}>
            <button
              type="button"
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                backgroundColor: store.theme.surface,
                borderColor: store.theme.border,
                color: store.theme.text,
                boxShadow: store.theme.shadowSm,
              }}
            >
              <ThemeIcon slug={store.slug} className="h-3.5 w-3.5" style={{ color: store.theme.primary }} />
              <span className="hidden sm:inline">Đổi Thời Gian:</span>
              <span className="font-bold" style={{ color: store.theme.primary }}>{store.name}</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${showThemeMenu ? "rotate-180" : ""}`} />
            </button>

            {/* Theme Dropdown Popover */}
            {showThemeMenu && (
              <div
                className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border p-2 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150"
                style={{
                  background: store.theme.surface,
                  borderColor: store.theme.border,
                }}
              >
                <div className="px-3 py-2 border-b mb-1" style={{ borderColor: store.theme.border }}>
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: store.theme.textMuted }}>
                    Chọn kho phim
                  </p>
                </div>

                <div className="space-y-1">
                  {STORE_LIST.map((item) => {
                    const isCurrent = item.slug === store.slug;
                    const lastFilter = getLastStoreFilter(item.slug);
                    const targetUrl = `/stores/${item.slug}${lastFilter ? `?${lastFilter}` : ""}`;

                    return (
                      <Link
                        key={item.slug}
                        href={targetUrl}
                        onMouseEnter={() => prefetchStore(item.slug)}
                        onClick={() => setShowThemeMenu(false)}
                        className="flex flex-wrap items-center justify-between gap-y-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all hover:scale-102"
                        style={{
                          background: isCurrent ? store.theme.primaryMuted : "transparent",
                          color: isCurrent ? store.theme.primary : store.theme.text,
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <StoreLogo slug={item.slug} size="sm" showGlow={false} />
                          <div>
                            <p className="font-bold">{item.name}</p>
                            <p className="text-[10px] opacity-75">{item.effects.mood}</p>
                          </div>
                        </div>
                        {isCurrent && <Check size={14} style={{ color: store.theme.primary }} />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
