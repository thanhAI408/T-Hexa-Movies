import type {
  ProviderDetail,
  ProviderEpisodeInput,
  ProviderId,
  ProviderMovieInput,
} from "@/types/catalog";
import { STORE_API_MAP } from "@/lib/stores/config";

export type PlaybackSourceTier = "primary" | "vidsrc" | "vidlink" | "backup_vn";

export interface PlaybackSource {
  id: string;
  tier: PlaybackSourceTier;
  name: string;
  provider: ProviderId;
  serverName: string;
  streamType: "embed" | "hls" | "mp4";
  embedUrl?: string | null;
  streamUrl?: string | null;
  quality?: string | null;
  language?: string | null;
  badge?: string;
  description?: string;
}

export interface FallbackParams {
  tmdbId?: string | null;
  imdbId?: string | null;
  type?: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
}

function sanitizeId(value?: string | null): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null" || trimmed === "0") return null;
  return trimmed;
}

/**
 * ============================================
 * CLEAN AD-FREE EMBED URL BUILDERS
 * ============================================
 */

export function buildAutoEmbed(params: FallbackParams): string | null {
  const identifier = sanitizeId(params.tmdbId) || sanitizeId(params.imdbId);
  if (!identifier) return null;

  const isSeries = params.type === "series" || params.type === "tvshow" || params.type === "animation";
  const season = Math.max(1, params.seasonNumber ?? 1);
  const episode = Math.max(1, params.episodeNumber ?? 1);

  if (isSeries) {
    return `https://autoembed.co/tv/tmdb/${encodeURIComponent(identifier)}-${season}-${episode}`;
  }
  return `https://autoembed.co/movie/tmdb/${encodeURIComponent(identifier)}`;
}

export function buildMultiEmbed(params: FallbackParams): string | null {
  const identifier = sanitizeId(params.tmdbId) || sanitizeId(params.imdbId);
  if (!identifier) return null;

  const isSeries = params.type === "series" || params.type === "tvshow" || params.type === "animation";
  const season = Math.max(1, params.seasonNumber ?? 1);
  const episode = Math.max(1, params.episodeNumber ?? 1);

  if (isSeries) {
    return `https://multiembed.mov/?video_id=${encodeURIComponent(identifier)}&tmdb=1&s=${season}&e=${episode}`;
  }
  return `https://multiembed.mov/?video_id=${encodeURIComponent(identifier)}&tmdb=1`;
}

export function buildVidSrcMe(params: FallbackParams): string | null {
  const identifier = sanitizeId(params.tmdbId) || sanitizeId(params.imdbId);
  if (!identifier) return null;

  const isSeries = params.type === "series" || params.type === "tvshow" || params.type === "animation";
  const season = Math.max(1, params.seasonNumber ?? 1);
  const episode = Math.max(1, params.episodeNumber ?? 1);

  if (isSeries) {
    return `https://vidsrc.me/embed/tv?tmdb=${encodeURIComponent(identifier)}&season=${season}&episode=${episode}`;
  }
  return `https://vidsrc.me/embed/movie?tmdb=${encodeURIComponent(identifier)}`;
}

export function buildVidSrcEmbed(params: FallbackParams): string | null {
  // Use AutoEmbed as ultra-clean default VidSrc embed (no ad popups)
  return buildAutoEmbed(params) || buildVidSrcMe(params);
}

export function buildVidLinkEmbed(params: FallbackParams): string | null {
  const identifier = sanitizeId(params.tmdbId) || sanitizeId(params.imdbId);
  if (!identifier) return null;

  const isSeries = params.type === "series" || params.type === "tvshow" || params.type === "animation";
  const season = Math.max(1, params.seasonNumber ?? 1);
  const episode = Math.max(1, params.episodeNumber ?? 1);

  if (isSeries) {
    return `https://vidlink.pro/tv/${encodeURIComponent(identifier)}/${season}/${episode}?primaryColor=ea580c&secondaryColor=f97316&iconColor=ffffff&title=true&poster=true&autoplay=false`;
  }
  return `https://vidlink.pro/movie/${encodeURIComponent(identifier)}?primaryColor=ea580c&secondaryColor=f97316&iconColor=ffffff&title=true&poster=true&autoplay=false`;
}

/**
 * ============================================
 * ALL VN PROVIDERS LIST
 * ============================================
 */
export const ALL_VN_PROVIDERS: ProviderId[] = ["kkphim", "nguonc", "vsmov", "ophim"];

