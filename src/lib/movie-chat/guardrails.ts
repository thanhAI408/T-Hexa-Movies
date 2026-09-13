import { createHash } from "node:crypto";

export class ChatError extends Error {
  constructor(public code: string, public status: number, message: string) { super(message); }
}
export const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const secretPattern = /\bsk-[a-zA-Z0-9_-]{16,}\b|\bBearer\s+[a-zA-Z0-9_.-]{20,}/gi;
export function redact(text: string) {
  return text.replace(secretPattern, "[đã ẩn khóa]").replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[đã ẩn email]");
}
export function safeText(text: string, max = 1500) {
  return redact(text.replace(/<[^>]*>/g, " ").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g, "").replace(/https?:\/\/\S+/gi, "[liên kết đã ẩn]")).slice(0, max).trim();
}
// A fast signal, not the security boundary: tools, schemas and grounded IDs enforce it.
export function injectionSignal(text: string) {
  const s = normalize(text);
  return /ignore (all |the )?(previous|system|developer)|reveal.{0,30}(prompt|secret|api key)|bo qua.{0,30}(chi dan|huong dan|quy tac)|in ra.{0,30}(api key|system prompt|khoa api)|you are now|developer message|system prompt|jailbreak/.test(s);
}
export function safeProviderText(text: string, max = 1200) {
  const clean = safeText(text, max);
  return injectionSignal(clean) ? "" : clean;
}
export function validateOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site")
    throw new ChatError("ORIGIN", 403, "Vui lòng mở chatbot trực tiếp trên T-Hexa.");
}
export async function readBody(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ChatError("CONTENT_TYPE", 415, "Định dạng yêu cầu không hợp lệ.");
  const reader = request.body?.getReader();
  if (!reader) throw new ChatError("INPUT", 400, "Bạn chưa nhập nội dung.");
  const parts: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) { await reader.cancel(); throw new ChatError("SIZE", 413, "Tin nhắn quá dài."); }
      parts.push(value);
    }
    return JSON.parse(Buffer.concat(parts).toString("utf8")) as unknown;
  } catch (error) {
    if (error instanceof ChatError) throw error;
    throw new ChatError("INPUT", 400, "Nội dung gửi lên không hợp lệ.");
  } finally { reader.releaseLock(); }
}
export function clientHash(request: Request) {
  // Vercel overwrites this header at its trusted proxy. Do not trust X-Forwarded-For.
  const ip = process.env.VERCEL ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown" : "local";
  return createHash("sha256").update(`${process.env.CHAT_SESSION_SECRET || "local"}:${ip}`).digest("hex").slice(0, 32);
}
