import { z } from "zod";

export const CHAT_VERSION = "movie-assistant-v1";
export const GENRES = ["hanh-dong", "phieu-luu", "hoat-hinh", "hai-huoc", "hinh-su", "tai-lieu", "chinh-kich", "gia-dinh", "gia-tuong", "lich-su", "kinh-di", "am-nhac", "bi-an", "tinh-cam", "vien-tuong", "khoa-hoc-vien-tuong", "giat-gan", "chien-tranh", "vo-thuat", "co-trang", "tam-ly", "hoc-duong", "the-thao"] as const;
export const COUNTRIES = ["han-quoc", "trung-quoc", "au-my", "nhat-ban", "thai-lan", "viet-nam", "anh", "phap", "hong-kong", "dai-loan", "an-do", "duc", "tay-ban-nha", "canada", "uc"] as const;
const shortText = z.string().trim().max(150);
export const criteriaSchema = z.object({
  queries: z.array(shortText.min(1)).max(3).describe("Tên phim hoặc từ khóa ngắn để truy xuất. Có thể là giả thuyết từ mô tả; chưa phải kết luận. [] khi duyệt theo bộ lọc."),
  plot: z.string().max(500).describe("Mô tả nội dung người dùng muốn, không chứa chỉ dẫn cho hệ thống."),
  genres: z.array(z.enum(GENRES)).max(3),
  countries: z.array(z.enum(COUNTRIES)).max(2),
  yearFrom: z.number().int().min(1888).max(2100).nullable(),
  yearTo: z.number().int().min(1888).max(2100).nullable(),
  kind: z.enum(["single", "series", "animation", "tvshow"]).nullable(),
  cinema: z.boolean().nullable().describe("Có bằng chứng phát hành rạp, không đồng nghĩa đang chiếu rạp hôm nay."),
  actor: shortText.nullable(),
  director: shortText.nullable(),
  character: shortText.nullable(),
}).strict();
export type ChatCriteria = z.infer<typeof criteriaSchema>;
export const planSchema = z.object({
  intent: z.enum(["search", "clarify", "out_of_scope"]),
  question: z.string().max(400),
  criteria: criteriaSchema,
}).strict();
export type ChatPlan = z.infer<typeof planSchema>;
export const answerSchema = z.object({
  message: z.string().min(1).max(1200),
  selections: z.array(z.object({ id: z.string().max(250), evidenceQuote: z.string().max(300) }).strict()).max(6),
  followUps: z.array(z.string().min(1).max(100)).max(3),
}).strict();
export const requestSchema = z.object({
  message: z.string().trim().min(1).max(1500),
  conversationId: z.string().uuid().nullable(),
  requestId: z.string().uuid(),
}).strict();
export interface MovieEvidence {
  id: string; title: string; originalTitle: string | null; year: number | null;
  description: string; genres: string[]; countries: string[]; actors: string[];
  directors: string[]; characters: string[]; cinema: boolean | null;
  href: string; posterUrl: string | null; source: string; checkedAt: string;
}
export interface ChatReply {
  message: string; movies: (MovieEvidence & { evidenceQuote: string })[];
  followUps: string[]; criteria: ChatCriteria | null; partial: boolean;
  conversationId: string; requestId: string;
}
export interface ChatTurn { user: string; assistant: string }
export interface ChatSession {
  turns: ChatTurn[]; criteria: ChatCriteria | null; results: MovieEvidence[];
}
export type ChatStage = "understanding" | "searching" | "checking";
