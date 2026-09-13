"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LIBRARY_KEY,
  PREFERENCES_KEY,
  parseLibrary,
  readLocal,
  subscribeLocal,
  setPreference,
  updateMovie,
  type MovieIdentity,
} from "@/lib/movie-library";
import { MovieLibraryActions, ViewingPreferences } from "./movie-library";

export type NextEpisode = { href: string; label: string };
const formatTime = (value: number) =>
  `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
export function MovieSessionTools({
  movie,
  episode,
  nextEpisode,
  videoRef,
  sourceKey,
  restorePosition,
  embedded,
  errorCode,
  provider,
  sourceName,
  onReportFailure,
  onLock,
  locked,
  onVerifiedPlay,
}: {
  movie: MovieIdentity;
  episode: string;
  nextEpisode?: NextEpisode;
  videoRef: RefObject<HTMLVideoElement | null>;
  sourceKey: string;
  restorePosition: number;
  embedded: boolean;
  errorCode: string;
  provider: string;
  sourceName: string;
  locked: boolean;
  onReportFailure(): void;
  onLock(value: boolean): void;
  onVerifiedPlay(): void;
}) {
  const router = useRouter();
  const rawPreferences = useSyncExternalStore(
    subscribeLocal,
    () => readLocal(PREFERENCES_KEY, "{}"),
    () => "{}",
  );
  const autoNext = (() => {
    try {
      return JSON.parse(rawPreferences).autoNext !== false;
    } catch {
      return true;
    }
  })();
  const [resume, setResume] = useState(() => {
    const saved = parseLibrary(readLocal(LIBRARY_KEY)).find(
      (entry) =>
        entry.id === movie.id && entry.href === movie.href && !entry.completed,
    );
    return (saved?.position || 0) > 10 ? saved!.position! : 0;
  });
  const { id, title, href, detailHref, poster } = movie;
  const movieInfo = useMemo(
    () => ({ id, title, href, detailHref, poster }),
    [id, title, href, detailHref, poster],
  );
  const nextHref = nextEpisode?.href;
  const resumePending = useRef(resume > 0);
  const lastTime = useRef(0);
  const lastWrite = useRef(0);
  const finished = useRef(false);
  const verified = useRef(false);
  const initializedSource = useRef("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [report, setReport] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const callbacks = useRef({ onVerifiedPlay });
  useEffect(() => {
    callbacks.current = { onVerifiedPlay };
  }, [onVerifiedPlay]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || embedded) return;
    let awaitingMetadata = initializedSource.current !== sourceKey;
    if (awaitingMetadata) {
      verified.current = false;
      if (restorePosition > 0) lastTime.current = restorePosition;
    }
    initializedSource.current = sourceKey;
    const save = () => {
      if (resumePending.current || lastTime.current <= 0) return;
      const persisted = updateMovie(movieInfo, {
        episode,
        position: lastTime.current,
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        completed: finished.current,
      });
      if (!persisted)
        setStatus("Trình duyệt chặn lưu tiến độ; chỉ giữ trong phiên này.");
    };
    const metadata = () => {
      awaitingMetadata = false;
      if (resumePending.current) video.pause();
      else if (lastTime.current > 0 && video.duration > lastTime.current)
        video.currentTime = lastTime.current;
    };
    const time = () => {
      if (resumePending.current || awaitingMetadata || video.readyState === 0) return;
      lastTime.current = video.currentTime;
      if (video.currentTime < video.duration - 2) finished.current = false;
      if (!video.paused && video.currentTime > 0 && !verified.current) {
        verified.current = true;
        callbacks.current.onVerifiedPlay();
      }
      if (Date.now() - lastWrite.current > 5000) {
        lastWrite.current = Date.now();
        save();
      }
    };
    const ended = () => {
      finished.current = true;
      lastTime.current = video.currentTime;
      save();
      if (nextHref && autoNext) setCountdown(10);
    };
    const pause = () => {
      if (!video.ended) save();
    };
    video.addEventListener("loadedmetadata", metadata);
    video.addEventListener("timeupdate", time);
    video.addEventListener("ended", ended);
    video.addEventListener("pause", pause);
    window.addEventListener("pagehide", save);
    return () => {
      save();
      video.removeEventListener("loadedmetadata", metadata);
      video.removeEventListener("timeupdate", time);
      video.removeEventListener("ended", ended);
      video.removeEventListener("pause", pause);
      window.removeEventListener("pagehide", save);
    };
  }, [sourceKey, restorePosition, embedded, movieInfo, episode, nextHref, autoNext, videoRef]);
  useEffect(() => {
    if (countdown === null || !autoNext || !nextEpisode) return;
    if (countdown === 0) {
      router.push(nextEpisode.href);
      return;
    }
    const timer = window.setTimeout(
      () => setCountdown((value) => (value === null ? null : value - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [countdown, autoNext, nextEpisode, router]);
  useEffect(() => {
    if (report) dialog.current?.showModal();
  }, [report]);
  useEffect(() => {
    if (embedded || locked || report || resume > 0) return;
    let lastSeek = 0;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select, button, a, [role="textbox"], [role="slider"], dialog'))) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.code !== "Space" && event.key !== " ") return;
      const video = videoRef.current;
      if (!video || video.readyState === 0) return;
      event.preventDefault();
      if (event.code === "Space" || event.key === " ") {
        // Holding Space must not repeatedly toggle playback.
        if (!event.repeat) {
          if (video.paused) void video.play().catch(() => setStatus("Bấm nút phát trong video để tiếp tục."));
          else video.pause();
        }
        return;
      }
      // Native keyboard repeat stops immediately on release or loss of focus.
      const now = performance.now();
      if (event.repeat && now - lastSeek < 120) return;
      lastSeek = now;
      const end = Number.isFinite(video.duration) ? video.duration : video.seekable.length ? video.seekable.end(video.seekable.length - 1) : video.currentTime;
      const start = !Number.isFinite(video.duration) && video.seekable.length ? video.seekable.start(0) : 0;
      video.currentTime = Math.max(start, Math.min(end, video.currentTime + (event.key === "ArrowRight" ? 10 : -10)));
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [embedded, locked, report, resume, sourceKey, videoRef]);
  function chooseResume(position: number) {
    const video = videoRef.current;
    if (!video || video.readyState === 0) {
      setStatus("Video đang tải, vui lòng thử lại sau giây lát.");
      return;
    }
    resumePending.current = false;
    setResume(0);
    finished.current = false;
    lastTime.current = position;
    video.currentTime = Math.min(position, Math.max(0, video.duration - 1));
    void video
      .play()
      .catch(() => setStatus("Bấm nút phát trong video để tiếp tục."));
  }
  function toggleLock() {
    onLock(!locked);
  }
  async function sendReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/playback-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movie: movie.title,
          path: movie.href,
          episode,
          provider,
          source: sourceName,
          errorCode: errorCode || "USER_REPORTED",
          position: Math.round(videoRef.current?.currentTime || 0),
          reason: String(form.get("reason")),
          description: String(form.get("description") || "").slice(0, 1000),
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error("Chưa gửi được báo lỗi. Vui lòng thử lại.");
      onReportFailure();
      setStatus(`Đã ghi nhận báo lỗi. Mã: ${data.reportId}`);
      setReport(false);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Chưa gửi được báo lỗi.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="movie-session-tools">
      <MovieLibraryActions movie={movie} />
      {!embedded && resume > 0 && (
        <div className="movie-resume" role="region" aria-label="Tiếp tục xem">
          <p>
            Bạn đã xem đến {formatTime(resume)} · {episode}
          </p>
          <button onClick={() => chooseResume(resume)}>
            Xem tiếp từ {formatTime(resume)}
          </button>
          <button onClick={() => chooseResume(0)}>Xem từ đầu</button>
        </div>
      )}
      <div className="movie-library-actions">
        {!embedded && (
          <>
            <button
              disabled={locked}
              onClick={() => {
                const v = videoRef.current;
                if (v) v.currentTime = Math.max(0, v.currentTime - 10);
              }}
            >
              −10 giây
            </button>
            <button
              disabled={locked}
              onClick={() => {
                const v = videoRef.current;
                if (v && Number.isFinite(v.duration))
                  v.currentTime = Math.min(v.duration, v.currentTime + 10);
              }}
            >
              +10 giây
            </button>
            <button aria-pressed={locked} onClick={toggleLock}>
              {locked ? "Mở khóa thao tác" : "Khóa thao tác"}
            </button>
          </>
        )}
        <button onClick={() => setReport(true)}>Báo lỗi video</button>
        {nextEpisode && (
          <Link href={nextEpisode.href}>
            Tập tiếp theo: {nextEpisode.label}
          </Link>
        )}
      </div>
      {!embedded && <p className="text-xs opacity-75">Bàn phím: ← / → tua 10 giây · Giữ phím để tua liên tục · Phím cách tạm dừng / phát tiếp.</p>}
      {!embedded && nextEpisode && (
        <label>
          <input
            type="checkbox"
            checked={autoNext}
            onChange={(event) => {
              setPreference({ autoNext: event.target.checked });
              setCountdown(null);
            }}
          />{" "}
          Tự chuyển tập sau 10 giây
        </label>
      )}
      {embedded && (
        <p>
          Trình phát của nguồn: dùng các nút bên trong video. Tiến độ và tự
          chuyển tập chưa được nguồn này hỗ trợ.
        </p>
      )}
      {countdown !== null && autoNext && nextEpisode && (
        <div role="status" className="movie-resume">
          Sang {nextEpisode.label} sau {countdown} giây{" "}
          <button onClick={() => router.push(nextEpisode.href)}>
            Chuyển ngay
          </button>
          <button onClick={() => setCountdown(null)}>Hủy chuyển tập</button>
        </div>
      )}
      <ViewingPreferences />
      {status && <p role="status">{status}</p>}
      {report && (
        <dialog
          className="movie-report"
          ref={dialog}
          onClose={() => setReport(false)}
        >
          <form onSubmit={sendReport}>
            <h2>Báo lỗi video</h2>
            <p>
              {movie.title} · {episode} · {sourceName}
            </p>
            <label>
              Lỗi gặp phải
              <select name="reason">
                <option value="not-playing">Không phát được</option>
                <option value="buffering">Dừng / tải liên tục</option>
                <option value="wrong-episode">Sai phim hoặc sai tập</option>
                <option value="audio">Lỗi âm thanh / phụ đề</option>
              </select>
            </label>
            <label>
              Mô tả thêm
              <textarea name="description" maxLength={1000} />
            </label>
            <p>
              Gửi kèm nguồn phát, vị trí xem và mã lỗi. Không gửi tài khoản hay
              lịch sử xem khác.
            </p>
            <button disabled={busy}>
              {busy ? "Đang gửi…" : "Gửi báo lỗi"}
            </button>
            <button type="button" onClick={() => setReport(false)}>
              Hủy
            </button>
            {status && <p role="alert">{status}</p>}
          </form>
        </dialog>
      )}
    </div>
  );
}
