import type { ProviderDetail, ProviderEpisodeInput, ProviderId, ProviderMovieInput } from "@/types/catalog";
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
  mediaType?: "movie" | "tv" | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
}
export function externalIds(movie: ProviderMovieInput): { tmdbId: string | null; imdbId: string | null; mediaType: "movie" | "tv" | null; season: number | null } {
  const tmdb = movie.raw?.tmdb as { id?: unknown; type?: unknown; season?: unknown } | undefined;
  const imdb = movie.raw?.imdb as { id?: unknown } | undefined;
  const tmdbValue = String(movie.externalIds?.tmdbId || tmdb?.id || "");
  const imdbValue = String(movie.externalIds?.imdbId || imdb?.id || "");
  return {
    tmdbId: /^[1-9]\d*$/.test(tmdbValue) ? tmdbValue : null,
    imdbId: /^tt\d+$/.test(imdbValue) ? imdbValue : null,
    mediaType: tmdb?.type === "movie" || tmdb?.type === "tv" ? tmdb.type : null,
    season: Number(tmdb?.season) > 0 ? Number(tmdb?.season) : null,
  };
}
function identifiers(params: FallbackParams) {
  return {
    tmdb: /^[1-9]\d*$/.test(params.tmdbId || "") ? params.tmdbId! : null,
    imdb: /^tt\d+$/.test(params.imdbId || "") ? params.imdbId! : null,
  };
}
function television(params: FallbackParams): boolean | null {
  if (params.mediaType) return params.mediaType === "tv";
  if (params.type === "animation" || params.type === "unknown") return null;
  return params.type === "series" || params.type === "tvshow";
}
function position(params: FallbackParams) {
  return [params.seasonNumber, params.episodeNumber].map(value => Number.isInteger(value) && (value ?? 0) > 0 ? value! : 1);
}
export function buildAutoEmbed(params: FallbackParams): string | null {
  const { tmdb } = identifiers(params);
  const tv = television(params);
  if (!tmdb || tv === null) return null;
  const [season, episode] = position(params);
  return tv ? `https://autoembed.co/tv/tmdb/${tmdb}-${season}-${episode}` : `https://autoembed.co/movie/tmdb/${tmdb}`;
}
export function buildMultiEmbed(params: FallbackParams): string | null {
  const { tmdb, imdb } = identifiers(params);
  const tv = television(params);
  if ((!tmdb && !imdb) || tv === null) return null;
  const [season, episode] = position(params);
  return `https://multiembed.mov/?video_id=${tmdb || imdb}${tmdb ? "&tmdb=1" : ""}${tv ? `&s=${season}&e=${episode}` : ""}`;
}
export function buildVidSrcMe(params: FallbackParams): string | null {
  const { tmdb, imdb } = identifiers(params);
  const tv = television(params);
  if ((!tmdb && !imdb) || tv === null) return null;
  const [season, episode] = position(params);
  return `https://vidsrc.me/embed/${tv ? "tv" : "movie"}?${tmdb ? `tmdb=${tmdb}` : `imdb=${imdb}`}${tv ? `&season=${season}&episode=${episode}` : ""}`;
}
export function buildVidSrcEmbed(params: FallbackParams): string | null {
  return buildVidSrcMe(params);
}
export function buildVidLinkEmbed(params: FallbackParams): string | null {
  const { tmdb } = identifiers(params);
  const tv = television(params);
  if (!tmdb || tv === null) return null;
  const [season, episode] = position(params);
  return `https://vidlink.pro/${tv ? `tv/${tmdb}/${season}/${episode}` : `movie/${tmdb}`}?primaryColor=ea580c&secondaryColor=f97316&iconColor=ffffff&title=true&poster=true&autoplay=false&sub.default=Vietnamese`;
}
export const ALL_VN_PROVIDERS: ProviderId[] = ["kkphim", "nguonc", "vsmov", "ophim"];
export function getRemainingVnProviders(current: string): ProviderId[] {
  return ALL_VN_PROVIDERS.filter(provider => provider !== (STORE_API_MAP[current] || current));
}
export function getProviderFallbackOrder(primary: ProviderId): ProviderId[] {
  return [...new Set<ProviderId>([primary, "vidsrc", "vidlink", ...getRemainingVnProviders(primary)])];
}

