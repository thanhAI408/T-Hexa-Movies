"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { MobileMenu } from "@/components/layout/mobile-menu";
import { SearchCommand } from "@/components/search/search-command";

export const PRIMARY_NAV = [
  { href: "/stores", label: "Kho phim" },
  { href: "/stores/binh-minh", label: "Bình Minh 🌅" },
  { href: "/stores/ban-mai", label: "Ban Mai ☀️" },
  { href: "/stores/hoang-hon", label: "Hoàng Hôn 🌆" },
  { href: "/stores/da-nguyet", label: "Dạ Nguyệt 🌙" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#060912]/80 backdrop-blur-2xl">
      <div className="page-shell flex h-[68px] items-center gap-6">
        {/* Logo */}
        <Link
          href="/stores"
          className="relative shrink-0 transition-transform duration-300 hover:scale-105 focus-visible:outline-offset-4"
          aria-label="T-Hexa Movies — Kho phim"
        >
          <Image
            src="/logo.png"
            alt="T-Hexa"
            width={1074}
            height={637}
            priority
            className="h-[44px] w-[76px] object-contain object-left"
          />
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-1 xl:flex" aria-label="Điều hướng chính">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="header-nav-link"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Search */}
        <div className="ml-auto hidden w-full max-w-[380px] md:block">
          <Suspense fallback={<div className="h-11 rounded-full bg-white/5" />}>
            <SearchCommand />
          </Suspense>
        </div>

        {/* Mobile Menu */}
        <MobileMenu items={PRIMARY_NAV} />
      </div>
    </header>
  );
}
