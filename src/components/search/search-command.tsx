"use client";

import { LoaderCircle, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { PosterImage } from "@/components/movie/poster-image";
import type { GlobalSearchResult } from "@/types/global-search";

export function SearchCommand({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<GlobalSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const trimmed = query.trim();
  const hasQuery = trimmed.length >= 2;
  const current = result?.query === trimmed ? result : null;
  // Two suggestions per store prevents a large catalog from hiding the others.
  const items = current?.groups.flatMap(group => group.items.slice(0, 2)) || [];
  const loading = hasQuery && !current && !error;
  const visible = open && hasQuery;
  const allHref = `/tim-kiem?q=${encodeURIComponent(trimmed)}`;

  useEffect(() => { if (autoFocus) inputRef.current?.focus(); }, [autoFocus]);
  useEffect(() => {
    if (trimmed.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search/all?q=${encodeURIComponent(trimmed)}&limit=6`, { signal: controller.signal });
        const payload = await response.json();
        if (!Array.isArray(payload.groups)) throw new Error("Không thể tìm kiếm lúc này. Hãy thử lại.");
        if (!controller.signal.aborted) setResult(payload);
      } catch {
        if (!controller.signal.aborted) setError("Không thể tìm kiếm lúc này. Hãy thử lại.");
      }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [trimmed]);

  function navigate(href: string) { setOpen(false); setActiveIndex(-1); router.push(href); }
  return <div className="relative">
    <div className="search-wrapper">
      <input ref={inputRef} type="search" role="combobox" aria-label="Tìm phim" aria-controls={visible ? listboxId : undefined}
        aria-expanded={visible} aria-autocomplete="list" aria-activedescendant={visible && activeIndex >= 0 && items[activeIndex] ? `${listboxId}-${activeIndex}` : undefined}
        autoComplete="off" maxLength={150} placeholder="Tìm tên phim trong cả 6 nguồn..." value={query}
        onChange={event => { setQuery(event.target.value); if (event.target.value.trim() !== trimmed) { setResult(null); setError(null); } setActiveIndex(-1); setOpen(true); }}
        onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
        onKeyDown={event => {
          if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActiveIndex(index => Math.min(items.length - 1, index + 1)); }
          else if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex(index => Math.max(-1, index - 1)); }
          else if (event.key === "Enter" && trimmed) { event.preventDefault(); navigate(visible && items[activeIndex] ? items[activeIndex].href : allHref); }
          else if (event.key === "Escape") { setOpen(false); setActiveIndex(-1); }
        }} className="search-input" />
      <Search size={18} className="search-icon" aria-hidden="true" />
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        {loading ? <LoaderCircle size={17} className="animate-spin text-sky-400" aria-label="Đang tìm" /> : query ?
          <button type="button" aria-label="Xóa nội dung tìm kiếm" className="p-1 text-white/60" onMouseDown={event => event.preventDefault()}
            onClick={() => { setQuery(""); setResult(null); setError(null); setOpen(false); setActiveIndex(-1); inputRef.current?.focus(); }}><X size={16} /></button> : null}
      </div>
    </div>
    {visible && <div className="glass-panel absolute inset-x-0 top-[calc(100%+12px)] z-[70] max-h-[70vh] overflow-y-auto rounded-2xl p-2">
      <p className="px-3 py-2 text-xs text-sky-300">Tìm trong Bình Minh · Ban Mai · Hoàng Hôn · Dạ Nguyệt · Tinh Tú · Ngân Hà</p>
      <div id={listboxId} role="listbox" aria-label="Phim ở các kho">
        {items.map((item, index) => <button key={item.id} id={`${listboxId}-${index}`} type="button" role="option" aria-selected={index === activeIndex}
          className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left ${index === activeIndex ? "bg-sky-400/15" : "hover:bg-white/10"}`}
          onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActiveIndex(index)} onClick={() => navigate(item.href)}>
          <PosterImage src={item.posterUrl} alt="" sizes="44px" className="h-[60px] w-11 shrink-0 rounded-lg" />
          <span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{item.title}</span>
            <span className="block text-xs text-white/50">{item.year || ""}</span><span className="text-xs font-semibold text-sky-300">Nguồn {item.storeName}</span></span>
        </button>)}
      </div>
      {loading && <p role="status" className="p-3 text-sm text-white/60">Đang tìm cả sáu nguồn…</p>}
      {error && <p role="alert" className="p-3 text-sm text-amber-200">{error}</p>}
      {current?.partial && <p className="p-3 text-xs text-amber-200">Chưa kiểm tra được: {current.groups.filter(group => group.status === "unavailable").map(group => group.storeName).join(", ")}.</p>}
      {current && !items.length && !current.partial && <p className="p-3 text-sm text-white/60">Không tìm thấy phim phù hợp trong cả sáu nguồn.</p>}
      <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => navigate(allHref)} className="w-full rounded-xl p-3 text-sm font-semibold text-sky-300 hover:bg-white/10">
        Xem tất cả kết quả cho “{trimmed}”
      </button>
    </div>}
  </div>;
}