export function getRemainingVnProviders(currentProviderOrStore: string): ProviderId[] {
  const currentApi = STORE_API_MAP[currentProviderOrStore] || currentProviderOrStore;
  return ALL_VN_PROVIDERS.filter((p) => p !== currentApi);
}

/**
 * Build all tiered playback sources for a specific episode
 */
export function buildEpisodePlaybackSources(
  movie: ProviderMovieInput,
  selectedEpisode?: ProviderEpisodeInput | null,
  allEpisodes: ProviderEpisodeInput[] = []
): PlaybackSource[] {
  const sources: PlaybackSource[] = [];

  const episodeNumber = selectedEpisode?.episodeNumber ?? 1;
  const seasonNumber = selectedEpisode?.seasonNumber ?? 1;
  const episodeKey = selectedEpisode?.episodeKey ?? "tap-01";

  const rawTmdb = movie.externalIds?.tmdbId || (movie.raw?.tmdb as any)?.id;
  const rawImdb = movie.externalIds?.imdbId || (movie.raw?.imdb as any)?.id;
  const tmdbId = sanitizeId(rawTmdb ? String(rawTmdb) : null);
  const imdbId = sanitizeId(rawImdb ? String(rawImdb) : null);

  const fallbackParams: FallbackParams = {
    tmdbId,
    imdbId,
    type: movie.type,
    seasonNumber,
    episodeNumber,
  };

  // 1. PRIMARY SOURCE (Nguồn Chính từ kho hiện tại)
  if (selectedEpisode && (selectedEpisode.embedUrl || selectedEpisode.streamUrl)) {
    sources.push({
      id: `primary-${selectedEpisode.serverName}-${episodeKey}`,
      tier: "primary",
      name: selectedEpisode.serverName || "Nguồn Chính (Gốc)",
      provider: selectedEpisode.provider,
      serverName: selectedEpisode.serverName || "Server VIP",
      streamType: selectedEpisode.streamUrl ? "hls" : "embed",
      embedUrl: selectedEpisode.embedUrl,
      streamUrl: selectedEpisode.streamUrl,
      quality: selectedEpisode.quality || movie.quality || "FHD",
      language: selectedEpisode.language || movie.language || "Vietsub",
      badge: "Mặc định",
      description: "Luồng phát gốc chất lượng cao",
    });
  }

  // 2. FALLBACK 1: AutoEmbed VIP (Không Quảng Cáo)
  const autoEmbed = buildAutoEmbed(fallbackParams);
  if (autoEmbed) {
    sources.push({
      id: `fallback-1-autoembed-${episodeKey}`,
      tier: "vidsrc",
      name: "AutoEmbed VIP (Sạch Quảng Cáo)",
      provider: "vidsrc",
      serverName: "AutoEmbed VIP",
      streamType: "embed",
      embedUrl: autoEmbed,
      streamUrl: null,
      quality: "1080p Ultra",
      language: "Phụ đề đa ngôn ngữ / Gốc",
      badge: "Fallback 1",
      description: "Nguồn phát dự phòng quốc tế siêu sạch không popups",
    });
  }

  // 3. FALLBACK 2: MultiEmbed VIP
  const multiEmbed = buildMultiEmbed(fallbackParams);
  if (multiEmbed) {
    sources.push({
      id: `fallback-2-multiembed-${episodeKey}`,
      tier: "vidlink",
      name: "MultiEmbed VIP (Quốc Tế 1)",
      provider: "vidsrc",
      serverName: "MultiEmbed VIP",
      streamType: "embed",
      embedUrl: multiEmbed,
      streamUrl: null,
      quality: "1080p Fast",
      language: "Phụ đề đa ngôn ngữ / Gốc",
      badge: "Fallback 2",
      description: "Nguồn phát dự phòng quốc tế số 2 tốc độ cao",
    });
  }

  // 4. FALLBACK 3: VidSrc ME
  const vidsrcMe = buildVidSrcMe(fallbackParams);
  if (vidsrcMe) {
    sources.push({
      id: `fallback-3-vidsrcme-${episodeKey}`,
      tier: "vidsrc",
      name: "VidSrc VIP (Quốc Tế 2)",
      provider: "vidsrc",
      serverName: "VidSrc VIP",
      streamType: "embed",
      embedUrl: vidsrcMe,
      streamUrl: null,
      quality: "1080p Ultra",
      language: "Phụ đề đa ngôn ngữ / Gốc",
      badge: "Fallback 3",
      description: "Nguồn phát dự phòng quốc tế số 3",
    });
  }

  // 5. OTHER VN SERVERS (Lồng tiếng, Thuyết minh, Server #2)
  const otherVnEpisodes = allEpisodes.filter(
    (ep) =>
      ep.episodeKey === episodeKey &&
      ep.serverName !== selectedEpisode?.serverName &&
      ep.provider !== "vidsrc" &&
      ep.provider !== "vidlink" &&
      (ep.embedUrl || ep.streamUrl)
  );

  otherVnEpisodes.forEach((ep, idx) => {
    sources.push({
      id: `fallback-vn-${ep.serverName}-${idx}`,
      tier: "backup_vn",
      name: ep.serverName,
      provider: ep.provider,
      serverName: ep.serverName,
      streamType: ep.streamUrl ? "hls" : "embed",
      embedUrl: ep.embedUrl,
      streamUrl: ep.streamUrl,
      quality: ep.quality || "FHD",
      language: ep.language || "Vietsub",
      badge: "Dự phòng",
      description: `Máy chủ phụ từ ${ep.serverName}`,
    });
  });

  return sources;
}

