"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUp, Film, LoaderCircle, Plus, RotateCcw, Sparkles, Square, Trash2 } from "lucide-react";
import type { ChatCriteria, ChatReply, ChatSession, ChatStage } from "@/lib/movie-chat/schema";

const STORAGE = "thexa-chat-conversation-v1";
const examples = [
  { label: "Tìm lại phim qua một cảnh", text: "Phim có người đi vào giấc mơ nhiều tầng để đánh cắp ý tưởng là phim gì?" },
  { label: "Chọn đúng gu tối nay", text: "Gợi ý phim bộ Hàn Quốc thể loại tình cảm năm 2023" },
  { label: "Nhớ nhân vật, quên tên phim", text: "Tìm phim có nhân vật Harry Potter" },
  { label: "Khám phá phim chiếu rạp", text: "Tìm phim Việt Nam chiếu rạp có Trấn Thành" },
];
const stages: Record<ChatStage, string> = { understanding: "Đang hiểu yêu cầu của bạn…", searching: "Đang tìm và đối chiếu nguồn phim…", checking: "Đang chọn phim phù hợp…" };
const taxonomyNames: Record<string, string> = { "hanh-dong": "Hành động", "phieu-luu": "Phiêu lưu", "hoat-hinh": "Hoạt hình", "hai-huoc": "Hài hước", "hinh-su": "Hình sự", "tai-lieu": "Tài liệu", "chinh-kich": "Chính kịch", "gia-dinh": "Gia đình", "gia-tuong": "Giả tưởng", "lich-su": "Lịch sử", "kinh-di": "Kinh dị", "am-nhac": "Âm nhạc", "bi-an": "Bí ẩn", "tinh-cam": "Tình cảm", "vien-tuong": "Viễn tưởng", "khoa-hoc-vien-tuong": "Khoa học viễn tưởng", "giat-gan": "Giật gân", "chien-tranh": "Chiến tranh", "vo-thuat": "Võ thuật", "co-trang": "Cổ trang", "tam-ly": "Tâm lý", "hoc-duong": "Học đường", "the-thao": "Thể thao", "han-quoc": "Hàn Quốc", "trung-quoc": "Trung Quốc", "au-my": "Âu Mỹ", "nhat-ban": "Nhật Bản", "thai-lan": "Thái Lan", "viet-nam": "Việt Nam", anh: "Anh", phap: "Pháp", "hong-kong": "Hồng Kông", "dai-loan": "Đài Loan", "an-do": "Ấn Độ", duc: "Đức", "tay-ban-nha": "Tây Ban Nha", canada: "Canada", uc: "Úc" };
type Entry = { id: string; role: "user" | "assistant"; text: string; reply?: ChatReply };
function readId() { try { return sessionStorage.getItem(STORAGE); } catch { return null; } }
function saveId(id: string | null) { try { if (id) sessionStorage.setItem(STORAGE, id); else sessionStorage.removeItem(STORAGE); } catch { /* Chat still works without browser storage. */ } }
function Criteria({ criteria }: { criteria: ChatCriteria | null }) {
  if (!criteria) return null;
  const labels = [
    ...criteria.genres.map(s => taxonomyNames[s] || s), ...criteria.countries.map(s => taxonomyNames[s] || s),
    criteria.kind ? ({ single: "Phim lẻ", series: "Phim bộ", animation: "Hoạt hình", tvshow: "TV show" })[criteria.kind] : "",
    criteria.yearFrom || criteria.yearTo ? `${criteria.yearFrom || "…"}–${criteria.yearTo || "…"}` : "",
    criteria.cinema === null ? "" : criteria.cinema ? "Đã phát hành rạp" : "Không chiếu rạp",
    criteria.actor ? `Diễn viên: ${criteria.actor}` : "", criteria.character ? `Nhân vật: ${criteria.character}` : "", criteria.director ? `Đạo diễn: ${criteria.director}` : "",
  ].filter(Boolean);
  return labels.length ? <div className="chat-criteria" aria-label="Tiêu chí đang tìm">{labels.map(label => <span key={label}>{label}</span>)}</div> : null;
}
export function MovieChat() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [criteria, setCriteria] = useState<ChatCriteria | null>(null);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [stage, setStage] = useState<ChatStage>("understanding");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState<{ message: string; id: string } | null>(null);
  const controller = useRef<AbortController | null>(null);
  const active = useRef(false);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const abort = new AbortController();
    const id = readId();
    if (!id) { queueMicrotask(() => { if (!abort.signal.aborted) setRestoring(false); }); return () => abort.abort(); }
    fetch(`/api/movie-chat?id=${encodeURIComponent(id)}`, { signal: abort.signal, cache: "no-store" })
      .then(async response => {
        if (!response.ok) { if (response.status === 410) saveId(null); throw new Error("Không khôi phục được hội thoại. Bạn có thể bắt đầu cuộc trò chuyện mới."); }
        const data = await response.json() as { session: ChatSession; conversationId: string };
        setConversationId(data.conversationId); setCriteria(data.session.criteria);
        setEntries(data.session.turns.flatMap((turn, i) => [
          { id: `${i}-u`, role: "user" as const, text: turn.user },
          { id: `${i}-a`, role: "assistant" as const, text: turn.assistant, ...(i === data.session.turns.length - 1 ? { reply: { message: turn.assistant, movies: data.session.results.map(m => ({ ...m, evidenceQuote: "" })), criteria: data.session.criteria, partial: true, followUps: [], conversationId: data.conversationId, requestId: "" } } : {}) },
        ]));
      }).catch(err => { if (!abort.signal.aborted) setError(err.message); }).finally(() => { if (!abort.signal.aborted) setRestoring(false); });
    return () => abort.abort();
  }, []);
  useEffect(() => () => { controller.current?.abort(); }, []);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest", behavior: "instant" }); }, [entries.length, busy]);
  async function send(message = draft, retryId?: string) {
    const text = message.trim(); if (!text || active.current || restoring) return;
    active.current = true; setBusy(true); setError(""); setRetry(null); setStage("understanding"); setDraft("");
    if (!retryId) setEntries(old => [...old, { id: crypto.randomUUID(), role: "user", text }]);
    const requestId = retryId || crypto.randomUUID();
    const abort = new AbortController(); controller.current = abort;
    let received = false;
    try {
      const response = await fetch("/api/movie-chat", { method: "POST", signal: abort.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, conversationId, requestId }) });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Chưa kết nối được trợ lý AI." }));
        throw new Error(data.error || "Chưa kết nối được trợ lý AI.");
      }
      const reader = response.body?.getReader(); if (!reader) throw new Error("Kết nối bị ngắt. Vui lòng thử lại.");
      const decoder = new TextDecoder(); let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let boundary: number;
          while ((boundary = buffer.indexOf("\n\n")) >= 0) {
            const frame = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
            const type = frame.split("\n").find(l => l.startsWith("event: "))?.slice(7);
            const payload = frame.split("\n").find(l => l.startsWith("data: "))?.slice(6); if (!payload) continue;
            const data = JSON.parse(payload);
            if (type === "stage" && data.stage in stages) setStage(data.stage);
            if (type === "error") throw new Error(`${data.error}${data.requestId ? ` (Mã: ${data.requestId.slice(0, 8)})` : ""}`);
            if (type === "result") {
              const reply = data as ChatReply; received = true;
              setConversationId(reply.conversationId); saveId(reply.conversationId); setCriteria(reply.criteria);
              setEntries(old => [...old, { id: crypto.randomUUID(), role: "assistant", text: reply.message, reply }]);
            }
          }
        }
      } finally { reader.releaseLock(); }
      if (!received) throw new Error("Kết nối bị ngắt trước khi nhận kết quả. Bạn thử lại nhé.");
    } catch (err) {
      setError(abort.signal.aborted ? "Đã dừng tìm kiếm." : err instanceof Error ? err.message : "Chưa gửi được câu hỏi.");
      setRetry({ message: text, id: requestId });
    } finally { active.current = false; controller.current = null; setBusy(false); input.current?.focus(); }
  }
  async function reset() {
    if (active.current) return;
    if (conversationId) {
      try {
        const response = await fetch("/api/movie-chat", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId }) });
        if (!response.ok) throw new Error("Chưa xóa được hội thoại trên máy chủ. Vui lòng thử lại.");
      } catch (err) { setError(err instanceof Error ? err.message : "Chưa xóa được hội thoại."); return; }
    }
    saveId(null); setConversationId(null); setEntries([]); setCriteria(null); setError(""); setRetry(null); setDraft(""); input.current?.focus();
  }
  return <section className="movie-chat-shell">
    <aside className="chat-sidebar">
      <div className="chat-mark"><Sparkles size={24} /></div>
      <p className="chat-eyebrow">T-HEXA AI</p><h1>Bộ phim bạn tìm,<br /><span>bắt đầu từ một câu chuyện.</span></h1>
      <p>Nhớ một cảnh, một nhân vật hay chỉ một cảm giác? Kể cho tôi nghe.</p>
      <button className="chat-new" onClick={reset} disabled={busy || restoring}><Plus size={17} /> Cuộc trò chuyện mới</button>
      <div className="chat-sidebar-note"><Film size={20} /><strong>Tìm phim có căn cứ</strong><p>Kết quả có nguồn và mô tả để bạn đối chiếu. Khả năng phát tùy từng nguồn phim.</p></div>
      <p className="chat-privacy">Tin nhắn được gửi đến OpenAI để xử lý. Hội thoại mã hóa trên máy chủ, tự xóa sau 24 giờ. Không nhập mật khẩu hoặc thông tin riêng tư.</p>
    </aside>
    <div className="chat-main">
      <header className="chat-top"><div><Sparkles size={19} /><strong>Trợ lý tìm phim</strong><span>Hiểu điều bạn đang tìm</span></div><button onClick={reset} disabled={busy || restoring} aria-label="Xóa hội thoại"><Trash2 size={18} /></button></header>
      <div className="chat-scroll" role="log" aria-label="Hội thoại tìm phim" aria-live="polite" aria-busy={busy}>
        {restoring ? <p className="chat-progress"><LoaderCircle size={18} /> Đang khôi phục hội thoại…</p> : !entries.length && <div className="chat-welcome"><div className="chat-mark"><Sparkles size={26} /></div><h2>Hôm nay bạn muốn xem gì?</h2><p>Không cần nhớ chính xác tên phim.<br />Bắt đầu bằng những gì bạn còn nhớ.</p><div className="chat-examples">{examples.map(example => <button key={example.label} onClick={() => void send(example.text)}><span>{example.label}</span><p>{example.text}</p><ArrowUp size={16} /></button>)}</div></div>}
        {entries.map(entry => <article key={entry.id} className={`chat-entry ${entry.role}`}><span className="chat-speaker">{entry.role === "user" ? "Bạn" : "T-Hexa AI"}</span><p className="chat-message">{entry.text}</p>
          {!!entry.reply?.movies.length && <div className="chat-movies">{entry.reply.movies.map(movie => <Link className="chat-movie" href={movie.href} key={movie.id}>
            {movie.posterUrl ? <Image src={movie.posterUrl} alt="" width={76} height={110} unoptimized referrerPolicy="no-referrer" onError={event => { event.currentTarget.style.display = "none"; }} /> : <div className="chat-poster-placeholder"><Film /></div>}
            <div><h3>{movie.title}</h3><p>{movie.year || "Chưa rõ năm"} · {movie.countries.join(", ") || "Chưa rõ quốc gia"}</p><p>{movie.genres.slice(0, 3).join(" · ")}</p>{movie.evidenceQuote && <blockquote>“{movie.evidenceQuote}”</blockquote>}<span className="chat-source">{movie.source} ↗</span></div>
          </Link>)}</div>}
          {entry.reply?.partial && <p className="chat-coverage">Đây là kết quả trong phạm vi vừa tra cứu; một số nguồn hoặc dữ liệu có thể chưa đầy đủ.</p>}
          {!!entry.reply?.followUps.length && <div className="chat-followups">{entry.reply.followUps.map(text => <button key={text} disabled={busy} onClick={() => void send(text)}>{text}</button>)}</div>}
        </article>)}
        {busy && <p className="chat-progress" role="status"><LoaderCircle size={18} />{stages[stage]}</p>}
        {error && <div className="chat-error" role="alert"><p>{error}</p>{retry && <button disabled={busy} onClick={() => void send(retry.message, retry.id)}><RotateCcw size={14} /> Thử lại</button>}</div>}
        <div ref={end} />
      </div>
      <div className="chat-composer"><Criteria criteria={criteria} /><form onSubmit={event => { event.preventDefault(); void send(); }}><textarea ref={input} value={draft} onChange={event => setDraft(event.target.value)} maxLength={1500} rows={2} aria-label="Nhập câu hỏi tìm phim" placeholder="Kể nội dung phim, tên nhân vật hoặc điều bạn muốn xem…" disabled={restoring} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} />{busy ? <button type="button" onClick={() => controller.current?.abort()} aria-label="Dừng tìm kiếm"><Square size={18} /></button> : <button type="submit" disabled={!draft.trim() || restoring} aria-label="Gửi câu hỏi"><ArrowUp size={21} /></button>}</form><div className="chat-composer-note"><span>Enter để gửi · Shift + Enter xuống dòng</span><span>{draft.length}/1500</span></div></div>
    </div>
  </section>;
}
