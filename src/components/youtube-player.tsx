'use client';

import { createContext, useContext, useCallback, useEffect, useLayoutEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { YoutubeVideo } from '@/lib/youtube/types';

type Player = { playVideo(): void; pauseVideo(): void; destroy(): void; getCurrentTime(): number; getPlayerState(): number; loadVideoById(value: { videoId: string; startSeconds?: number }): void };
type API = { Player: new (element: HTMLElement, options: { events: { onReady(): void; onStateChange(event: { data: number }): void; onError(): void; onAutoplayBlocked(): void } }) => Player };
declare global { interface Window { YT?: API; onYouTubeIframeAPIReady?: () => void } }
let apiPromise: Promise<API> | undefined;
function loadAPI() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  return apiPromise ??= new Promise<API>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { previous?.(); if (window.YT) resolve(window.YT); };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => { apiPromise = undefined; script.remove(); reject(new Error('API unavailable')); };
    document.head.append(script);
  });
}
type Playback = { open(id: string): void; minimize(): void; setQueue(id: string, items: YoutubeVideo[]): void };
const Context = createContext<Playback | null>(null);
export function useYoutubePlayback() { const context = useContext(Context); if (!context) throw new Error('Missing YouTube provider'); return context; }

export function YoutubePlaybackProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname(); const router = useRouter();
  const [id, setId] = useState(''); const [mini, setMini] = useState(false);
  const [message, setMessage] = useState(''); const [autoplay, setAutoplay] = useState(true);
  const [bounds, setBounds] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const surface = useRef<HTMLElement>(null);
  const iframe = useRef<HTMLDivElement>(null); const player = useRef<Player | null>(null);
  const ready = useRef(false);
  const hasVideo = Boolean(id);
  const queue = useRef<{ id: string; items: YoutubeVideo[] }>({ id: '', items: [] });
  const visited = useRef(new Set<string>()); const currentId = useRef('');
  const open = useCallback((next: string) => {
    if (currentId.current !== next) { currentId.current = next; visited.current.add(next); setId(next); setMessage(''); }
    setMini(false);
  }, []);
  const setQueue = useCallback((source: string, items: YoutubeVideo[]) => { queue.current = { id: source, items }; }, []);
  const advance = useEffectEvent(() => {
    if (!autoplay || queue.current.id !== id) return;
    const next = queue.current.items.find(video => video.id !== id && !visited.current.has(video.id));
    if (!next) { setMessage('Chưa có video tiếp theo cùng chủ đề.'); return; }
    currentId.current = next.id; visited.current.add(next.id); setId(next.id); setMessage('');
    if (pathname === '/youtube' && !mini) router.replace(`/youtube?v=${next.id}`);
  });
  // Fetch independently of the page so the queue also continues in the mini player.
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    (async () => {
      const response = await fetch(`/api/youtube?mode=video&id=${id}`, { signal: controller.signal });
      if (!response.ok) return;
      const video: YoutubeVideo | undefined = (await response.json()).items?.[0];
      if (!video?.categoryId) return;
      const next = await fetch(`/api/youtube?mode=popular&category=${video.categoryId}`, { signal: controller.signal });
      if (next.ok) setQueue(id, (await next.json()).items.filter((item: YoutubeVideo) => item.id !== id));
    })().catch(() => { /* The current video remains playable if recommendations fail. */ });
    return () => controller.abort();
  }, [id, setQueue]);
  const floating = mini || pathname !== '/youtube' || !bounds.width;
  useLayoutEffect(() => {
    if (!id) return;
    let frame = 0;
    const measure = () => {
      const slot = document.querySelector('[data-youtube-slot]');
      const rect = slot?.getBoundingClientRect();
      if (rect && !mini && pathname === '/youtube' && surface.current) {
        Object.assign(surface.current.style, { top: `${rect.top + window.scrollY}px`, left: `${rect.left + window.scrollX}px`, width: `${rect.width}px`, height: `${rect.height}px` });
      }
      setBounds(old => {
        const next = rect ? { top: rect.top + window.scrollY, left: rect.left + window.scrollX, width: rect.width, height: rect.height } : { top: 0, left: 0, width: 0, height: 0 };
        return JSON.stringify(old) === JSON.stringify(next) ? old : next;
      });
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const resize = new ResizeObserver(schedule);
    resize.observe(document.body);
    const mutations = new MutationObserver(measure);
    const main = document.querySelector('main');
    if (main) mutations.observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', measure, { passive: true });
    measure();
    return () => { cancelAnimationFrame(frame); resize.disconnect(); mutations.disconnect(); window.removeEventListener('resize', schedule); window.removeEventListener('scroll', measure); };
  }, [id, mini, pathname]);
  useEffect(() => {
    if (!hasVideo || !iframe.current) return;
    const initialId = currentId.current;
    let disposed = false;
    let bufferingTimer = 0;
    let recovered = false;
    const element = document.createElement('iframe');
    element.src = `https://www.youtube-nocookie.com/embed/${initialId}?rel=0&autoplay=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
    element.title = 'Trình phát YouTube';
    element.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    element.referrerPolicy = 'strict-origin-when-cross-origin';
    element.allowFullscreen = true;
    element.style.cssText = 'width:100%;height:100%;min-height:200px;border:0;display:block;background:#000';
    iframe.current.replaceChildren(element);
    loadAPI().then(api => {
      if (disposed) return;
      player.current = new api.Player(element, { events: {
        onReady: () => { ready.current = true; if (currentId.current !== initialId) player.current?.loadVideoById({ videoId: currentId.current }); else player.current?.playVideo(); },
        onStateChange: event => {
          window.clearTimeout(bufferingTimer);
          if (event.data === 0) advance();
          if (event.data === 1) setMessage('');
          if (event.data === 3) bufferingTimer = window.setTimeout(() => {
            const instance = player.current;
            if (!instance || instance.getPlayerState() !== 3) return;
            setMessage('Video đang tải lâu. Đang thử kết nối lại tại vị trí đang xem.');
            if (!recovered) { recovered = true; instance.loadVideoById({ videoId: currentId.current, startSeconds: instance.getCurrentTime() }); }
            else setMessage('Kết nối video vẫn gián đoạn. Bạn có thể bấm Thử lại.');
          }, 15000);
        },
        onError: () => setMessage('YouTube không phát được video này. Bạn có thể thử lại hoặc mở trên YouTube.'),
        onAutoplayBlocked: () => setMessage('Trình duyệt yêu cầu bạn bấm Phát để bật video.'),
      } });
    }).catch(() => { if (!disposed) setMessage('Chưa kết nối được điều khiển YouTube. Bạn vẫn có thể dùng nút phát trong video.'); });
    return () => { disposed = true; window.clearTimeout(bufferingTimer); player.current?.destroy(); player.current = null; ready.current = false; };
  }, [hasVideo]);
  useEffect(() => { if (id && ready.current) player.current?.loadVideoById({ videoId: id }); }, [id]);
  useEffect(() => {
    if (pathname.includes('/watch/') || pathname.startsWith('/xem/')) player.current?.pauseVideo();
  }, [pathname]);
  // Starting a movie must not compete with YouTube audio.
  useEffect(() => {
    const pause = (event: Event) => { if (event.target instanceof HTMLVideoElement) player.current?.pauseVideo(); };
    document.addEventListener('play', pause, true);
    return () => document.removeEventListener('play', pause, true);
  }, []);
  return <Context.Provider value={{ open, minimize: () => setMini(true), setQueue }}>{children}
    {id && <section ref={surface} aria-label="Trình phát YouTube" data-youtube-player data-video-id={id} className="youtube-persistent" style={floating ? { position: 'fixed', right: 16, bottom: 16, width: 'min(380px, calc(100vw - 32px))', zIndex: 70 } : { position: 'absolute', ...bounds, zIndex: 30 }}>
      <div ref={iframe} style={{ width: '100%', height: floating ? 214 : '100%', minHeight: 200 }} />
      <div className="youtube-controls">
        <button onClick={() => player.current?.playVideo()}>Phát</button>
        <label><input type="checkbox" checked={autoplay} onChange={event => setAutoplay(event.target.checked)} /> Tự chuyển tiếp</label>
        <button onClick={() => { if (floating) { setMini(false); router.push(`/youtube?v=${id}`); } else setMini(true); }}>{floating ? 'Mở rộng' : 'Thu nhỏ'}</button>
        <button aria-label="Đóng video YouTube" onClick={() => { setId(''); currentId.current = ''; }}>×</button>
      </div>
      {message && <div className="youtube-controls" role="status">{message}<button onClick={() => player.current?.loadVideoById({ videoId: id, startSeconds: player.current.getCurrentTime() })}>Thử lại</button></div>}
    </section>}
  </Context.Provider>;
}

export function YoutubePlayerSlot({ id }: { id: string }) {
  const { open } = useYoutubePlayback();
  useEffect(() => { open(id); }, [id, open]);
  return <div className="yt-player" data-youtube-slot style={{ marginBottom: 110 }} />;
}
