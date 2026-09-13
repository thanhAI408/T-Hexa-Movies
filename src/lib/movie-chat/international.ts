import "server-only";
import { z } from "zod";
import pLimit from "p-limit";
import { fetchTmdb, normalize as normalizeTmdb, tmdbItem } from "@/providers/vidsrc";
import { normalize } from "./guardrails";
import type { ChatCriteria } from "./schema";
import type { ProviderMovieInput } from "@/types/catalog";

const creditSchema = z.object({ cast: z.array(z.object({ name: z.string(), character: z.string().optional() })).default([]), crew: z.array(z.object({ name: z.string(), job: z.string().optional() })).default([]) });
const releaseSchema = z.object({ results: z.array(z.object({ release_dates: z.array(z.object({ type: z.number() })) })).default([]) });
const list = z.object({ results: z.array(tmdbItem) });
const genreIds: Record<string, number> = { "hanh-dong": 28, "phieu-luu": 12, "hoat-hinh": 16, "hai-huoc": 35, "hinh-su": 80, "tai-lieu": 99, "chinh-kich": 18, "gia-dinh": 10751, "gia-tuong": 14, "lich-su": 36, "kinh-di": 27, "am-nhac": 10402, "bi-an": 9648, "tinh-cam": 10749, "vien-tuong": 878, "khoa-hoc-vien-tuong": 878, "giat-gan": 53, "chien-tranh": 10752 };
const countryIds: Record<string, string> = { "han-quoc": "KR", "trung-quoc": "CN", "au-my": "US", "nhat-ban": "JP", "thai-lan": "TH", "viet-nam": "VN", "anh": "GB", "phap": "FR", "hong-kong": "HK", "dai-loan": "TW", "an-do": "IN", "duc": "DE", "tay-ban-nha": "ES", canada: "CA", uc: "AU" };
export async function internationalCandidates(c: ChatCriteria, signal: AbortSignal) {
  const rows: z.infer<typeof tmdbItem>[] = [];
  let partial = false;
  const limit = pLimit(3);
  if (c.actor || c.director) {
    for (const name of [c.actor, c.director].filter((n): n is string => !!n)) {
      try {
        const people = z.object({ results: z.array(z.object({ id: z.number().int().positive(), name: z.string() })) }).parse(await fetchTmdb("/search/person", { query: name }, signal));
        const exact = people.results.filter(p => normalize(p.name) === normalize(name));
        if (exact.length !== 1) { partial = true; continue; }
        const filmography = z.object({ cast: z.array(tmdbItem).default([]), crew: z.array(tmdbItem.extend({ job: z.string().optional() })).default([]) }).parse(await fetchTmdb(`/person/${exact[0].id}/combined_credits`, {}, signal));
        rows.push(...(name === c.actor ? filmography.cast : filmography.crew.filter(m => m.job === "Director")));
      } catch { partial = true; }
    }
  }
  if (c.queries.length) {
    await Promise.all(c.queries.map(q => limit(async () => { try { rows.push(...list.parse(await fetchTmdb("/search/multi", { query: q, include_adult: "false", page: 1 }, signal)).results); } catch { partial = true; } })));
  } else if (!rows.length) {
    const media = c.kind === "series" || c.kind === "tvshow" ? "tv" : "movie";
    // Do not send approximate TMDB TV taxonomy mappings as exact genre evidence.
    const params: Record<string, string | number> = { include_adult: "false", page: 1, sort_by: "popularity.desc" };
    if (c.genres.length && c.genres.every(g => genreIds[g]) && media === "movie") params.with_genres = c.genres.map(g => genreIds[g]).join(",");
    if (c.countries.length) params.with_origin_country = c.countries.map(g => countryIds[g]).filter(Boolean).join("|");
    if (c.yearFrom) params[media === "movie" ? "primary_release_date.gte" : "first_air_date.gte"] = `${c.yearFrom}-01-01`;
    if (c.yearTo) params[media === "movie" ? "primary_release_date.lte" : "first_air_date.lte"] = `${c.yearTo}-12-31`;
    try { rows.push(...list.parse(await fetchTmdb(`/discover/${media}`, params, signal)).results.map(r => ({ ...r, media_type: media as "tv" | "movie" }))); } catch { partial = true; }
  }
  const unique = new Map(rows.filter(r => r.media_type === "tv" || r.media_type === "movie").map(r => [`${r.media_type}-${r.id}`, r]));
  const eligible = [...unique.values()].filter(r => {
    const year = Number((r.release_date || r.first_air_date || "").slice(0, 4));
    return (!c.yearFrom || year >= c.yearFrom) && (!c.yearTo || year <= c.yearTo) && (!c.kind || c.kind !== "series" || r.media_type === "tv") && (!c.kind || c.kind !== "single" || r.media_type === "movie");
  });
  const movies = (await Promise.all(eligible.slice(0, 8).map(row => limit(async () => {
    signal.throwIfAborted();
    const media = row.media_type as "movie" | "tv";
    try {
      const raw = await fetchTmdb(`/${media}/${row.id}`, { append_to_response: media === "movie" ? "credits,release_dates" : "credits" }, signal);
      const parsed = tmdbItem.parse(raw); const movie = normalizeTmdb(parsed, "vidsrc", media);
      const credits = creditSchema.parse(raw.credits || {});
      movie.actors = credits.cast.map(p => p.name); movie.directors = credits.crew.filter(p => p.job === "Director").map(p => p.name);
      const characters = credits.cast.map(p => p.character || "").filter(Boolean);
      const theatrical = media === "movie" && releaseSchema.parse(raw.release_dates || {}).results.some(r => r.release_dates.some(d => d.type === 2 || d.type === 3));
      movie.isCinema = theatrical; movie.cinemaEvidence = theatrical ? "tmdb:release_dates:theatrical" : null;
      movie.raw = { characters, ...(media === "tv" ? { chieurap: false } : {}) };
      return movie;
    } catch { partial = true; return null; }
  })))).filter((m): m is ProviderMovieInput => !!m);
  return { movies, partial: partial || eligible.length > 8 };
}
