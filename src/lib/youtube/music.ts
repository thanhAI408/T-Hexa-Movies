import type { YoutubeVideo } from "./types";

export const MUSIC_GENRES = [
  { id: "all", label: "Tất cả nhạc", query: "music", language: "vi" },
  {
    id: "hot-viet",
    label: "Nhạc hot Việt",
    query: "nhạc Việt Vpop official music",
    language: "vi",
  },
  { id: "lofi", label: "Lofi", query: "lofi chill beats", language: "en" },
  { id: "remix", label: "Remix", query: "nhạc remix", language: "vi" },
  { id: "nhac-tre", label: "Nhạc trẻ", query: "nhạc trẻ Vpop", language: "vi" },
  {
    id: "study",
    label: "Nhạc học tập",
    query: "study music instrumental concentration",
    language: "en",
  },
  {
    id: "work",
    label: "Nhạc làm việc",
    query: "deep focus music work instrumental",
    language: "en",
  },
  { id: "ballad", label: "Ballad", query: "nhạc ballad Việt", language: "vi" },
  {
    id: "uk-us",
    label: "UK / US",
    query: "English pop music official",
    language: "en",
  },
  { id: "chill", label: "Chill", query: "nhạc chill thư giãn", language: "vi" },
  {
    id: "acoustic",
    label: "Acoustic",
    query: "acoustic music guitar",
    language: "en",
  },
  {
    id: "rap",
    label: "Rap / Hip-hop",
    query: "rap hip hop music",
    language: "vi",
  },
  {
    id: "edm",
    label: "EDM",
    query: "EDM electronic dance music",
    language: "en",
  },
  {
    id: "piano",
    label: "Piano",
    query: "piano instrumental music",
    language: "en",
  },
  { id: "jazz", label: "Jazz", query: "jazz music", language: "en" },
  {
    id: "bolero",
    label: "Bolero",
    query: "nhạc bolero trữ tình",
    language: "vi",
  },
] as const;
export type MusicGenre = (typeof MUSIC_GENRES)[number]["id"];
export type MusicOrder = "relevance" | "hot" | "viewCount" | "date";
export function musicGenre(value?: string | null) {
  return MUSIC_GENRES.find((genre) => genre.id === value) || MUSIC_GENRES[0];
}
export function musicOrder(value?: string | null): MusicOrder {
  return value === "hot" || value === "viewCount" || value === "date"
    ? value
    : "relevance";
}
function plain(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase();
}
export function inferMusicGenre(
  video: Pick<YoutubeVideo, "title">,
): MusicGenre {
  const title = plain(video.title);
  const rules: [MusicGenre, RegExp][] = [
    ["study", /study|hoc tap|concentration/],
    ["work", /work|lam viec|focus/],
    ["lofi", /lo[ -]?fi/],
    ["remix", /remix|vinahouse|nonstop/],
    ["ballad", /ballad|balad/],
    ["acoustic", /acoustic/],
    ["piano", /piano/],
    ["jazz", /jazz/],
    ["bolero", /bolero|tru tinh/],
    ["rap", /\brap\b|hip[ -]?hop/],
    ["edm", /\bedm\b|electronic|dance mix/],
    ["chill", /chill/],
    ["uk-us", /uk[ /-]*us|english|billboard/],
  ];
  return rules.find(([, pattern]) => pattern.test(title))?.[0] || "all";
}
export function musicWatchHref(
  video: Pick<YoutubeVideo, "id" | "title">,
  genre?: MusicGenre,
) {
  const resolved = genre && genre !== "all" ? genre : inferMusicGenre(video);
  return `/youtube?${new URLSearchParams({ v: video.id, ...(resolved !== "all" ? { music: resolved } : {}) })}`;
}
export function musicQuery(genre: MusicGenre, query: string) {
  const cleaned = query.trim().replace(/\s+/g, " ");
  const config = musicGenre(genre);
  return cleaned
    ? genre === "all"
      ? cleaned
      : `${cleaned} ${config.query}`
    : config.query;
}
/** Ranking applies to the returned candidate pool, not a claim about YouTube's global chart. */
export function matchesMusicGenre(video: YoutubeVideo, genre: MusicGenre) {
  const title = plain(video.title);
  // View-count search can broaden the matches. Require concrete evidence for
  // these categories instead of labeling every upstream search hit as a match.
  if (genre === "lofi") return /\blo[ -]?fi\b/.test(title);
  if (genre === "remix") return /remix|vinahouse|nonstop/.test(title);
  if (genre === "uk-us") {
    const language = video.defaultAudioLanguage || video.defaultLanguage;
    if (language) return /^en(?:-|$)/i.test(language);
    return /\benglish\b|\buk[ /-]*us\b/.test(title);
  }
  return true;
}
export function rankMusic(
  videos: YoutubeVideo[],
  order: MusicOrder,
  now = Date.now(),
) {
  const unique = [
    ...new Map(
      videos.filter((v) => v.categoryId === "10").map((v) => [v.id, v]),
    ).values(),
  ];
  const views = (v: YoutubeVideo) => Math.max(0, Number(v.views) || 0);
  const published = (v: YoutubeVideo) => Date.parse(v.publishedAt) || 0;
  const heat = (v: YoutubeVideo) =>
    views(v) / Math.pow(Math.max(1, (now - published(v)) / 86400000), 0.8);
  if (order === "viewCount") unique.sort((a, b) => views(b) - views(a));
  if (order === "date") unique.sort((a, b) => published(b) - published(a));
  if (order === "hot") unique.sort((a, b) => heat(b) - heat(a));
  return unique;
}
