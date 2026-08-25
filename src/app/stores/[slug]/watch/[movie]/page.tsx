import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play, Settings, Maximize } from "lucide-react";

import { STORES } from "@/lib/stores/config";
import { StoreProvider } from "@/components/stores/theme-provider";
import { getMovieDetail } from "@/lib/stores/actions";
import { WatchPlayer } from "@/components/stores/watch-player";
import { EpisodeList } from "@/components/stores/episode-list";

interface Props {
  params: Promise<{ slug: string; movie: string }>;
  searchParams: Promise<{ episode?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const store = STORES[slug];
  if (!store) return { title: "Không tìm thấy" };

  return {
    title: `Đang xem | ${store.name}`,
  };
}

export default async function WatchPage({ params, searchParams }: Props) {
  const { slug, movie } = await params;
  const { episode: episodeKey } = await searchParams;
  const store = STORES[slug];

  if (!store) {
    notFound();
  }

  const movieDetail = await getMovieDetail(slug, movie);

  if (!movieDetail) {
    return (
      <StoreProvider store={store}>
        <div className="page-shell flex min-h-screen flex-col items-center justify-center py-20">
          <h1 className="text-2xl font-bold" style={{ color: store.theme.text }}>
            Không tìm thấy phim
          </h1>
          <Link
            href={`/stores/${store.slug}`}
            className="mt-6 flex items-center gap-2 rounded-xl px-6 py-3 font-medium transition-all hover:scale-105"
            style={{ background: store.theme.primary, color: "#fff" }}
          >
            Quay lại kho phim
          </Link>
        </div>
      </StoreProvider>
    );
  }

  const { movie: movieInfo, episodes } = movieDetail;

  // Deduplicate episodes by episodeKey (some sources return duplicates)
  const uniqueEpisodes = episodes.reduce((acc, ep) => {
    if (!acc.find((e) => e.episodeKey === ep.episodeKey)) {
      acc.push(ep);
    }
    return acc;
  }, [] as typeof episodes);

  // Find selected episode or default to first
  const selectedEpisode = episodeKey
    ? uniqueEpisodes.find((ep) => ep.episodeKey === episodeKey) || uniqueEpisodes[0]
    : uniqueEpisodes[0];

  // Get source URLs
  const embedUrl = selectedEpisode?.embedUrl;
  const streamUrl = selectedEpisode?.streamUrl;

  return (
    <StoreProvider store={store}>
      <div className="min-h-screen transition-colors duration-500" style={{ background: store.theme.background }}>
        {/* Header */}
        <header
          className="sticky top-0 z-40 border-b backdrop-blur-2xl transition-colors duration-500"
          style={{
            backgroundColor: `${store.theme.background}ee`,
            borderColor: store.theme.border,
          }}
        >
          <div className="page-shell flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <Link
                href={`/stores/${store.slug}/movie/${movie}`}
                className="flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold tracking-wide transition-all duration-300 hover:scale-105 active:scale-95"
                style={{
                  color: store.theme.text,
                  background: store.theme.surface,
                  borderColor: store.theme.border,
                  boxShadow: store.theme.shadowSm,
                }}
              >
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">Chi tiết phim</span>
              </Link>

              <div className="h-5 w-px opacity-30 shrink-0" style={{ backgroundColor: store.theme.textMuted }} />

              <div className="min-w-0">
                <h1
                  className="text-xs sm:text-sm md:text-base font-bold truncate tracking-tight"
                  style={{ color: store.theme.text }}
                >
                  {movieInfo.title}
                </h1>
                {selectedEpisode && (
                  <p className="text-[11px] font-semibold" style={{ color: store.theme.primary }}>
                    {selectedEpisode.episodeLabel || `Tập ${selectedEpisode.episodeNumber || 1}`}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Link
                href={`/stores/${store.slug}`}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all hover:scale-105"
                style={{
                  background: store.theme.surface,
                  borderColor: store.theme.border,
                  color: store.theme.textSecondary,
                }}
              >
                <span>{store.name}</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Theater Video Player Section */}
        <div className="page-shell py-6 sm:py-8">
          <WatchPlayer
            store={store}
            movieSlug={movie}
            movieTitle={movieInfo.title}
            embedUrl={embedUrl}
            streamUrl={streamUrl}
            quality={selectedEpisode?.quality}
            language={selectedEpisode?.language}
          />
        </div>

        {/* Episode Selector Section */}
        <div className="page-shell pb-20">
          <div className="flex items-center justify-between pb-4 mb-6 border-b" style={{ borderColor: store.theme.border }}>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight" style={{ color: store.theme.text }}>
                Chọn Tập Phim
              </h2>
              <p className="text-xs" style={{ color: store.theme.textMuted }}>
                Nhấp vào tập bạn muốn xem để chuyển nguồn phát
              </p>
            </div>
            <span
              className="rounded-full px-3 py-1 text-xs font-bold"
              style={{ background: store.theme.primaryMuted, color: store.theme.primary }}
            >
              {uniqueEpisodes.length} tập
            </span>
          </div>

          <EpisodeList
            store={store}
            movieSlug={movie}
            episodes={uniqueEpisodes}
            currentEpisodeKey={selectedEpisode?.episodeKey}
          />
        </div>
      </div>
    </StoreProvider>
  );
}