/**
 * Automatically enrich a movie detail's episode list with clean fallbacks
 */
export function enrichEpisodesWithFallbacks(
  detail: ProviderDetail,
  currentStoreId?: string
): ProviderDetail {
  if (!detail || !detail.movie || !detail.episodes) return detail;

  const movie = detail.movie;
  const originalEpisodes = detail.episodes;
  const rawTmdb = movie.externalIds?.tmdbId || (movie.raw?.tmdb as any)?.id;
  const rawImdb = movie.externalIds?.imdbId || (movie.raw?.imdb as any)?.id;
  const tmdbId = sanitizeId(rawTmdb ? String(rawTmdb) : null);
  const imdbId = sanitizeId(rawImdb ? String(rawImdb) : null);

  // If the movie already has healthy original episodes from its provider, DO NOT pollute the episode list with fallbacks
  const hasHealthyEpisodes = originalEpisodes.length > 0 && originalEpisodes.some((e) => e.embedUrl || e.streamUrl);
  if (hasHealthyEpisodes && movie.provider !== "vidsrc" && movie.provider !== "vidlink") {
    return detail;
  }

  // If no external IDs, we can't generate embeds
  if (!tmdbId && !imdbId) {
    return detail;
  }

  // Find unique episode keys
  const uniqueKeys = Array.from(new Set(originalEpisodes.map((e) => e.episodeKey)));

  const cleanEpisodes: ProviderEpisodeInput[] = [];

  uniqueKeys.forEach((key) => {
    const sample = originalEpisodes.find((e) => e.episodeKey === key);
    const episodeNumber = sample?.episodeNumber ?? 1;
    const seasonNumber = sample?.seasonNumber ?? 1;
    const label = sample?.episodeLabel || `Tập ${episodeNumber}`;

    const fallbackParams: FallbackParams = {
      tmdbId,
      imdbId,
      type: movie.type,
      seasonNumber,
      episodeNumber,
    };

    const autoEmbed = buildAutoEmbed(fallbackParams);
    if (autoEmbed) {
      cleanEpisodes.push({
        episodeKey: key,
        episodeLabel: label,
        episodeTitle: sample?.episodeTitle || null,
        episodeNumber,
        seasonNumber,
        provider: "vidsrc",
        serverName: "AutoEmbed VIP (Sạch Quảng Cáo)",
        streamType: "embed",
        streamUrl: null,
        embedUrl: autoEmbed,
        quality: "1080p Ultra",
        language: "Quốc tế (Eng/Sub)",
      });
    }

    const multiEmbed = buildMultiEmbed(fallbackParams);
    if (multiEmbed) {
      cleanEpisodes.push({
        episodeKey: key,
        episodeLabel: label,
        episodeTitle: sample?.episodeTitle || null,
        episodeNumber,
        seasonNumber,
        provider: "vidsrc",
        serverName: "MultiEmbed VIP (Quốc Tế 1)",
        streamType: "embed",
        streamUrl: null,
        embedUrl: multiEmbed,
        quality: "1080p Fast",
        language: "Quốc tế (Eng/Sub)",
      });
    }
  });

  return {
    ...detail,
    episodes: cleanEpisodes.length > 0 ? cleanEpisodes : originalEpisodes,
  };
}
