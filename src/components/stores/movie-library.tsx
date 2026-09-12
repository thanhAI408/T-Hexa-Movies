"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import {
  LIBRARY_KEY,
  parseLibrary,
  readLocal,
  subscribeLocal,
  updateMovie,
  writeLocal,
  PREFERENCES_KEY,
  setPreference,
  type MovieIdentity,
} from "@/lib/movie-library";

export function MovieLibraryActions({ movie }: { movie: MovieIdentity }) {
  const raw = useSyncExternalStore(
    subscribeLocal,
    () => readLocal(LIBRARY_KEY),
    () => "[]",
  );
  const entry = parseLibrary(raw).find((entry) => entry.id === movie.id);
  const [notice, setNotice] = useState("");
  const toggle = (kind: "favorite" | "later") => {
    // Bookmarking from the detail page must preserve the last watched episode.
    const saved = updateMovie(entry ? { ...movie, href: entry.href } : movie, {
      [kind]: !entry?.[kind],
    });
    setNotice(
      saved
        ? ""
        : "Trình duyệt chặn lưu trữ; thay đổi chỉ giữ trong phiên này.",
    );
  };
  return (
    <div className="movie-library-actions">
      <button
        aria-pressed={!!entry?.favorite}
        onClick={() => toggle("favorite")}
      >
        {entry?.favorite ? "♥ Đã yêu thích" : "♡ Yêu thích"}
      </button>
      <button aria-pressed={!!entry?.later} onClick={() => toggle("later")}>
        {entry?.later ? "✓ Đã lưu xem sau" : "+ Xem sau"}
      </button>
      {entry?.position && !entry.completed ? (
        <Link href={entry.href}>
          Xem tiếp · {Math.floor(entry.position / 60)} phút
        </Link>
      ) : null}
      {notice && <span role="status">{notice}</span>}
    </div>
  );
}
export function ViewingPreferences() {
  const raw = useSyncExternalStore(
    subscribeLocal,
    () => readLocal(PREFERENCES_KEY, "{}"),
    () => "{}",
  );
  const reduced = (() => {
    try {
      return JSON.parse(raw).reduced === true;
    } catch {
      return false;
    }
  })();
  return (
    <label className="viewing-preferences">
      <input
        type="checkbox"
        checked={reduced}
        onChange={(event) => setPreference({ reduced: event.target.checked })}
      />{" "}
      Giảm hiệu ứng / tiết kiệm pin
    </label>
  );
}
export function MovieLibrary() {
  const raw = useSyncExternalStore(
    subscribeLocal,
    () => readLocal(LIBRARY_KEY),
    () => "[]",
  );
  const [tab, setTab] = useState<"watching" | "favorite" | "later">("watching");
  const items = parseLibrary(raw).filter((entry) =>
    tab === "watching"
      ? (entry.position || 0) > 0 && !entry.completed
      : entry[tab],
  );
  return (
    <section
      className="movie-library page-shell"
      aria-label="Thư viện phim cá nhân"
    >
      <div className="movie-library-heading">
        <h2>Phim của bạn</h2>
        <ViewingPreferences />
      </div>
      <p>Lưu trên thiết bị này · Không cần tài khoản</p>
      <div
        className="movie-library-actions"
        role="group"
        aria-label="Danh sách phim"
      >
        {[
          ["watching", "Đang xem"],
          ["favorite", "Yêu thích"],
          ["later", "Xem sau"],
        ].map(([value, label]) => (
          <button
            key={value}
            aria-pressed={tab === value}
            onClick={() => setTab(value as typeof tab)}
          >
            {label}
          </button>
        ))}
      </div>
      {!items.length ? (
        <p>
          Chưa có phim trong danh sách này. Lưu phim từ trang chi tiết hoặc bắt
          đầu xem.
        </p>
      ) : (
        <div className="movie-library-grid">
          {items.map((entry) => (
            <article key={entry.id}>
              <Link href={tab === "watching" ? entry.href : entry.detailHref}>
                <h3>{entry.title}</h3>
                <p>{entry.episode || "Mở chi tiết phim"}</p>
                {tab === "watching" && (
                  <>
                    <progress
                      max={entry.duration || Math.max(1, entry.position || 1)}
                      value={entry.position || 0}
                    />
                    <p>
                      Xem tiếp từ {Math.floor((entry.position || 0) / 60)}:
                      {String(Math.floor((entry.position || 0) % 60)).padStart(
                        2,
                        "0",
                      )}
                    </p>
                  </>
                )}
              </Link>
              <button
                aria-label={`Bỏ ${entry.title} khỏi danh sách`}
                onClick={() => {
                  if (tab === "watching")
                    updateMovie(entry, { position: 0, completed: false });
                  else updateMovie(entry, { [tab]: false });
                }}
              >
                Bỏ khỏi danh sách
              </button>
            </article>
          ))}
        </div>
      )}
      {items.length > 0 && (
        <button
          className="movie-library-clear"
          onClick={() => {
            const all = parseLibrary(readLocal(LIBRARY_KEY));
            writeLocal(
              LIBRARY_KEY,
              JSON.stringify(
                all.map((entry) =>
                  tab === "watching"
                    ? { ...entry, position: 0, completed: false }
                    : { ...entry, [tab]: false },
                ),
              ),
            );
          }}
        >
          Xóa danh sách{" "}
          {tab === "watching"
            ? "đang xem"
            : tab === "favorite"
              ? "yêu thích"
              : "xem sau"}
        </button>
      )}
    </section>
  );
}
