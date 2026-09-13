"use client";
import {
  Suspense,
  useEffect,
  useState,
  useSyncExternalStore,
  useRef,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Play,
  Home,
  Clock,
  History,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Share2,
  X,
  Check,
  Menu,
  PanelTop,
  SlidersHorizontal,
  ThumbsUp,
  Music2,
} from "lucide-react";
import {
  youtubeId,
  type YoutubeResult,
  type YoutubeVideo,
} from "@/lib/youtube/types";
import { useVisibleRefresh } from "@/lib/use-visible-refresh";
import { discoveryBatch } from "@/lib/youtube/discovery";
import {
  MUSIC_GENRES,
  musicGenre,
  musicOrder,
  inferMusicGenre,
  musicWatchHref,
  type MusicGenre,
} from "@/lib/youtube/music";
import {
  YoutubePlayerSlot,
  useYoutubePlayback,
} from "@/components/youtube-player";
import "./youtube.css";

const eventName = "thexa-youtube-library";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(eventName, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(eventName, callback);
  };
}
function snapshot(key: string) {
  try {
    return localStorage.getItem(key) || "[]";
  } catch {
    return "[]";
  }
}
function library(raw: string): YoutubeVideo[] {
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data)
      ? data
          .filter(
            (item) =>
              item &&
              typeof item.title === "string" &&
              typeof item.id === "string" &&
              /^[\w-]{11}$/.test(item.id),
          )
          .slice(0, 100)
      : [];
  } catch {
    return [];
  }
}
function store(key: string, videos: YoutubeVideo[]) {
  try {
    localStorage.setItem(key, JSON.stringify(videos.slice(0, 100)));
    window.dispatchEvent(new Event(eventName));
    return true;
  } catch {
    return false;
  }
}
function count(value?: string) {
  return value
    ? new Intl.NumberFormat("vi", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(Number(value))
    : "";
}
function duration(value?: string) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value || "");
  return match
    ? [
        match[1],
        match[1] ? (match[2] || "0").padStart(2, "0") : match[2] || "0",
        (match[3] || "0").padStart(2, "0"),
      ]
        .filter(Boolean)
        .join(":")
    : "";
}
function Avatar({ video }: { video: YoutubeVideo }) {
  return (
    <span className="yt-avatar">
      {video.channelThumbnail ? (
        <Image
          unoptimized
          src={video.channelThumbnail}
          alt=""
          width={36}
          height={36}
        />
      ) : (
        video.channelTitle?.charAt(0) || "▶"
      )}
    </span>
  );
}
function NextVideos({
  id,
  categoryId,
  genre,
  saved,
  onSave,
}: {
  id: string;
  categoryId?: string;
  genre?: MusicGenre;
  saved: YoutubeVideo[];
  onSave: (video: YoutubeVideo) => void;
}) {
  const [data, setData] = useState<YoutubeResult>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { setQueue } = useYoutubePlayback();
  useEffect(() => {
    if (!categoryId) return;
    const abort = new AbortController();
    fetch(
      categoryId === "10"
        ? `/api/youtube?mode=music&music=${genre || "all"}&exclude=${id}`
        : `/api/youtube?mode=popular${categoryId ? `&category=${categoryId}` : ""}`,
      { signal: abort.signal },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("unavailable");
        const result = await response.json();
        if (!abort.signal.aborted) {
          setData(result);
          setFailed(false);
          if (categoryId)
            setQueue(id, result.items, categoryId === "10" ? genre : undefined);
        }
      })
      .catch(() => {
        if (!abort.signal.aborted) setFailed(true);
      });
    return () => abort.abort();
  }, [attempt, id, categoryId, genre, setQueue]);
  return (
    <aside className="yt-next" aria-label="Video tiếp theo">
      <div className="yt-chips">
        <span className="active">Bài tiếp theo</span>
        <Link href={`/youtube?music=${genre || "all"}`}>Khám phá nhạc</Link>
      </div>
      <p className="yt-muted yt-next-caption">
        {categoryId === "10"
          ? `Tiếp tục nghe · ${musicGenre(genre).label}`
          : "Cùng danh mục với video đang xem"}
      </p>
      {data?.items
        .filter((video) => video.id !== id)
        .slice(0, 16)
        .map((video) => (
          <Card
            key={video.id}
            video={video}
            genre={genre}
            saved={saved.some((item) => item.id === video.id)}
            onSave={() => onSave(video)}
          />
        ))}
      {failed ? (
        <button
          className="yt-pill"
          onClick={() => setAttempt((value) => value + 1)}
        >
          Tải lại video tiếp theo
        </button>
      ) : (
        !data && <p role="status">Đang tải video tiếp theo…</p>
      )}
    </aside>
  );
}
function ShareDialog({ id, close }: { id: string; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const url =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/youtube?v=${id}`;
  return (
    <dialog
      ref={dialog}
      className="yt-share"
      onClose={close}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="yt-title">
        <h2>Chia sẻ video</h2>
        <button className="yt-icon" aria-label="Đóng chia sẻ" onClick={close}>
          <X />
        </button>
      </div>
      <p>Gửi video này cho bạn bè</p>
      <div className="yt-share-url">
        <input
          aria-label="Liên kết chia sẻ"
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
        />
        <button
          className="yt-pill"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
            } catch {
              dialog.current?.querySelector("input")?.select();
            }
          }}
        >
          {copied ? "Đã sao chép" : "Sao chép"}
        </button>
      </div>
      <a
        href={`https://www.youtube.com/watch?v=${id}`}
        target="_blank"
        rel="noreferrer"
        className="yt-muted"
      >
        Mở liên kết gốc trên YouTube ↗
      </a>
    </dialog>
  );
}
function Card({
  video,
  genre,
  saved,
  onSave,
}: {
  video: YoutubeVideo;
  genre?: MusicGenre;
  saved: boolean;
  onSave: () => void;
}) {
  return (
    <article className="yt-card">
      <Link href={musicWatchHref(video, genre)} className="yt-thumbnail">
        <Image
          unoptimized
          src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
          alt={video.title}
          width={480}
          height={270}
        />
        {video.duration && <span>{duration(video.duration)}</span>}
      </Link>
      <div className="yt-card-info">
        <Avatar video={video} />
        <div className="yt-card-text">
          <Link href={musicWatchHref(video, genre)}>
            <h3>{video.title}</h3>
          </Link>
          {video.channelId ? (
            <Link
              className="yt-muted"
              href={`/youtube?channel=${video.channelId}`}
            >
              {video.channelTitle}
            </Link>
          ) : (
            <span className="yt-muted">{video.channelTitle}</span>
          )}
          <p className="yt-muted">
            {video.views ? `${count(video.views)} lượt xem · ` : ""}
            {video.publishedAt
              ? new Date(video.publishedAt).toLocaleDateString("vi-VN")
              : ""}
          </p>
          <p className="yt-card-description">{video.description}</p>
        </div>
        <button
          className="yt-icon"
          aria-label={
            saved ? `Bỏ lưu ${video.title}` : `Xem sau: ${video.title}`
          }
          onClick={onSave}
        >
          {saved ? <Check size={18} /> : <Clock size={18} />}
        </button>
      </div>
    </article>
  );
}
function Comments({ id }: { id: string }) {
  const [data, setData] = useState<YoutubeResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load(page?: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/youtube?${new URLSearchParams({ mode: "comments", id, ...(page ? { page } : {}) })}`,
      );
      const next = await response.json();
      if (!response.ok) throw new Error(next.error);
      setData((old) => ({
        ...next,
        comments: [...(old?.comments || []), ...next.comments],
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được bình luận");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="yt-comments">
      <h2>Bình luận</h2>
      <p className="yt-muted">
        Đọc bình luận công khai tại đây.{" "}
        <a
          href={`https://www.youtube.com/watch?v=${id}`}
          target="_blank"
          rel="noreferrer"
        >
          Viết bình luận trên YouTube ↗
        </a>
      </p>
      {data?.comments?.map((comment) => (
        <article key={comment.id}>
          <strong>{comment.author}</strong>
          <p>{comment.text}</p>
          <small>{comment.likes} lượt thích</small>
        </article>
      ))}
      {data && !data.comments?.length && <p>Chưa có bình luận.</p>}
      {error && <p role="alert">{error}</p>}
      {(!data || data.nextPageToken) && (
        <button
          className="yt-pill"
          disabled={busy}
          onClick={() => load(data?.nextPageToken)}
        >
          {busy ? "Đang tải…" : data ? "Xem thêm bình luận" : "Tải bình luận"}
        </button>
      )}
    </section>
  );
}
function YouTubeContent() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q") || "";
  const id = youtubeId(params.get("v") || "");
  const channel = params.get("channel") || "";
  const tab = params.get("tab") || "home";
  const genre = musicGenre(params.get("music"));
  const order = musicOrder(params.get("order"));
  const [theater, setTheater] = useState(false);
  const [share, setShare] = useState(false);
  const [filters, setFilters] = useState(false);
  const filmSearch = params.get("scope") === "film";
  const videoDuration = params.get("duration") || "any";
  const [menu, setMenu] = useState(false);
  const [notice, setNotice] = useState("");
  const [refresh, setRefresh] = useState(0);
  const savedRaw = useSyncExternalStore(
    subscribe,
    () => snapshot("yt-saved"),
    () => "[]",
  );
  const historyRaw = useSyncExternalStore(
    subscribe,
    () => snapshot("yt-history"),
    () => "[]",
  );
  const saved = library(savedRaw);
  const history = library(historyRaw);
  const local = tab === "saved" || tab === "history";
  const query = new URLSearchParams(
    id
      ? { mode: "video", id }
      : channel
        ? { mode: "channel", channel }
        : filmSearch
          ? { mode: "search", category: "1", q: q || "trailer | phim ngắn", order, duration: videoDuration }
          : { mode: "music", music: genre.id, q, order, duration: videoDuration },
  ).toString();
  const filterHref = (patch: Record<string, string>) =>
    `/youtube?${new URLSearchParams({ ...(q ? { q } : {}), order, duration: videoDuration, ...(filmSearch ? {scope:"film"} : {music:genre.id}), ...patch })}`;
  const [state, setState] = useState<{
    key: string;
    data?: YoutubeResult;
    pending?: YoutubeVideo[];
    error?: string;
  } | null>(null);
  const key = `${query}:${refresh}`;
  const current = state?.key === key ? state : null;
  const [moreBusy, setMoreBusy] = useState(false);
  useEffect(() => {
    if (local) return;
    const abort = new AbortController();
    fetch(`/api/youtube?${query}`, { signal: abort.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!abort.signal.aborted) {
          if (
            new URLSearchParams(query).get("mode") === "music" &&
            !new URLSearchParams(query).get("q") &&
            new URLSearchParams(query).get("order") === "relevance"
          ) {
            const storageKey = `yt-discovery:${new URLSearchParams(query).get("music") || "all"}`;
            let previous: string[] = [];
            try {
              const value = JSON.parse(
                sessionStorage.getItem(storageKey) || "[]",
              );
              if (Array.isArray(value))
                previous = value
                  .filter((id) => typeof id === "string")
                  .slice(0, 24);
            } catch {
              /* Storage is optional. */
            }
            const batch = discoveryBatch(data.items, previous);
            try {
              sessionStorage.setItem(
                storageKey,
                JSON.stringify(batch.items.map((video) => video.id)),
              );
            } catch {
              /* Discovery also works without storage. */
            }
            setState({
              key,
              data: { ...data, items: batch.items },
              pending: batch.pending,
            });
          } else setState({ key, data });
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted)
          setState({ key, error: e.message || "Không thể tải video." });
      });
    return () => abort.abort();
  }, [query, key, local]);
  useVisibleRefresh(
    () => setRefresh((value) => value + 1),
    300000,
    !local &&
      !id &&
      !q &&
      !channel &&
      !moreBusy &&
      (current?.data?.items.length || 0) <= 24,
  );
  const video = current?.data?.items[0];
  const playbackGenre = params.has("music")
    ? genre.id
    : video
      ? inferMusicGenre(video)
      : undefined;
  useEffect(() => {
    if (id && video?.id === id)
      store("yt-history", [
        video,
        ...library(snapshot("yt-history")).filter((item) => item.id !== id),
      ]);
  }, [id, video]);
  function toggle(video: YoutubeVideo) {
    const exists = saved.some((item) => item.id === video.id);
    setNotice(
      store(
        "yt-saved",
        exists
          ? saved.filter((item) => item.id !== video.id)
          : [video, ...saved],
      )
        ? exists
          ? "Đã bỏ khỏi Xem sau"
          : "Đã lưu vào Xem sau trên thiết bị này"
        : "Trình duyệt không cho phép lưu dữ liệu.",
    );
  }
  async function loadMore() {
    if (current?.pending?.length && current.data) {
      setState({
        ...current,
        data: {
          ...current.data,
          items: [...current.data.items, ...current.pending],
        },
        pending: [],
      });
      return;
    }
    if (!current?.data?.nextPageToken || moreBusy) return;
    setMoreBusy(true);
    try {
      const response = await fetch(
        `/api/youtube?${query}&page=${encodeURIComponent(current.data.nextPageToken)}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setState((old) =>
        old?.key === key && old.data
          ? {
              key,
              data: {
                ...old.data,
                ...data,
                channel: old.data.channel,
                items: [
                  ...old.data.items,
                  ...data.items.filter(
                    (item: YoutubeVideo) =>
                      !old.data!.items.some((prev) => prev.id === item.id),
                  ),
                ],
              },
            }
          : old,
      );
    } catch {
      setNotice("Chưa tải được trang tiếp theo. Hãy thử lại.");
    } finally {
      setMoreBusy(false);
    }
  }
  const items = local
    ? tab === "saved"
      ? saved
      : history
    : current?.data?.items || [];
  return (
    <div
      className={`yt-app ${menu ? "yt-menu-expanded" : ""} ${id ? "yt-watch-page" : ""} ${theater && id ? "yt-theater" : ""}`}
    >
      <header className="yt-header">
        <button
          className="yt-icon"
          aria-label="Mở danh mục"
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          <Menu />
        </button>
        <Link href="/youtube" className="yt-brand">
          <span>
            <Play size={21} fill="white" />
          </span>
          <b>YouTube</b>
          <small>trên T-Hexa</small>
        </Link>
        <form
          className="yt-search"
          onSubmit={(e) => {
            e.preventDefault();
            const input = String(
              new FormData(e.currentTarget).get("q") || "",
            ).trim();
            if (input)
              router.push(
                youtubeId(input)
                  ? `/youtube?v=${youtubeId(input)}`
                  : `/youtube?${new URLSearchParams({ q: input, ...(filmSearch ? {scope:"film"}:{}), ...(genre.id !== "all" ? { music: genre.id } : {}) })}`,
              );
          }}
        >
          <input
            key={q}
            name="q"
            defaultValue={q}
            maxLength={150}
            aria-label="Tìm trên YouTube"
            placeholder="Tìm bài hát, ca sĩ, thể loại hoặc dán liên kết YouTube"
          />
          <button aria-label="Tìm video">
            <Search size={21} />
          </button>
        </form>
        <Link className="yt-back" href="/stores">
          <ArrowLeft size={18} />
          <span>Kho phim</span>
        </Link>
      </header>
      <aside className={`yt-sidebar ${menu ? "yt-open" : ""}`}>
        <nav aria-label="Danh mục YouTube">
          {[
            [Home, "Trang chủ", "/youtube"],
            [History, "Lịch sử", "/youtube?tab=history"],
            [Clock, "Xem sau", "/youtube?tab=saved"],
          ].map(([Icon, label, href]) => {
            const Glyph = Icon as typeof Home;
            return (
              <Link
                key={String(href)}
                href={String(href)}
                onClick={() => setMenu(false)}
                className={
                  (label === "Lịch sử" && tab === "history") ||
                  (label === "Xem sau" && tab === "saved") ||
                  (label === "Trang chủ" && !local && !q && !id && !channel)
                    ? "active"
                    : ""
                }
              >
                <Glyph size={21} />
                <span>{String(label)}</span>
              </Link>
            );
          })}
        </nav>
        <hr />
        <p>KHÁM PHÁ</p>
        {MUSIC_GENRES.slice(1).map((item) => (
          <Link
            key={item.id}
            href={`/youtube?music=${item.id}`}
            onClick={() => setMenu(false)}
          >
            <Music2 size={21} />
            <span>{item.label}</span>
          </Link>
        ))}
        <hr />
        <p className="yt-muted">
          Video và trình phát từ YouTube.
          <br />
          Lịch sử, Xem sau lưu trên thiết bị này.
        </p>
        <a href="https://www.youtube.com" target="_blank" rel="noreferrer">
          Mở YouTube <ExternalLink size={14} />
        </a>
      </aside>
      {menu && (
        <button
          className="yt-scrim"
          aria-label="Đóng danh mục"
          onClick={() => setMenu(false)}
        />
      )}
      <main className="yt-main">
        {notice && (
          <div role="status" className="yt-notice">
            {notice}
            <button aria-label="Đóng thông báo" onClick={() => setNotice("")}>
              <X size={16} />
            </button>
          </div>
        )}
        {id ? (
          <div className="yt-watch-layout">
            <div className="yt-watch">
              <YoutubePlayerSlot
                id={id}
                genre={params.has("music") ? genre.id : undefined}
              />
              <h1>{video?.title || "Video YouTube"}</h1>
              <div className="yt-watch-actions">
                {video?.channelId && (
                  <Link
                    className="yt-channel-link"
                    href={`/youtube?channel=${video.channelId}`}
                  >
                    <Avatar video={video} />
                    {video.channelTitle}
                  </Link>
                )}
                {video && (
                  <button className="yt-pill" onClick={() => toggle(video)}>
                    <Clock size={17} />
                    {saved.some((item) => item.id === id)
                      ? "Đã lưu"
                      : "Xem sau"}
                  </button>
                )}
                <button className="yt-pill" onClick={() => setShare(true)}>
                  <Share2 size={17} />
                  Chia sẻ
                </button>
                <button
                  className="yt-pill"
                  aria-pressed={theater}
                  onClick={() => setTheater((value) => !value)}
                >
                  <PanelTop size={17} />
                  {theater ? "Chế độ mặc định" : "Chế độ rạp hát"}
                </button>
                <a
                  className="yt-pill"
                  href={`https://www.youtube.com/watch?v=${id}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Thích video bằng tài khoản YouTube"
                >
                  <ThumbsUp size={17} />
                  Thích trên YouTube ↗
                </a>
                <a
                  className="yt-pill"
                  href={`https://www.youtube.com/watch?v=${id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Xem trên YouTube <ExternalLink size={16} />
                </a>
              </div>
              {video && (
                <details className="yt-description">
                  <summary>
                    {count(video.views)} {video.views ? "lượt xem · " : ""}
                    {video.publishedAt
                      ? new Date(video.publishedAt).toLocaleDateString("vi-VN")
                      : ""}{" "}
                    · Mô tả
                  </summary>
                  <p>{video.description || "Không có mô tả."}</p>
                </details>
              )}
              {current?.error && <p className="yt-muted">{current.error}</p>}
              {current?.data && !video && (
                <p role="status">
                  Video không còn công khai hoặc không khả dụng. Bạn có thể kiểm
                  tra trên YouTube.
                </p>
              )}
              <Comments key={id} id={id} />
            </div>
            <NextVideos
              key={`${id}:${video?.categoryId || "pending"}:${playbackGenre || ""}`}
              id={id}
              categoryId={video?.categoryId}
              genre={playbackGenre}
              saved={saved}
              onSave={toggle}
            />
          </div>
        ) : (
          <>
            {!local && !channel && !filmSearch && (
              <nav className="yt-chips" aria-label="Thể loại nhạc">
                {MUSIC_GENRES.map((item) => (
                  <Link
                    className={item.id === genre.id ? "active" : ""}
                    aria-current={item.id === genre.id ? "page" : undefined}
                    href={filterHref({ music: item.id })}
                    key={item.id}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            )}
            <div className="yt-title">
              <div>
                <p className="yt-eyebrow">
                  {local
                    ? "THƯ VIỆN CỦA BẠN"
                    : channel
                      ? "KÊNH YOUTUBE"
                      : "KHÁM PHÁ YOUTUBE"}
                </p>
                <h1>
                  {local
                    ? tab === "saved"
                      ? "Xem sau"
                      : "Lịch sử đã mở"
                    : q
                      ? `Kết quả cho “${q}”`
                      : current?.data?.channel?.title ||
                        (genre.id === "all"
                          ? "Nhạc dành cho bạn"
                          : genre.label)}
                </h1>
              </div>
              {!local && !channel && (
                <div className="yt-music-filters">
                  <select
                    aria-label="Sắp xếp video"
                    value={order}
                    onChange={(e) =>
                      router.push(filterHref({ order: e.target.value }))
                    }
                  >
                    <option value="relevance">
                      {q ? "Liên quan nhất" : "Đề xuất"}
                    </option>
                    <option value="hot">Đang hot</option>
                    <option value="viewCount">Lượt xem cao nhất</option>
                    <option value="date">Mới nhất</option>
                  </select>
                  <button
                    className="yt-pill"
                    aria-expanded={filters}
                    onClick={() => setFilters((value) => !value)}
                  >
                    <SlidersHorizontal size={18} />
                    Bộ lọc
                  </button>
                  <button
                    className="yt-icon"
                    aria-label="Tải lại danh sách"
                    onClick={() => setRefresh((v) => v + 1)}
                  >
                    <RefreshCw size={19} />
                  </button>
                </div>
              )}
              {tab === "history" && history.length > 0 && (
                <button
                  className="yt-pill"
                  onClick={() => {
                    if (!store("yt-history", []))
                      setNotice("Không thể xóa lịch sử.");
                  }}
                >
                  Xóa lịch sử
                </button>
              )}
            </div>
            {!local && !channel && filters && (
              <div className="yt-filter-panel">
                <label>
                  Thời lượng
                  <select
                    aria-label="Thời lượng video"
                    value={videoDuration}
                    onChange={(event) =>
                      router.push(filterHref({ duration: event.target.value }))
                    }
                  >
                    <option value="any">Mọi thời lượng</option>
                    <option value="short">Dưới 4 phút</option>
                    <option value="medium">4–20 phút</option>
                    <option value="long">Trên 20 phút</option>
                  </select>
                </label>
                <p className="yt-muted">
                  Lọc trong thể loại đang chọn. Bản dài phù hợp cho học tập và
                  làm việc.
                </p>
              </div>
            )}
            {!local && !channel && !filmSearch && (
              <p className="yt-music-caption">
                {order === "hot"
                  ? "Đang hot: ưu tiên lượt xem theo tuổi video trong kết quả. Với thể loại hoặc từ khóa, tìm trong 90 ngày gần đây."
                  : order === "viewCount"
                    ? "Sắp xếp theo tổng lượt xem trong kết quả; mỗi trang lấy từ YouTube."
                    : "Chọn một dòng nhạc, tìm bài hát hoặc ca sĩ bạn thích. Bài tiếp theo ưu tiên cùng dòng nhạc."}
              </p>
            )}
            {channel && current?.data?.channel && (
              <section className="yt-channel-profile">
                {current.data.channel.banner && (
                  <Image
                    unoptimized
                    className="yt-channel-banner"
                    src={current.data.channel.banner}
                    alt="Ảnh bìa kênh"
                    width={1200}
                    height={200}
                  />
                )}
                <div className="yt-channel-heading">
                  {current.data.channel.thumbnail && (
                    <Image
                      unoptimized
                      src={current.data.channel.thumbnail}
                      alt=""
                      width={150}
                      height={150}
                    />
                  )}
                  <div>
                    <h2>{current.data.channel.title}</h2>
                    <p className="yt-muted">
                      {count(current.data.channel.subscribers)} người đăng ký ·{" "}
                      {count(current.data.channel.videoCount)} video
                    </p>
                    <details>
                      <summary>Giới thiệu kênh</summary>
                      <p>{current.data.channel.description}</p>
                    </details>
                    <a
                      className="yt-pill yt-subscribe"
                      href={`https://www.youtube.com/channel/${channel}?sub_confirmation=1`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Đăng ký trên YouTube ↗
                    </a>
                  </div>
                </div>
                <div className="yt-channel-tabs">
                  <span>Video</span>
                  <a
                    href={`https://www.youtube.com/channel/${channel}/playlists`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Danh sách phát ↗
                  </a>
                </div>
              </section>
            )}
            {local && (
              <p className="yt-library-summary">
                {items.length} video · Lưu trên thiết bị này
              </p>
            )}
            {!local && !current && (
              <div role="status" className="yt-loading">
                Đang lấy video từ YouTube…
                <div className="yt-grid">
                  {Array.from({ length: 8 }, (_, i) => (
                    <div className="yt-skeleton" key={i} />
                  ))}
                </div>
              </div>
            )}
            {current?.error && !local && (
              <div role="alert" className="yt-empty">
                <Play size={36} />
                <h2>Chưa tải được danh sách video</h2>
                <p>{current.error}</p>
                <button
                  className="yt-pill"
                  onClick={() => setRefresh((v) => v + 1)}
                >
                  Thử lại
                </button>
                <a
                  className="yt-pill"
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Tìm trên YouTube ↗
                </a>
              </div>
            )}
            <div className={`yt-grid ${q || local ? "yt-results-list" : ""}`}>
              {items.map((video) => (
                <Card
                  key={video.id}
                  video={video}
                  genre={!local && !channel && !filmSearch ? genre.id : undefined}
                  saved={saved.some((item) => item.id === video.id)}
                  onSave={() => toggle(video)}
                />
              ))}
            </div>
            {(local || current?.data) && !items.length && (
              <div className="yt-empty">
                <h2>
                  {local ? "Danh sách còn trống" : "Không tìm thấy video"}
                </h2>
                <p>
                  {local
                    ? "Khám phá video rồi lưu vào Xem sau để quay lại dễ dàng."
                    : "Thử một từ khóa khác hoặc xem danh mục phổ biến."}
                </p>
                <Link className="yt-pill" href="/youtube">
                  Khám phá video
                </Link>
              </div>
            )}
            {!local &&
              (current?.data?.nextPageToken || !!current?.pending?.length) && (
                <button
                  className="yt-pill yt-more"
                  disabled={moreBusy}
                  onClick={loadMore}
                >
                  {moreBusy ? "Đang tải…" : "Xem thêm video"}
                </button>
              )}
          </>
        )}
      </main>
      {id && share && (
        <ShareDialog key={id} id={id} close={() => setShare(false)} />
      )}
    </div>
  );
}
export default function YouTubePage() {
  return (
    <Suspense fallback={<div className="p-10">Đang mở YouTube…</div>}>
      <YouTubeContent />
    </Suspense>
  );
}
