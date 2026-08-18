"use client";

import { LoaderCircle, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { PosterImage } from "@/components/movie/poster-image";

interface SearchSuggestion {
  id: string;
  slug: string;
  title: string;
  originalTitle: string | null;
  posterUrl: string | null;
  year: number | null;
  type: string;
}

export function SearchCommand({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const hasSearchQuery = query.trim().length >= 2;

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&limit=6`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error(`Search returned ${response.status}`);
        const payload = (await response.json()) as { items: SearchSuggestion[] };
        setItems(payload.items);
        setOpen(true);
        setActiveIndex(-1);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setItems([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function submit() {
    const active = items[activeIndex];
    if (active) {
      // Navigate to store movie page - default to binh-minh store
      router.push(`/stores/binh-minh/movie/${active.slug}`);
    } else if (query.trim()) {
      // Navigate to search results page
      router.push(`/stores/binh-minh?q=${encodeURIComponent(query.trim())}`);
    }
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="search-wrapper">
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label="Tìm phim"
          aria-controls={listboxId}
          aria-expanded={open && items.length > 0}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
          autoComplete="off"
          placeholder="Tìm tên phim, diễn viên..."
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            if (nextQuery.trim().length < 2) {
              setItems([]);
              setLoading(false);
              setOpen(false);
              setActiveIndex(-1);
            }
          }}
          onFocus={() => items.length > 0 && setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((index) => Math.min(items.length - 1, index + 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(-1, index - 1));
            } else if (event.key === "Enter") {
              event.preventDefault();
              submit();
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          className="search-input"
        />
        <Search size={18} className="search-icon" aria-hidden="true" />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {hasSearchQuery && loading ? (
            <LoaderCircle size={17} className="animate-spin text-[#38bdf8]" aria-label="Đang tìm" />
          ) : query ? (
            <button
              type="button"
              aria-label="Xóa nội dung tìm kiếm"
              className="grid size-7 place-items-center rounded-full text-white/40 transition-all hover:bg-white/10 hover:text-white"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setQuery("");
                setItems([]);
                inputRef.current?.focus();
              }}
            >
              <X size={15} />
            </button>
          ) : null}
        </div>
      </div>

      {open && hasSearchQuery ? (
        <div
          id={listboxId}
          role="listbox"
          className="glass-panel absolute inset-x-0 top-[calc(100%+12px)] z-[70] overflow-hidden rounded-2xl p-2"
        >
          {items.length ? (
            <>
              {items.map((item, index) => (
                <button
                  id={`${listboxId}-${index}`}
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-all ${
                    index === activeIndex
                      ? "bg-[#38bdf8]/15 shadow-inner"
                      : "hover:bg-white/[0.07]"
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    router.push(`/stores/binh-minh/movie/${item.slug}`);
                    setOpen(false);
                  }}
                >
                  <PosterImage
                    src={item.posterUrl}
                    alt=""
                    sizes="48px"
                    className="h-[62px] w-11 shrink-0 rounded-lg"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">
                      {item.title}
                    </span>
                    <span className="mt-1 block truncate text-xs text-white/50">
                      {[item.originalTitle, item.year].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </button>
              ))}
              <button
                type="button"
                className="mt-2 w-full rounded-xl px-3 py-2.5 text-center text-xs font-semibold text-[#38bdf8] transition-all hover:bg-white/[0.07]"
                onMouseDown={(event) => event.preventDefault()}
                onClick={submit}
              >
                Xem tất cả kết quả cho &quot;{query.trim()}&quot;
              </button>
            </>
          ) : loading ? (
            <p className="px-3 py-6 text-center text-sm text-white/50">Đang tìm trong kho phim…</p>
          ) : (
            <p className="px-3 py-6 text-center text-sm text-white/50">
              Không tìm thấy phim phù hợp.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
