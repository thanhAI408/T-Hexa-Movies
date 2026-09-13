import "server-only";
import { Redis } from "@upstash/redis";
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { ChatReply, ChatSession } from "./schema";
import { ChatError } from "./guardrails";

const TTL = 86400;
let client: Redis | undefined;
export function chatReady() {
  return !!(process.env.OPENAI_API_KEY && process.env.CHAT_SESSION_SECRET && (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) && (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN));
}
function redis() {
  if (!chatReady()) throw new ChatError("NOT_CONFIGURED", 503, "Trợ lý AI đang được cấu hình. Bạn vẫn có thể dùng ô tìm kiếm phim.");
  client ??= new Redis({ url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL!, token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN!, retry: { retries: 0 }, signal: () => AbortSignal.timeout(4000) });
  return client;
}
function secret() {
  const value = process.env.CHAT_SESSION_SECRET;
  if (!value || value.length < 32) throw new ChatError("NOT_CONFIGURED", 503, "Trợ lý AI đang được cấu hình.");
  return createHmac("sha256", value).update("thexa-chat-encryption-v1").digest();
}
export function seal(value: unknown) {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", secret(), iv);
  return Buffer.concat([iv, cipher.update(JSON.stringify(value), "utf8"), cipher.final(), cipher.getAuthTag()]).toString("base64url");
}
export function unseal<T>(encoded: string): T {
  const data = Buffer.from(encoded, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", secret(), data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(-16));
  return JSON.parse(Buffer.concat([decipher.update(data.subarray(12, -16)), decipher.final()]).toString("utf8")) as T;
}
export function ownerIdentity(request: Request) {
  const token = request.headers.get("cookie")?.split(";").map(x => x.trim()).find(x => x.startsWith("thexa_chat="))?.slice(11) || "";
  const [id, signature] = token.split(".");
  const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("hex");
  if (/^[a-f0-9]{32}$/.test(id || "") && /^[a-f0-9]{64}$/.test(signature || "") && timingSafeEqual(Buffer.from(signature), Buffer.from(sign(id)))) return { id, cookie: null };
  const newId = randomBytes(16).toString("hex");
  return { id: newId, cookie: `thexa_chat=${newId}.${sign(newId)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${TTL}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}` };
}
const key = (owner: string, id: string) => `movie-chat:v1:session:${owner}:${id}`;
export async function getSession(owner: string, id: string): Promise<ChatSession | null> {
  const data = await redis().get<string>(key(owner, id));
  return data ? unseal<ChatSession>(data) : null;
}
export async function deleteSession(owner: string, id: string) {
  const indexKey = `${key(owner, id)}:replies`;
  await redis().set(`${key(owner, id)}:deleted`, "1", { ex: TTL });
  const replyIds = await redis().smembers<string[]>(indexKey);
  await redis().del(key(owner, id), indexKey, ...replyIds.map(r => `movie-chat:v1:reply:${owner}:${r}`));
}
export async function cachedReply(owner: string, requestId: string, fingerprint: string): Promise<ChatReply | null> {
  const data = await redis().get<string>(`movie-chat:v1:reply:${owner}:${requestId}`);
  if (!data) return null;
  const cached = unseal<{ fingerprint: string; reply: ChatReply }>(data);
  if (cached.fingerprint !== fingerprint) throw new ChatError("REQUEST_REUSED", 409, "Mã yêu cầu đã được dùng cho tin nhắn khác.");
  return cached.reply;
}
export async function commitTurn(owner: string, requestId: string, fingerprint: string, reply: ChatReply, session: ChatSession) {
  const indexKey = `${key(owner, reply.conversationId)}:replies`;
  const committed = await redis().eval(`
if redis.call('EXISTS',KEYS[4])==1 or redis.call('GET',KEYS[5])~=ARGV[4] then return 0 end
redis.call('SET',KEYS[1],ARGV[1],'EX',ARGV[3])
redis.call('SET',KEYS[2],ARGV[2],'EX',600)
redis.call('SADD',KEYS[3],ARGV[4]); redis.call('EXPIRE',KEYS[3],ARGV[3])
return 1`, [key(owner, reply.conversationId), `movie-chat:v1:reply:${owner}:${requestId}`, indexKey, `${key(owner, reply.conversationId)}:deleted`, `movie-chat:v1:lock:${owner}`], [seal(session), seal({ fingerprint, reply }), TTL, requestId]);
  if (committed !== 1) throw new ChatError("SESSION_EXPIRED", 410, "Hội thoại đã bị xóa hoặc hết thời gian xử lý. Hãy bắt đầu cuộc trò chuyện mới.");
}
// Atomic counters + owner lock work across concurrent Vercel instances. Fail closed.
const reserveScript = `
if redis.call('EXISTS', KEYS[4]) == 1 then return 2 end
for i=1,3 do if tonumber(redis.call('GET', KEYS[i]) or '0') >= tonumber(ARGV[i]) then return 1 end end
for i=1,3 do local n=redis.call('INCR', KEYS[i]); if n==1 then redis.call('EXPIRE',KEYS[i],tonumber(ARGV[i+3])) end end
redis.call('SET',KEYS[4],ARGV[7],'EX',90)
return 0`;
export async function reserveTurn(owner: string, ipHash: string, requestId: string) {
  const day = new Date().toISOString().slice(0, 10);
  const maxDaily = Math.max(1, Math.min(10000, Number(process.env.CHAT_DAILY_TURN_LIMIT) || 200));
  const result = await redis().eval(reserveScript,
    [`movie-chat:v1:minute:${ipHash}`, `movie-chat:v1:day:${day}:${ipHash}`, `movie-chat:v1:budget:${day}`, `movie-chat:v1:lock:${owner}`],
    [8, 50, maxDaily, 60, TTL, TTL, requestId]);
  if (result === 2) throw new ChatError("BUSY", 409, "Một câu hỏi đang được xử lý. Vui lòng chờ hoặc dừng câu hỏi trước.");
  if (result !== 0) throw new ChatError("RATE_LIMIT", 429, "Đã đạt giới hạn lượt hỏi. Vui lòng thử lại sau; ô tìm kiếm thường vẫn hoạt động.");
}
export async function releaseTurn(owner: string, requestId: string) {
  await redis().eval("if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end", [`movie-chat:v1:lock:${owner}`], [requestId]);
}
