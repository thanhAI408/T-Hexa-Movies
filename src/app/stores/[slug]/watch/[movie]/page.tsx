import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play, Settings, Maximize } from "lucide-react";

import { STORES } from "@/lib/stores/config";
import { StoreProvider } from "@/components/stores/theme-provider";
import { getMovieDetail } from "@/lib/stores/actions";
import { WatchPlayer } from "@/components/stores/watch-player";

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
      <div className="min-h-screen" style={{ background: store.theme.background }}>
        {/* Header */}
        <header
          className="sticky top-0 z-50 border-b backdrop-blur-xl"
          style={{
            backgroundColor: `${store.theme.background}ee`,
            borderColor: `${store.theme.primary}20`,
          }}
        >
          <div className="page-shell flex h-14 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/stores/${store.slug}/movie/${movie}`}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-white/10"
                style={{ color: store.theme.muted }}
              >
                <ArrowLeft size={18} />
                <span>Quay lại</span>
              </Link>

              <div className="h-4 w-px" style={{ backgroundColor: `${store.theme.primary}30` }} />

              <div>
                <h1
                  className="text-sm font-semibold line-clamp-1"
                  style={{ color: store.theme.text }}
                >
                  {movieInfo.title}
                </h1>
                {selectedEpisode && (
                  <p className="text-xs" style={{ color: store.theme.muted }}>
                    {selectedEpisode.episodeLabel || `Tập ${selectedEpisode.episodeNumber || 1}`}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-2 rounded-lg p-2 text-sm transition-all hover:bg-white/10"
                style={{ color: store.theme.muted }}
              >
                <Settings size={18} />
              </button>
              <button
                className="flex items-center gap-2 rounded-lg p-2 text-sm transition-all hover:bg-white/10"
                style={{ color: store.theme.muted }}
              >
                <Maximize size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Video Player */}
        <div className="page-shell py-6">
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

        {/* Episode List */}
        <div className="page-shell pb-12">
          <h2
            className="mb-4 text-lg font-semibold"
            style={{ color: store.theme.text }}
          >
            Chọn tập phim
          </h2>

          {/* Quick Episode Selection */}
          <div className="mb-6 flex flex-wrap gap-2">
            {uniqueEpisodes.slice(0, 20).map((ep, index) => {
              const epNumber = ep.episodeNumber ?? index + 1;
              const isActive = ep.episodeKey === selectedEpisode?.episodeKey;

              return (
                <Link
                  key={ep.episodeKey}
                  href={`/stores/${store.slug}/watch/${movie}?episode=${encodeURIComponent(ep.episodeKey)}`}
                  className="flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-all hover:scale-105"
                  style={{
                    background: isActive ? store.theme.primary : "transparent",
                    borderColor: `${store.theme.primary}40`,
                    color: isActive ? "#fff" : store.theme.text,
                  }}
                >
                  {ep.episodeLabel || epNumber}
                </Link>
              );
            })}

            {uniqueEpisodes.length > 20 && (
              <span className="flex h-10 items-center px-3 text-sm" style={{ color: store.theme.muted }}>
                +{uniqueEpisodes.length - 20} tập khác
              </span>
            )}
          </div>

          {/* All Episodes Table for Series */}
          {uniqueEpisodes.length > 0 && (
            <div
              className="rounded-2xl border overflow-hidden"
              style={{
                borderColor: `${store.theme.primary}20`,
                background: `${store.theme.surface}50`,
              }}
            >
              <table className="w-full">
                <thead>
                  <tr
                    className="border-b"
                    style={{ borderColor: `${store.theme.primary}20` }}
                  >
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold uppercase"
                      style={{ color: store.theme.muted }}
                    >
                      Tập
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold uppercase"
                      style={{ color: store.theme.muted }}
                    >
                      Tiêu đề
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold uppercase"
                      style={{ color: store.theme.muted }}
                    >
                      Chất lượng
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-semibold uppercase"
                      style={{ color: store.theme.muted }}
                    >
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {uniqueEpisodes.map((ep, index) => {
                    const epNumber = ep.episodeNumber ?? index + 1;
                    const isActive = ep.episodeKey === selectedEpisode?.episodeKey;

                    return (
                      <tr
                        key={`watch-${ep.episodeKey}`}
                        className="border-b transition-colors hover:bg-white/5"
                        style={{ borderColor: `${store.theme.primary}10` }}
                      >
                        <td
                          className="px-4 py-3 text-sm font-medium"
                          style={{ color: isActive ? store.theme.primary : store.theme.text }}
                        >
                          {ep.episodeLabel || `Tập ${epNumber}`}
                        </td>
                        <td
                          className="px-4 py-3 text-sm"
                          style={{ color: store.theme.muted }}
                        >
                          {ep.episodeTitle || "-"}
                        </td>
                        <td
                          className="px-4 py-3 text-sm"
                          style={{ color: store.theme.muted }}
                        >
                          {ep.quality && (
                            <span
                              className="rounded px-2 py-0.5 text-xs font-medium"
                              style={{
                                background: `${store.theme.primary}20`,
                                color: store.theme.primary,
                              }}
                            >
                              {ep.quality}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/stores/${store.slug}/watch/${movie}?episode=${encodeURIComponent(ep.episodeKey)}`}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:scale-105"
                            style={{
                              background: isActive ? store.theme.primary : `${store.theme.primary}20`,
                              color: isActive ? "#fff" : store.theme.primary,
                            }}
                          >
                            <Play size={12} fill="currentColor" />
                            Xem
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </StoreProvider>
  );
}