export function buildEpisodePlaybackSources(movie: ProviderMovieInput, selected?: ProviderEpisodeInput | null, episodes: ProviderEpisodeInput[] = []): PlaybackSource[] {
  const sources: PlaybackSource[] = [];
  const addEpisode = (episode: ProviderEpisodeInput, tier: PlaybackSourceTier) => {
    const common = { tier, provider: episode.provider, serverName: episode.serverName, quality: episode.quality || movie.quality, language: episode.language || movie.language };
    const id = `${episode.provider}-${episode.serverName}-${episode.seasonNumber}-${episode.episodeKey}`;
    if (episode.streamUrl) sources.push({ ...common, id: `${id}-stream`, name: `${episode.serverName} · Trực tiếp`, streamType: episode.streamType === "mp4" ? "mp4" : "hls", streamUrl: episode.streamUrl });
    if (episode.embedUrl) sources.push({ ...common, id: `${id}-embed`, name: `${episode.serverName} · Player`, streamType: "embed", embedUrl: episode.embedUrl });
  };
  if (selected) addEpisode(selected, "primary");
  const ids = externalIds(movie);
  const params: FallbackParams = { ...ids, type: movie.type, seasonNumber: ids.season ?? selected?.seasonNumber, episodeNumber: selected?.episodeNumber };
  // Never fabricate a TV episode when its number is unknown.
  const builders = [
    ["Tinh Tú", "vidsrc", buildVidSrcEmbed],
    ["Ngân Hà", "vidlink", buildVidLinkEmbed],
  ] as const;
  for (const [name, provider, builder] of builders) {
    if (television(params) && !selected?.episodeNumber) continue;
    const url = builder(params);
    if (url && !sources.some(source => source.embedUrl === url)) sources.push({ id: `${name}-${selected?.episodeKey || "full"}`, tier: provider, provider, name, serverName: name, streamType: "embed", embedUrl: url, language: "Phụ đề tùy nguồn", description: "Nguồn quốc tế dự phòng" });
  }
  for (const episode of episodes) {
    if (!selected || episode.episodeKey !== selected.episodeKey || episode.seasonNumber !== selected.seasonNumber) continue;
    if (episode.serverName === selected.serverName && episode.provider === selected.provider) continue;
    addEpisode(episode, "backup_vn");
  }
  return sources.filter((source, index) => sources.findIndex(other => (other.embedUrl || other.streamUrl) === (source.embedUrl || source.streamUrl)) === index);
}
export function enrichEpisodesWithFallbacks(detail: ProviderDetail): ProviderDetail {
  if (detail.episodes.some(episode => episode.embedUrl || episode.streamUrl)) return detail;
  const ids = externalIds(detail.movie);
  const params: FallbackParams = { ...ids, type: detail.movie.type };
  // A known feature film can have a full episode; a series needs real episode metadata.
  if (television(params) !== false) return detail;
  const embedUrl = buildVidSrcEmbed(params) || buildVidLinkEmbed(params);
  if (!embedUrl) return detail;
  const provider = buildVidSrcEmbed(params) ? "vidsrc" : "vidlink";
  return { ...detail, episodes: [{ episodeKey: "full", episodeLabel: "Full", episodeTitle: null, episodeNumber: 1, seasonNumber: 1, provider, serverName: provider === "vidsrc" ? "Tinh Tú" : "Ngân Hà", streamType: "embed", streamUrl: null, embedUrl, quality: null, language: "Phụ đề tùy nguồn" }] };
}
