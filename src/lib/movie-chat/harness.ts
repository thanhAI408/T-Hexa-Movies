import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { toResponseInputItems } from "openai/lib/responses/ResponseInputItems";
import { answerSchema, CHAT_VERSION, planSchema, type ChatReply, type ChatSession, type ChatStage, type MovieEvidence } from "./schema";
import { ChatError, injectionSignal, safeText } from "./guardrails";
import { SYSTEM_PROMPT, RANK_PROMPT } from "./prompts";
import { searchMovieEvidence } from "./catalog";

export interface HarnessDeps { client: OpenAI; search: typeof searchMovieEvidence }
export function harnessDependencies(): HarnessDeps {
  return { client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 22000, maxRetries: 0 }), search: searchMovieEvidence };
}
export function groundAnswer(raw: z.infer<typeof answerSchema>, evidence: MovieEvidence[], requireQuote: boolean) {
  const used = new Set<string>();
  const movies: ChatReply["movies"] = [];
  for (const selection of raw.selections) {
    const movie = evidence.find(m => m.id === selection.id);
    if (!movie || used.has(movie.id)) continue;
    const quote = selection.evidenceQuote.trim();
    if ((quote && !movie.description.includes(quote)) || (requireQuote && !quote)) continue;
    used.add(movie.id); movies.push({ ...movie, evidenceQuote: quote });
  }
  const unsafe = injectionSignal(raw.message) || /sk-[a-zA-Z0-9_-]{16,}|https?:\/\//.test(raw.message);
  return {
    message: unsafe ? "Tôi đã đối chiếu dữ liệu phim. Bạn có thể xem các kết quả bên dưới." : safeText(raw.message, 1200),
    movies,
    followUps: raw.followUps.filter(x => !injectionSignal(x) && !/https?:|sk-/.test(x)).map(x => safeText(x, 100)),
  };
}
export async function runHarness(message: string, session: ChatSession, signal: AbortSignal, stage: (s: ChatStage) => void, deps = harnessDependencies()) {
  const base = { movies: [] as ChatReply["movies"], followUps: [] as string[], criteria: session.criteria, partial: false };
  if (injectionSignal(message)) return { ...base, message: "Tôi có thể giúp tìm phim theo tên, nội dung hoặc tiêu chí. Bạn muốn tìm phim nào?" };
  stage("understanding");
  const moderation = await deps.client.moderations.create({ model: "omni-moderation-latest", input: message }, { signal });
  const categories = moderation.results[0]?.categories;
  if (categories && (categories["sexual/minors"] || categories["self-harm/instructions"] || categories["hate/threatening"]))
    return { ...base, message: "Tôi không thể hỗ trợ yêu cầu đó. Tôi có thể gợi ý phim phù hợp nếu bạn cho biết thể loại hoặc nội dung muốn xem." };
  const model = process.env.OPENAI_CHAT_MODEL || "gpt-4.1-mini";
  const input: OpenAI.Responses.ResponseInput = [{ role: "user", content: JSON.stringify({ previousCriteria: session.criteria, history: session.turns.slice(-5), previousResults: session.results.map(m => ({ id: m.id, title: m.title, year: m.year })), message }) }];
  const plan = await deps.client.responses.create({
    model, store: false, instructions: SYSTEM_PROMPT, input,
    max_output_tokens: 1400, parallel_tool_calls: false,
    tools: [{ type: "function", name: "search_movies", description: "Tra cứu phim theo tiêu chí; intent clarify/out_of_scope không chạy tìm kiếm. Đây là công cụ duy nhất, chỉ đọc danh mục phim.", strict: true, parameters: z.toJSONSchema(planSchema) }],
    tool_choice: { type: "function", name: "search_movies" },
  }, { signal });
  if (plan.status !== "completed") throw new ChatError("MODEL_INCOMPLETE", 502, "AI chưa xử lý xong yêu cầu. Vui lòng thử một mô tả ngắn hơn.");
  const calls = plan.output.filter(item => item.type === "function_call");
  if (calls.length !== 1 || calls[0].name !== "search_movies") throw new ChatError("TOOL_POLICY", 502, "AI chưa xác định được cách tìm phù hợp. Bạn thử nói rõ tên hoặc nội dung phim nhé.");
  const parsed = planSchema.parse(JSON.parse(calls[0].arguments));
  if (parsed.intent !== "search") return { ...base, criteria: parsed.criteria, message: safeText(parsed.question || "Bạn nhớ thêm chi tiết nào về phim không?", 400) };
  const c = parsed.criteria;
  if (c.yearFrom && c.yearTo && c.yearFrom > c.yearTo) return { ...base, message: "Khoảng năm chưa hợp lệ. Bạn muốn tìm từ năm nào đến năm nào?" };
  stage("searching");
  const results = await deps.search(c, signal);
  stage("checking");
  if (!results.movies.length) return { ...base, criteria: c, partial: results.partial, message: "Chưa tìm thấy phim khớp tất cả tiêu chí trong phạm vi vừa tra cứu. Bạn có thể thêm tên gốc hoặc một chi tiết nội dung, hoặc chủ động bỏ bớt tiêu chí.", followUps: ["Bỏ giới hạn năm", "Tôi muốn bổ sung nội dung phim"] };
  const evidence = results.movies;
  const final = await deps.client.responses.parse({
    model, store: false, instructions: `${SYSTEM_PROMPT}\n${RANK_PROMPT}`, max_output_tokens: 1600,
    input: [...input, ...toResponseInputItems(plan.output), { type: "function_call_output", call_id: calls[0].call_id, output: JSON.stringify({ evidence, partial: results.partial, coverage: "Tối đa 6 truy vấn danh mục, 16 chi tiết phim; không phải toàn bộ kho phim." }) }],
    text: { format: zodTextFormat(answerSchema, "movie_answer") },
  }, { signal });
  if (final.status !== "completed" || !final.output_parsed) throw new ChatError("MODEL_INCOMPLETE", 502, "Chưa tổng hợp được kết quả. Bạn thử lại nhé.");
  const grounded = groundAnswer(answerSchema.parse(final.output_parsed), evidence, !!c.plot);
  if (!grounded.movies.length) grounded.message = "Tôi chưa có đủ bằng chứng để chọn phim khớp mô tả này. Bạn nhớ nhân vật, diễn viên hay một cảnh cụ thể nào không?";
  return { ...grounded, criteria: c, partial: results.partial };
}
export function logChatTrace(data: { requestId: string; status: string; elapsedMs: number; results?: number; error?: string }) {
  // Never log messages, provider payloads, raw errors, credentials or reasoning.
  console.info(JSON.stringify({ event: "movie_chat", version: CHAT_VERSION, ...data }));
}
