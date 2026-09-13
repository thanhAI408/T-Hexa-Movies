import "server-only";
import pLimit from "p-limit";
import { normalizeKkphimDetail, normalizeKkphimList } from "@/providers/kkphim/normalize";
import { kkphimDetailResponseSchema, kkphimListResponseSchema } from "@/providers/kkphim/schemas";
import { normalizeOPhimDetailResponse, normalizeOPhimListResponse } from "@/providers/ophim/normalize";
import { ophimDetailResponseSchema, ophimListResponseSchema } from "@/providers/ophim/schema";
import type { ProviderMovieInput } from "@/types/catalog";
import type { ChatCriteria, MovieEvidence } from "./schema";
import { normalize, safeProviderText } from "./guardrails";
import { internationalCandidates } from "./international";

const SOURCES = [
  { id: "kkphim", base: "https://phimapi.com", store: "da-nguyet", name: "Dạ Nguyệt · KKPhim" },
  { id: "ophim", base: "https://ophim1.com", store: "ban-mai", name: "Ban Mai · OPhim" },
] as const;
const paths = { single: "phim-le", series: "phim-bo", animation: "hoat-hinh", tvshow: "tv-shows" };
const boundedJson = async (url: URL, signal: AbortSignal) => {
  const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(6500)]), redirect: "error", cache: "no-store", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("CATALOG_UNAVAILABLE");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("CATALOG_EMPTY");
  let bytes = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      bytes += value.byteLength;
      if (bytes > 2_000_000) { await reader.cancel(); throw new Error("CATALOG_SIZE"); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } finally { reader.releaseLock(); }
};
const equivalent = (s: string) => normalize(s).replace("khoa hoc vien tuong", "vien tuong");
export function matchesCriteria(movie: ProviderMovieInput, c: ChatCriteria, detailed = true) {
  if (c.kind && movie.type !== c.kind) return false;
  if (c.yearFrom && (!movie.year || movie.year < c.yearFrom)) return false;
  if (c.yearTo && (!movie.year || movie.year > c.yearTo)) return false;
  if (c.genres.some(g => !movie.genres.some(v => equivalent(v.slug) === equivalent(g)))) return false;
  if (c.countries.length && !c.countries.some(g => movie.countries.some(v => equivalent(v.slug) === equivalent(g)))) return false;
  if (!detailed) return true;
  // false in a normalized model may mean missing data; inspect explicit evidence.
  const cinema = movie.isCinema && !!movie.cinemaEvidence ? true : movie.raw.chieurap === false ? false : null;
  if (c.cinema !== null && cinema !== c.cinema) return false;
  if (c.actor && !movie.actors.some(a => normalize(a).includes(normalize(c.actor!)))) return false;
  if (c.director && !movie.directors.some(a => normalize(a).includes(normalize(c.director!)))) return false;
  const characters = Array.isArray(movie.raw.characters) ? movie.raw.characters.filter((x): x is string => typeof x === "string") : [];
  if (c.character && !normalize([movie.title, movie.originalTitle, movie.description, ...characters].join(" ")).includes(normalize(c.character))) return false;
  return true;
}
function toEvidence(movie: ProviderMovieInput): MovieEvidence | null {
  const source = SOURCES.find(s => s.id === movie.provider) || (movie.provider === "vidsrc" ? { store: "ban-mai", name: "Tinh Tú · TMDB (chưa kiểm tra phát)" } : null);
  if (!source || !/^[\p{L}\p{N}_-]{1,180}$/u.test(movie.providerSlug)) return null;
  const title = safeProviderText(movie.title, 180);
  if (!title) return null;
  let posterUrl: string | null = null;
  try { const url = new URL(movie.posterUrl || ""); if (url.protocol === "https:" && !url.username && !url.password) posterUrl = url.toString(); } catch { /* Missing poster is valid. */ }
  return {
    id: `${movie.provider}~${movie.providerSlug}`, title,
    originalTitle: movie.originalTitle ? safeProviderText(movie.originalTitle, 180) : null,
    year: movie.year, description: safeProviderText(movie.description || "", 1400),
    genres: movie.genres.map(x => safeProviderText(x.name, 50)), countries: movie.countries.map(x => safeProviderText(x.name, 50)),
    actors: movie.actors.slice(0, 10).map(x => safeProviderText(x, 80)), directors: movie.directors.slice(0, 4).map(x => safeProviderText(x, 80)), characters: Array.isArray(movie.raw.characters) ? movie.raw.characters.filter((x): x is string => typeof x === "string").slice(0, 12).map(x => safeProviderText(x, 80)) : [],
    cinema: movie.isCinema && !!movie.cinemaEvidence ? true : movie.raw.chieurap === false ? false : null,
    href: `/stores/${source.store}/movie/${encodeURIComponent(`${movie.provider}~${movie.providerSlug}`)}`,
    posterUrl, source: source.name, checkedAt: new Date().toISOString(),
  };
}
export interface CatalogEvidence { movies: MovieEvidence[]; partial: boolean; sourcesChecked: number }
export async function searchMovieEvidence(c: ChatCriteria, signal: AbortSignal): Promise<CatalogEvidence> {
  if (c.yearFrom && c.yearTo && c.yearFrom > c.yearTo) return { movies: [], partial: false, sourcesChecked: 0 };
  const queries = c.queries.length ? c.queries : c.character ? [c.character] : [""];
  const international = internationalCandidates({ ...c, queries: queries.filter(Boolean) }, signal).catch(() => ({ movies: [] as ProviderMovieInput[], partial: true }));
  const years = c.yearFrom && c.yearTo ? Array.from({ length: Math.min(3, c.yearTo - c.yearFrom + 1) }, (_, i) => String(c.yearTo! - i)) : [c.yearFrom === c.yearTo && c.yearFrom ? String(c.yearFrom) : ""];
  const jobs = SOURCES.flatMap(source => queries.flatMap(q => (q ? [""] : years).map(year => ({ source, q, year })))).slice(0, 6);
  const limit = pLimit(4); let failures = 0;
  const lists = await Promise.all(jobs.map(job => limit(async () => {
    signal.throwIfAborted();
    const kind = c.cinema === true ? "phim-chieu-rap" : c.kind ? paths[c.kind] : "phim-moi-cap-nhat";
    const url = new URL(`/v1/api/${job.q ? "tim-kiem" : `danh-sach/${kind}`}`, job.source.base);
    url.searchParams.set("limit", "48"); url.searchParams.set("page", "1");
    if (job.q) url.searchParams.set("keyword", job.q);
    if (c.genres[0]) url.searchParams.set("category", c.genres[0] === "khoa-hoc-vien-tuong" ? "vien-tuong" : c.genres[0]);
    if (c.countries.length === 1) url.searchParams.set("country", c.countries[0]);
    if (job.year) url.searchParams.set("year", job.year);
    try {
      const raw = await boundedJson(url, signal);
      return job.source.id === "kkphim"
        ? normalizeKkphimList(kkphimListResponseSchema.parse(raw), 1, { requestedLimit: 48, officialCinemaList: c.cinema === true && !job.q }).items
        : normalizeOPhimListResponse(ophimListResponseSchema.parse(raw), { requestedPage: 1, requestedLimit: 48, cinemaFromEndpoint: c.cinema === true && !job.q }).items;
    } catch { failures++; return []; }
  })));
  const unique = new Map<string, ProviderMovieInput>();
  for (const movie of lists.flat()) if (matchesCriteria(movie, c, false)) unique.set(`${movie.provider}~${movie.providerSlug}`, movie);
  // Rank title candidates first, interleave providers so one provider cannot consume the entire budget.
  const titleScore = (m: ProviderMovieInput) => Math.max(0, ...queries.map(q => q && [m.title, m.originalTitle || ""].some(t => normalize(t) === normalize(q)) ? 10 : q && normalize(`${m.title} ${m.originalTitle}`).includes(normalize(q)) ? 5 : 0));
  const pool = [...unique.values()].sort((a, b) => titleScore(b) - titleScore(a));
  const candidates: ProviderMovieInput[] = [];
  for (let i = 0; candidates.length < 16; i++) {
    let added = false;
    for (const source of SOURCES) { const item = pool.filter(m => m.provider === source.id)[i]; if (item) { candidates.push(item); added = true; } }
    if (!added) break;
  }
  const details = await Promise.all(candidates.map(movie => limit(async () => {
    signal.throwIfAborted();
    const source = SOURCES.find(s => s.id === movie.provider)!;
    if (!/^[\p{L}\p{N}_-]{1,180}$/u.test(movie.providerSlug)) return null;
    const url = new URL(`/phim/${encodeURIComponent(movie.providerSlug)}`, source.base);
    try {
      const raw = await boundedJson(url, signal);
      const detail = source.id === "kkphim" ? normalizeKkphimDetail(kkphimDetailResponseSchema.parse(raw)) : normalizeOPhimDetailResponse(ophimDetailResponseSchema.parse(raw));
      if (!detail || detail.movie.providerSlug !== movie.providerSlug || detail.movie.provider !== movie.provider) return null;
      if (movie.isCinema && movie.cinemaEvidence && !detail.movie.cinemaEvidence && detail.movie.raw.chieurap !== false) { detail.movie.isCinema = true; detail.movie.cinemaEvidence = movie.cinemaEvidence; }
      return matchesCriteria(detail.movie, c) ? toEvidence(detail.movie) : null;
    } catch { failures++; return null; }
  })));
  // Preserve distinct years/remakes; merge only matching original title AND year.
  const extra = await international;
  const seen = new Set<string>();
  const movies = [...details, ...extra.movies.filter(m => matchesCriteria(m, c)).map(toEvidence)].filter((m): m is MovieEvidence => !!m).filter(m => {
    const key = `${normalize(m.originalTitle || m.title)}:${m.year || m.id}`;
    if (seen.has(key)) return false; seen.add(key); return true;
  });
  return { movies: movies.slice(0, 16), partial: failures > 0 || extra.partial || pool.length > candidates.length || c.yearTo !== c.yearFrom, sourcesChecked: jobs.length + 1 };
}
