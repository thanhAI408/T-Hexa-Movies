"use client";

import { Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { SearchCommand } from "@/components/search/search-command";

interface MobileMenuProps {
  items: ReadonlyArray<{ href: string; label: string }>;
}

export function MobileMenu({ items }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="flex items-center gap-1 xl:hidden">
      <button
        type="button"
        className="grid size-11 place-items-center rounded-full text-white transition hover:bg-white/8 md:hidden"
        aria-label={searchOpen ? "Đóng tìm kiếm" : "Mở tìm kiếm"}
        aria-expanded={searchOpen}
        onClick={() => setSearchOpen((value) => !value)}
      >
        {searchOpen ? <X size={20} /> : <Search size={20} />}
      </button>
      <button
        type="button"
        className="grid size-11 place-items-center rounded-full text-white transition hover:bg-white/8"
        aria-label={open ? "Đóng menu" : "Mở menu"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {searchOpen ? (
        <div className="absolute inset-x-0 top-[73px] border-b border-white/8 bg-[#090d13] p-3 md:hidden">
          <SearchCommand autoFocus />
        </div>
      ) : null}

      {open ? (
        <div className="glass-panel absolute right-3 top-[67px] w-[min(320px,calc(100vw-24px))] rounded-2xl p-3">
          <nav className="grid grid-cols-2 gap-1" aria-label="Menu di động">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-4 py-3 text-sm font-medium text-[#d3dae4] transition hover:bg-white/7 hover:text-white"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
