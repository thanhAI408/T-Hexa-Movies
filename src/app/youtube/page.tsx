'use client';
import { Suspense, useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Play, Home, Clock, History, ArrowLeft, RefreshCw, ExternalLink, Share2, X, Check, Menu } from 'lucide-react';
import { youtubeId, type YoutubeResult, type YoutubeVideo } from '@/lib/youtube/types';
import './youtube.css';

const categories = [['0', 'Tất cả'], ['10', 'Âm nhạc'], ['20', 'Trò chơi'], ['24', 'Giải trí'], ['25', 'Tin tức'], ['27', 'Học tập'], ['28', 'Công nghệ'], ['22', 'Đời sống']];
const eventName = 'thexa-youtube-library';
function subscribe(callback: () => void) { window.addEventListener('storage', callback); window.addEventListener(eventName, callback); return () => { window.removeEventListener('storage', callback); window.removeEventListener(eventName, callback); }; }
function snapshot(key: string) { try { return localStorage.getItem(key) || '[]'; } catch { return '[]'; } }
function library(raw: string): YoutubeVideo[] { try { const data = JSON.parse(raw); return Array.isArray(data) ? data.filter(item => item && typeof item.title === 'string' && typeof item.id === 'string' && /^[\w-]{11}$/.test(item.id)).slice(0, 100) : []; } catch { return []; } }
function store(key: string, videos: YoutubeVideo[]) { try { localStorage.setItem(key, JSON.stringify(videos.slice(0, 100))); window.dispatchEvent(new Event(eventName)); return true; } catch { return false; } }
function count(value?: string) { return value ? new Intl.NumberFormat('vi', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value)) : ''; }
function duration(value?: string) { const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value || ''); return match ? [match[1], match[1] ? (match[2] || '0').padStart(2, '0') : match[2] || '0', (match[3] || '0').padStart(2, '0')].filter(Boolean).join(':') : ''; }
function Card({ video, saved, onSave }: { video: YoutubeVideo; saved: boolean; onSave: () => void }) {
  return <article className="yt-card">
    <Link href={`/youtube?v=${video.id}`} className="yt-thumbnail"><Image unoptimized src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} alt={video.title} width={480} height={270} />{video.duration && <span>{duration(video.duration)}</span>}</Link>
    <div className="yt-card-info"><div className="yt-avatar" aria-hidden="true">{video.channelTitle?.charAt(0) || '▶'}</div><div className="yt-card-text"><Link href={`/youtube?v=${video.id}`}><h3>{video.title}</h3></Link>
      {video.channelId ? <Link className="yt-muted" href={`/youtube?channel=${video.channelId}`}>{video.channelTitle}</Link> : <span className="yt-muted">{video.channelTitle}</span>}
      <p className="yt-muted">{video.views ? `${count(video.views)} lượt xem · ` : ''}{video.publishedAt ? new Date(video.publishedAt).toLocaleDateString('vi-VN') : ''}</p></div>
      <button className="yt-icon" aria-label={saved ? `Bỏ lưu ${video.title}` : `Xem sau: ${video.title}`} onClick={onSave}>{saved ? <Check size={18} /> : <Clock size={18} />}</button></div>
  </article>;
}
function Comments({ id }: { id: string }) {
  const [data, setData] = useState<YoutubeResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function load(page?: string) {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/youtube?${new URLSearchParams({ mode: 'comments', id, ...(page ? { page } : {}) })}`);
      const next = await response.json(); if (!response.ok) throw new Error(next.error);
      setData(old => ({ ...next, comments: [...(old?.comments || []), ...next.comments] }));
    } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được bình luận'); } finally { setBusy(false); }
  }
  return <section className="yt-comments"><h2>Bình luận</h2><p className="yt-muted">Đọc bình luận công khai tại đây. <a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noreferrer">Viết bình luận trên YouTube ↗</a></p>
    {data?.comments?.map(comment => <article key={comment.id}><strong>{comment.author}</strong><p>{comment.text}</p><small>{comment.likes} lượt thích</small></article>)}
    {data && !data.comments?.length && <p>Chưa có bình luận.</p>}{error && <p role="alert">{error}</p>}
    {(!data || data.nextPageToken) && <button className="yt-pill" disabled={busy} onClick={() => load(data?.nextPageToken)}>{busy ? 'Đang tải…' : data ? 'Xem thêm bình luận' : 'Tải bình luận'}</button>}
  </section>;
}
function YouTubeContent() {
  const params = useSearchParams(); const router = useRouter();
  const q = params.get('q') || ''; const id = youtubeId(params.get('v') || ''); const channel = params.get('channel') || '';
  const tab = params.get('tab') || 'home'; const category = params.get('category') || '0'; const order = params.get('order') || 'relevance';
  const [menu, setMenu] = useState(false); const [notice, setNotice] = useState(''); const [refresh, setRefresh] = useState(0);
  const savedRaw = useSyncExternalStore(subscribe, () => snapshot('yt-saved'), () => '[]');
  const historyRaw = useSyncExternalStore(subscribe, () => snapshot('yt-history'), () => '[]');
  const saved = library(savedRaw); const history = library(historyRaw);
  const local = tab === 'saved' || tab === 'history';
  const query = new URLSearchParams(id ? { mode: 'video', id } : channel ? { mode: 'channel', channel } : q ? { mode: 'search', q, order } : { mode: 'popular', category }).toString();
  const [state, setState] = useState<{ key: string; data?: YoutubeResult; error?: string } | null>(null);
  const key = `${query}:${refresh}`; const current = state?.key === key ? state : null;
  const [moreBusy, setMoreBusy] = useState(false);
  useEffect(() => {
    if (local) return;
    const abort = new AbortController();
    fetch(`/api/youtube?${query}`, { signal: abort.signal }).then(async response => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      if (!abort.signal.aborted) setState({ key, data });
    }).catch(e => { if (!abort.signal.aborted) setState({ key, error: e.message || 'Không thể tải video.' }); });
    return () => abort.abort();
  }, [query, key, local]);
  useEffect(() => {
    if (local || id) return;
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') setRefresh(value => value + 1); }, 300000);
    return () => window.clearInterval(timer);
  }, [local, id]);
  const video = current?.data?.items[0];
  useEffect(() => { if (id && video?.id === id) store('yt-history', [video, ...library(snapshot('yt-history')).filter(item => item.id !== id)]); }, [id, video]);
  function toggle(video: YoutubeVideo) {
    const exists = saved.some(item => item.id === video.id);
    setNotice(store('yt-saved', exists ? saved.filter(item => item.id !== video.id) : [video, ...saved]) ? exists ? 'Đã bỏ khỏi Xem sau' : 'Đã lưu vào Xem sau trên thiết bị này' : 'Trình duyệt không cho phép lưu dữ liệu.');
  }
  async function loadMore() {
    if (!current?.data?.nextPageToken || moreBusy) return;
    setMoreBusy(true);
    try {
      const response = await fetch(`/api/youtube?${query}&page=${encodeURIComponent(current.data.nextPageToken)}`);
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setState(old => old?.key === key && old.data ? { key, data: { ...old.data, ...data, channel: old.data.channel, items: [...old.data.items, ...data.items.filter((item: YoutubeVideo) => !old.data!.items.some(prev => prev.id === item.id))] } } : old);
    } catch { setNotice('Chưa tải được trang tiếp theo. Hãy thử lại.'); } finally { setMoreBusy(false); }
  }
  const items = local ? tab === 'saved' ? saved : history : current?.data?.items || [];
  return <div className="yt-app">
    <header className="yt-header"><button className="yt-icon" aria-label="Mở danh mục" aria-expanded={menu} onClick={() => setMenu(!menu)}><Menu /></button><Link href="/youtube" className="yt-brand"><span><Play size={21} fill="white" /></span><b>YouTube</b><small>trên T-Hexa</small></Link>
      <form className="yt-search" onSubmit={e => { e.preventDefault(); const input = String(new FormData(e.currentTarget).get('q') || '').trim(); if (input) router.push(youtubeId(input) ? `/youtube?v=${youtubeId(input)}` : `/youtube?q=${encodeURIComponent(input)}`); }}>
        <input key={q} name="q" defaultValue={q} maxLength={250} aria-label="Tìm trên YouTube" placeholder="Tìm kiếm hoặc dán liên kết YouTube" /><button aria-label="Tìm video"><Search size={21} /></button></form>
      <Link className="yt-back" href="/stores"><ArrowLeft size={18} /><span>Kho phim</span></Link></header>
    <aside className={`yt-sidebar ${menu ? 'yt-open' : ''}`}><nav aria-label="Danh mục YouTube">{[[Home, 'Trang chủ', '/youtube'], [History, 'Lịch sử', '/youtube?tab=history'], [Clock, 'Xem sau', '/youtube?tab=saved']].map(([Icon, label, href]) => { const Glyph = Icon as typeof Home; return <Link key={String(href)} href={String(href)} onClick={() => setMenu(false)} className={(label === 'Lịch sử' && tab === 'history') || (label === 'Xem sau' && tab === 'saved') || (label === 'Trang chủ' && !local && !q && !id && !channel) ? 'active' : ''}><Glyph size={21} />{String(label)}</Link>; })}</nav><hr /><p>KHÁM PHÁ</p>{categories.slice(1).map(([value, title]) => <Link key={value} href={`/youtube?category=${value}`} onClick={() => setMenu(false)}>{title}</Link>)}<hr /><p className="yt-muted">Video và trình phát từ YouTube.<br />Lịch sử, Xem sau lưu trên thiết bị này.</p><a href="https://www.youtube.com" target="_blank" rel="noreferrer">Mở YouTube <ExternalLink size={14} /></a></aside>
    {menu && <button className="yt-scrim" aria-label="Đóng danh mục" onClick={() => setMenu(false)} />}
    <main className="yt-main">
      {notice && <div role="status" className="yt-notice">{notice}<button aria-label="Đóng thông báo" onClick={() => setNotice('')}><X size={16} /></button></div>}
      {id ? <div className="yt-watch"><div className="yt-player"><iframe key={id} src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`} title={video?.title || 'Trình phát YouTube'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div>
        <h1>{video?.title || 'Video YouTube'}</h1><div className="yt-watch-actions">{video?.channelId && <Link className="yt-channel-link" href={`/youtube?channel=${video.channelId}`}><span className="yt-avatar">{video.channelTitle.charAt(0)}</span>{video.channelTitle}</Link>}
          {video && <button className="yt-pill" onClick={() => toggle(video)}><Clock size={17} />{saved.some(item => item.id === id) ? 'Đã lưu' : 'Xem sau'}</button>}
          <button className="yt-pill" onClick={async () => { try { await navigator.clipboard.writeText(`${location.origin}/youtube?v=${id}`); setNotice('Đã sao chép liên kết'); } catch { setNotice('Không thể sao chép. Bạn có thể sao chép địa chỉ trên thanh trình duyệt.'); } }}><Share2 size={17} />Chia sẻ</button>
          <a className="yt-pill" href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noreferrer">Xem trên YouTube <ExternalLink size={16} /></a></div>
        {video && <details className="yt-description"><summary>{count(video.views)} {video.views ? 'lượt xem · ' : ''}{video.publishedAt ? new Date(video.publishedAt).toLocaleDateString('vi-VN') : ''} · Mô tả</summary><p>{video.description || 'Không có mô tả.'}</p></details>}
        {current?.error && <p className="yt-muted">{current.error}</p>}{current?.data && !video && <p role="status">Video không còn công khai hoặc không khả dụng. Bạn có thể kiểm tra trên YouTube.</p>}
        <Comments key={id} id={id} /></div> : <>
        {!local && !q && !channel && <div className="yt-chips">{categories.map(([value, title]) => <Link className={value === category ? 'active' : ''} href={`/youtube?category=${value}`} key={value}>{title}</Link>)}</div>}
        <div className="yt-title"><div><p className="yt-eyebrow">{local ? 'THƯ VIỆN CỦA BẠN' : channel ? 'KÊNH YOUTUBE' : 'KHÁM PHÁ YOUTUBE'}</p><h1>{local ? tab === 'saved' ? 'Xem sau' : 'Lịch sử đã mở' : q ? `Kết quả cho “${q}”` : current?.data?.channel?.title || 'Phổ biến tại Việt Nam'}</h1></div>
          {q ? <select aria-label="Sắp xếp video" value={order} onChange={e => router.push(`/youtube?q=${encodeURIComponent(q)}&order=${e.target.value}`)}><option value="relevance">Liên quan nhất</option><option value="date">Mới nhất</option><option value="viewCount">Lượt xem</option></select> : !local && <button className="yt-icon" aria-label="Tải lại danh sách" onClick={() => setRefresh(v => v + 1)}><RefreshCw size={19} /></button>}
          {tab === 'history' && history.length > 0 && <button className="yt-pill" onClick={() => { if (!store('yt-history', [])) setNotice('Không thể xóa lịch sử.'); }}>Xóa lịch sử</button>}</div>
        {channel && current?.data?.channel && <div className="yt-description"><p>{current.data.channel.description}</p><a href={`https://www.youtube.com/channel/${channel}`} target="_blank" rel="noreferrer">{count(current.data.channel.subscribers)} người đăng ký · Mở kênh / Đăng ký trên YouTube ↗</a></div>}
        {!local && !current && <div role="status" className="yt-loading">Đang lấy video từ YouTube…<div className="yt-grid">{Array.from({ length: 8 }, (_, i) => <div className="yt-skeleton" key={i} />)}</div></div>}
        {current?.error && !local && <div role="alert" className="yt-empty"><Play size={36} /><h2>Chưa tải được danh sách video</h2><p>{current.error}</p><button className="yt-pill" onClick={() => setRefresh(v => v + 1)}>Thử lại</button><a className="yt-pill" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`} target="_blank" rel="noreferrer">Tìm trên YouTube ↗</a></div>}
        <div className="yt-grid">{items.map(video => <Card key={video.id} video={video} saved={saved.some(item => item.id === video.id)} onSave={() => toggle(video)} />)}</div>
        {(local || current?.data) && !items.length && <div className="yt-empty"><h2>{local ? 'Danh sách còn trống' : 'Không tìm thấy video'}</h2><p>{local ? 'Khám phá video rồi lưu vào Xem sau để quay lại dễ dàng.' : 'Thử một từ khóa khác hoặc xem danh mục phổ biến.'}</p><Link className="yt-pill" href="/youtube">Khám phá video</Link></div>}
        {!local && current?.data?.nextPageToken && <button className="yt-pill yt-more" disabled={moreBusy} onClick={loadMore}>{moreBusy ? 'Đang tải…' : 'Xem thêm video'}</button>}
      </>}
    </main>
  </div>;
}
export default function YouTubePage() { return <Suspense fallback={<div className="p-10">Đang mở YouTube…</div>}><YouTubeContent /></Suspense>; }
