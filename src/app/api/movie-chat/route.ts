import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { ChatError, clientHash, readBody, redact, validateOrigin } from "@/lib/movie-chat/guardrails";
import { logChatTrace, runHarness } from "@/lib/movie-chat/harness";
import { cachedReply, chatReady, commitTurn, deleteSession, getSession, ownerIdentity, releaseTurn, reserveTurn } from "@/lib/movie-chat/store";
import { requestSchema, type ChatReply } from "@/lib/movie-chat/schema";

export const runtime = "nodejs";
export const maxDuration = 90;
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
function publicError(error: unknown) {
  if (error instanceof ChatError) return error;
  if (error instanceof z.ZodError) return new ChatError("VALIDATION", 400, "Dữ liệu chưa đúng định dạng. Bạn thử gửi lại tin nhắn nhé.");
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) return new ChatError("TIMEOUT", 504, "Tìm kiếm mất nhiều thời gian hơn dự kiến. Bạn thử lại với tên hoặc tiêu chí cụ thể hơn nhé.");
  return new ChatError("UNAVAILABLE", 503, "Trợ lý AI tạm thời chưa kết nối được. Bạn có thể thử lại hoặc dùng ô tìm kiếm phim.");
}
export async function POST(request: Request) {
  const started = Date.now(); const traceId = randomUUID();
  let owner = ""; let requestId = ""; let reserved = false;
  try {
    validateOrigin(request);
    const parsed = requestSchema.parse(await readBody(request));
    if (!chatReady()) throw new ChatError("NOT_CONFIGURED", 503, "Trợ lý AI đang được cấu hình. Bạn vẫn có thể dùng ô tìm kiếm phim.");
    const identity = ownerIdentity(request); owner = identity.id; requestId = parsed.requestId;
    const fingerprint = createHash("sha256").update(JSON.stringify(parsed)).digest("hex");
    const cached = await cachedReply(owner, requestId, fingerprint);
    const responseHeaders = { ...headers, "Content-Type": "text/event-stream; charset=utf-8", "X-Accel-Buffering": "no", ...(identity.cookie ? { "Set-Cookie": identity.cookie } : {}) };
    const encode = (type: string, data: unknown) => new TextEncoder().encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    if (cached) return new Response(encode("result", cached), { headers: responseHeaders });
    const conversationId = parsed.conversationId || randomUUID();
    const existing = parsed.conversationId ? await getSession(owner, conversationId) : null;
    if (parsed.conversationId && !existing) throw new ChatError("SESSION_EXPIRED", 410, "Hội thoại đã hết hạn hoặc không thuộc phiên này. Hãy bắt đầu cuộc trò chuyện mới.");
    const session = existing || { turns: [], criteria: null, results: [] };
    if (session.turns.length >= 20) throw new ChatError("TURN_LIMIT", 409, "Hội thoại đã đủ 20 lượt. Hãy bắt đầu cuộc trò chuyện mới để tìm chính xác hơn.");
    await reserveTurn(owner, clientHash(request), requestId); reserved = true;
    const aborter = new AbortController();
    const signal = AbortSignal.any([request.signal, aborter.signal, AbortSignal.timeout(75000)]);
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let closed = false;
        const send = (type: string, data: unknown) => { if (!closed && !signal.aborted) { try { controller.enqueue(encode(type, data)); } catch { closed = true; aborter.abort(); } } };
        try {
          const message = redact(parsed.message);
          const result = await runHarness(message, session, signal, stage => send("stage", { stage }));
          signal.throwIfAborted();
          const reply: ChatReply = { ...result, conversationId, requestId: traceId };
          await commitTurn(owner, requestId, fingerprint, reply, { turns: [...session.turns, { user: message, assistant: reply.message }], criteria: reply.criteria, results: reply.movies });
          send("result", reply);
          logChatTrace({ requestId: traceId, status: "completed", elapsedMs: Date.now() - started, results: reply.movies.length });
        } catch (error) {
          const safe = publicError(error);
          // Timeout still needs a visible error event if the browser is connected.
          if (!request.signal.aborted && !aborter.signal.aborted) { try { controller.enqueue(encode("error", { error: safe.message, code: safe.code, requestId: traceId })); } catch { /* disconnected */ } }
          logChatTrace({ requestId: traceId, status: signal.aborted ? "cancelled" : "failed", elapsedMs: Date.now() - started, error: safe.code });
        } finally {
          await releaseTurn(owner, requestId).catch(() => {});
          closed = true; try { controller.close(); } catch { /* disconnected */ }
        }
      },
      cancel() { aborter.abort(); },
    });
    return new Response(stream, { headers: responseHeaders });
  } catch (error) {
    if (reserved) await releaseTurn(owner, requestId).catch(() => {});
    const safe = publicError(error);
    logChatTrace({ requestId: traceId, status: "rejected", elapsedMs: Date.now() - started, error: safe.code });
    return Response.json({ error: safe.message, code: safe.code, requestId: traceId }, { status: safe.status, headers: { ...headers, ...(safe.status === 429 ? { "Retry-After": "60" } : {}) } });
  }
}
export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ available: chatReady() }, { headers });
    if (request.headers.get("sec-fetch-site") === "cross-site") throw new ChatError("ORIGIN", 403, "Vui lòng mở chatbot trên T-Hexa.");
    const validId = z.string().uuid().parse(id);
    const identity = ownerIdentity(request);
    const session = await getSession(identity.id, validId);
    if (!session) return Response.json({ error: "Hội thoại đã hết hạn." }, { status: 410, headers });
    return Response.json({ session, conversationId: validId }, { headers });
  } catch (error) { const safe = publicError(error); return Response.json({ error: safe.message }, { status: safe.status, headers }); }
}
export async function DELETE(request: Request) {
  try {
    validateOrigin(request);
    const { conversationId } = z.object({ conversationId: z.string().uuid() }).strict().parse(await readBody(request));
    const identity = ownerIdentity(request);
    await deleteSession(identity.id, conversationId);
    return Response.json({ deleted: true }, { headers });
  } catch (error) { const safe = publicError(error); return Response.json({ error: safe.message }, { status: safe.status, headers }); }
}
