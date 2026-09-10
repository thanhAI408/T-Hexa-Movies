"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Loader2 } from "lucide-react";
import { PosterImage } from "@/components/movie/poster-image";
import type { GlobalSearchResult, StoreSearchGroup } from "@/types/global-search";

function StoreResults({ initial, query, onUpdate }: { initial: StoreSearchGroup; query: string; onUpdate: (group: StoreSearchGroup) => void }) {
  const [group, setGroup] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function loadMore() {
    if (loading) return;
    setLoading(true); setError(null);
    const request = new AbortController(); controller.current = request;
    const page = (group.pagination?.currentPage || 0) + 1;
    try {
      const response = await fetch(`/api/search/all?${new URLSearchParams({ q: query, store: group.storeId, page: String(page) })}`, { signal: request.signal });
      const payload: GlobalSearchResult = await response.json();
      const next = payload.groups?.find(item => item.storeId === group.storeId);
      if (!response.ok || !next || next.status !== "available") throw new Error("Nguồn đang gián đoạn. Bạn có thể thử lại.");
      if (!request.signal.aborted) {
        const merged = { ...next, items: [...group.items, ...next.items.filter(item => !group.items.some(old => old.id === item.id))] };
        setGroup(merged); onUpdate(merged);
      }
    } catch { if (!request.signal.aborted) setError("Nguồn đang gián đoạn. Bạn có thể thử lại."); }
    finally { if (!request.signal.aborted) setLoading(false); }
  }
  return <section aria-label={`Kết quả ${group.storeName}`} className="mb-10 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-6">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-bold text-white">{group.storeName}</h2>
      <span className="text-sm text-white/55">{group.pagination ? `${group.pagination.totalItems.toLocaleString("vi-VN")} kết quả từ nguồn này` : "Chưa thể kiểm tra nguồn"}</span>
    </div>
    {group.status === "unavailable" ? <div role="status" className="text-sm text-amber-200">
      Nguồn {group.storeName} đang gián đoạn. Kết quả ở các kho khác vẫn hiển thị.
      <button type="button" disabled={loading} onClick={loadMore} className="ml-3 underline disabled:opacity-50">{loading ? "Đang thử…" : "Thử lại nguồn này"}</button>
    </div> : !group.items.length ? <p className="text-sm text-white/55">Không tìm thấy phim phù hợp tại {group.storeName}.</p> :
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {group.items.map(movie => <Link key={movie.id} href={movie.href} prefetch={false} className="group min-w-0 rounded-xl focus-visible:outline-2 focus-visible:outline-sky-400">
          <PosterImage src={movie.posterUrl} alt={movie.title} sizes="(max-width: 640px) 45vw, 180px" className="aspect-[2/3] w-full overflow-hidden rounded-xl" />
          <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-white group-hover:text-sky-300">{movie.title}</h3>
          <p className="mt-1 text-xs text-white/50">{[movie.year, movie.quality].filter(Boolean).join(" · ")}</p>
          <span className="mt-2 inline-block rounded-full bg-sky-400/10 px-2 py-1 text-xs text-sky-300">Nguồn {movie.storeName}</span>
        </Link>)}
      </div>}
    {error && <p role="alert" className="mt-4 text-sm text-amber-200">{error}</p>}
    {group.pagination && group.pagination.currentPage < group.pagination.totalPages && <button type="button" disabled={loading} onClick={loadMore}
      className="mt-5 rounded-full border border-sky-400/30 px-5 py-2 text-sm text-sky-300 disabled:opacity-50">{loading ? "Đang tải…" : `Xem thêm từ ${group.storeName}`}</button>}
  </section>;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = (searchParams.get("q") || "").trim();
  const [result, setResult] = useState<GlobalSearchResult | null>(null);
  const [error, setError] = useState<{ query: string; message: string } | null>(null);
  const [retry, setRetry] = useState(0);
  const current = result?.query === query ? result : null;
  const currentError = error?.query === query ? error.message : null;
  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    fetch(`/api/search/all?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!Array.isArray(data.groups)) throw new Error("Không thể tìm kiếm. Từ khóa tối đa 150 ký tự; hãy thử lại.");
        if (!controller.signal.aborted) setResult(data);
      }).catch(() => { if (!controller.signal.aborted) setError({ query, message: "Không thể tìm kiếm lúc này. Kiểm tra kết nối hoặc thử lại với từ khóa tối đa 150 ký tự." }); });
    return () => controller.abort();
  }, [query, retry]);
  return <div className="page-shell py-8">
    <h1 className="mb-2 text-2xl font-bold text-white">Tìm phim trong cả sáu nguồn</h1>
    <p className="mb-6 text-sm text-white/55">Bình Minh · Ban Mai · Hoàng Hôn · Dạ Nguyệt · VidSrc · VidLink. Một phim có thể xuất hiện ở nhiều nguồn để bạn lựa chọn.</p>
    <form className="mb-8 flex gap-2" onSubmit={event => {
      event.preventDefault(); const value = String(new FormData(event.currentTarget).get("q") || "").trim();
      if (value) router.push(`/tim-kiem?q=${encodeURIComponent(value)}`);
    }}>
      <input key={query} type="search" name="q" aria-label="Tên phim tìm trong sáu nguồn" maxLength={150} defaultValue={query} placeholder="Nhập tên phim bạn muốn tìm..."
        className="h-12 min-w-0 flex-1 rounded-full border border-white/15 bg-white/5 px-5 text-white outline-none focus:border-sky-400" />
      <button type="submit" className="rounded-full bg-sky-400 px-4 font-semibold text-slate-950">Tìm kiếm</button>
    </form>
    {!query ? <p className="py-12 text-center text-white/55"><Search className="mx-auto mb-3" />Nhập tên phim để xem kho nào đang có.</p> : currentError ?
      <div role="alert" className="py-10 text-center text-amber-200">{currentError}<button type="button" className="ml-3 underline" onClick={() => { setError(null); setResult(null); setRetry(value => value + 1); }}>Thử lại</button></div> : !current ?
      <p role="status" className="flex items-center justify-center gap-3 py-12 text-white/60"><Loader2 className="animate-spin" />Đang tìm “{query}” trong cả sáu nguồn…</p> : <>
        <p className="mb-5 text-sm text-white/65">Kết quả cho “{query}” · {current.groups.filter(group => group.items.length > 0).length}/{current.groups.length} nguồn có kết quả.</p>
        {current.partial && <p role="status" className="mb-5 rounded-xl border border-amber-300/20 p-3 text-sm text-amber-200">Một số nguồn đang gián đoạn; chưa thể kết luận phim không có tại những nguồn đó.</p>}
        {[...current.groups].sort((a, b) => Number(a.status === "unavailable") - Number(b.status === "unavailable")).map(group => <StoreResults key={`${query}:${retry}:${group.storeId}`} initial={group} query={query} onUpdate={updated => setResult(previous => {
          if (!previous || previous.query !== query) return previous;
          const groups = previous.groups.map(item => item.storeId === updated.storeId ? updated : item);
          return { ...previous, groups, partial: groups.some(item => item.status === "unavailable") };
        })} />)}
      </>}
  </div>;
}
export default function SearchPage() {
  return <Suspense fallback={<p className="p-10 text-center text-white/60">Đang mở tìm kiếm…</p>}><SearchContent /></Suspense>;
}
