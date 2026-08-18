import type {
  MovieType,
  ProviderEpisodeInput,
  ProviderId,
  StreamType,
  TaxonomyItem,
} from "@/types/catalog";

const HTML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

export function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity: string) => {
      const lower = entity.toLowerCase();
      if (lower.startsWith("#x")) {
        return String.fromCodePoint(Number.parseInt(lower.slice(2), 16));
      }
      if (lower.startsWith("#")) {
        return String.fromCodePoint(Number.parseInt(lower.slice(1), 10));
      }
      return HTML_ENTITY_MAP[lower] ?? " ";
    })
    .replace(/\s+/g, " ")
    .trim();
  return text || null;
}

export function normalizeTitle(value: unknown) {
  const text = cleanText(value) ?? "";
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\b(?:phan|season)\s*(\d+)\b/g, " season $1 ")
    .replace(/\bs\s*(\d+)\b/g, " season $1 ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function safeString(value: unknown) {
  return cleanText(value);
}

export function safeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.map(cleanText).filter((item): item is string => Boolean(item)))];
  }
  if (typeof value === "string") {
    return [...new Set(value.split(",").map(cleanText).filter((item): item is string => Boolean(item)))];
  }
  return [];
}

export function toNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(number) ? number : null;
}

export function toYear(value: unknown): number | null {
  const year = toNumber(value);
  return year && year >= 1888 && year <= new Date().getFullYear() + 5 ? year : null;
}

export function parseDuration(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== "string") return null;
  const hours = value.match(/(\d+)\s*(?:giờ|gio|h)\b/i);
  const minutes = value.match(/(\d+)\s*(?:phút|phut|m|min)/i);
  if (hours || minutes) {
    return (hours ? Number(hours[1]) * 60 : 0) + (minutes ? Number(minutes[1]) : 0);
  }
  const firstNumber = value.match(/\d+/)?.[0];
  return firstNumber ? Number(firstNumber) : null;
}

export function normalizeMovieType(value: unknown): MovieType {
  const normalized = normalizeTitle(value);
  if (["single", "phim le"].includes(normalized)) return "single";
  if (["series", "phim bo"].includes(normalized)) return "series";
  if (["hoat hinh", "animation"].includes(normalized)) return "animation";
  if (["tvshows", "tv show", "tv shows"].includes(normalized)) return "tvshow";
  return "unknown";
}

export function normalizeTaxonomy(
  value: unknown,
  fallbackPrefix: string,
): TaxonomyItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const name = cleanText(record.name);
    const slug = normalizeTitle(record.slug ?? name).replace(/\s+/g, "-");
    if (!name || !slug) return [];
    return [
      {
        id: String(record.id ?? record._id ?? `${fallbackPrefix}-${index}-${slug}`),
        name,
        slug,
      },
    ];
  });
}

export function normalizeImageUrl(
  value: unknown,
  cdnBase?: string | null,
  bareFileUsesMoviePath = false,
): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();
  try {
    const absolute = new URL(raw);
    return ["http:", "https:"].includes(absolute.protocol) ? absolute.toString() : null;
  } catch {
    if (!cdnBase) return null;
    const cleaned = raw.replace(/^\/+/, "");
    const relative = bareFileUsesMoviePath && !cleaned.includes("/")
      ? `uploads/movies/${cleaned}`
      : cleaned;
    try {
      return new URL(relative, cdnBase.endsWith("/") ? cdnBase : `${cdnBase}/`).toString();
    } catch {
      return null;
    }
  }
}

export function normalizeMediaUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function inferStreamType(streamUrl: string | null, embedUrl: string | null): StreamType {
  if (streamUrl) {
    const lower = streamUrl.toLowerCase();
    if (lower.includes(".m3u8")) return "hls";
    if (lower.includes(".mp4")) return "mp4";
    return "unknown";
  }
  return embedUrl ? "embed" : "unknown";
}

export function episodeIdentity(label: unknown, slug: unknown, index: number) {
  const safeLabel = cleanText(label) ?? `Tập ${index + 1}`;
  const safeSlug = cleanText(slug);
  const combined = normalizeTitle(safeSlug ?? safeLabel);
  const episodeMatch = combined.match(/(?:tap|episode|ep)\s*(\d+(?:\.\d+)?)/i);
  const plainNumber = combined.match(/^(\d+(?:\.\d+)?)$/);
  const full = /\b(full|trọn bộ|tron bo)\b/i.test(combined);
  const episodeNumber = episodeMatch
    ? Number(episodeMatch[1])
    : plainNumber
      ? Number(plainNumber[1])
      : full
        ? 1
        : null;
  const seasonMatch = combined.match(/season\s*(\d+)/i);
  const seasonNumber = seasonMatch ? Number(seasonMatch[1]) : null;
  const episodeKey = `${seasonNumber ?? 0}:${episodeNumber ?? (combined || index + 1)}`;
  return { episodeKey, episodeLabel: safeLabel, episodeNumber, seasonNumber };
}

export function makeEpisodeSource(input: {
  provider: ProviderId;
  serverName: unknown;
  label: unknown;
  slug: unknown;
  index: number;
  streamUrl?: unknown;
  embedUrl?: unknown;
  quality?: unknown;
  language?: unknown;
}): ProviderEpisodeInput | null {
  const streamUrl = normalizeMediaUrl(input.streamUrl);
  const embedUrl = normalizeMediaUrl(input.embedUrl);
  if (!streamUrl && !embedUrl) return null;
  const identity = episodeIdentity(input.label, input.slug, input.index);
  return {
    ...identity,
    episodeTitle: null,
    provider: input.provider,
    serverName: cleanText(input.serverName) ?? "Server",
    streamType: inferStreamType(streamUrl, embedUrl),
    streamUrl,
    embedUrl,
    quality: cleanText(input.quality),
    language: cleanText(input.language),
  };
}
