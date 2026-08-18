import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Play, ArrowLeft, Clock, Calendar, Film, Users, ChevronLeft, ChevronRight } from "lucide-react";

import { STORES } from "@/lib/stores/config";
import { StoreProvider } from "@/components/stores/theme-provider";
import { StoreHeader } from "@/components/stores/store-header";
import { EpisodeList } from "@/components/stores/episode-list";
import { getMovieDetail } from "@/lib/stores/actions";
import { getRelatedMovies } from "@/lib/stores/actions";
import type { ProviderMovieInput } from "@/types/catalog";

interface Props {
  params: Promise<{ slug: string; movie: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, movie } = await params;
  const store = STORES[slug];
  if (!store) return { title: "Không tìm thấy" };

  const detail = await getMovieDetail(slug, movie);
  if (!detail) return { title: "Không tìm thấy phim" };

  return {
    title: `${detail.movie.title} | ${store.name}`,
    description: detail.movie.description || `${detail.movie.title} - Xem phim chất lượng cao`,
    openGraph: {
      title: detail.movie.title,
      description: detail.movie.description || undefined,
      images: detail.movie.posterUrl ? [detail.movie.posterUrl] : [],
    },
  };
}

function MovieCard({ movie, store }: { movie: ProviderMovieInput; store: typeof STORES[keyof typeof STORES] }) {
  return (
    <Link
      href={`/stores/${store.slug}/movie/${movie.providerSlug}`}
      className="group block transition-transform duration-300 hover:scale-105"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl">
        {movie.posterUrl ? (
          <Image
            src={movie.posterUrl}
            alt={movie.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center" style={{ background: store.theme.surface }}>
            <Film size={32} style={{ color: store.theme.muted }} />
          </div>
        )}
        {movie.quality && (
          <span
            className="absolute left-2 top-2 rounded px-2 py-0.5 text-xs font-bold text-white"
            style={{ background: store.theme.primary }}
          >
            {movie.quality}
          </span>
        )}
      </div>
      <h3
        className="mt-2 line-clamp-2 text-sm font-medium leading-tight"
        style={{ color: store.theme.text }}
      >
        {movie.title}
      </h3>
      {movie.year && (
        <p className="mt-1 text-xs" style={{ color: store.theme.muted }}>
          {movie.year}
        </p>
      )}
    </Link>
  );
}

export default async function MovieDetailPage({ params }: Props) {
  const { slug, movie: movieSlug } = await params;
  const store = STORES[slug];

  if (!store) {
    notFound();
  }

  const movieDetail = await getMovieDetail(slug, movieSlug);

  if (!movieDetail) {
    return (
      <StoreProvider store={store}>
        <StoreHeader store={store} />
        <div className="page-shell flex min-h-[60vh] flex-col items-center justify-center py-20">
          <Film size={64} className="mb-4" style={{ color: store.theme.muted }} />
          <h1 className="text-2xl font-bold" style={{ color: store.theme.text }}>
            Không tìm thấy phim
          </h1>
          <p className="mt-2" style={{ color: store.theme.muted }}>
            Phim này có thể đã bị xóa hoặc không tồn tại
          </p>
          <Link
            href={`/stores/${store.slug}`}
            className="mt-8 flex items-center gap-2 rounded-xl px-6 py-3 font-medium transition-all hover:scale-105"
            style={{ background: store.theme.primary, color: "#fff" }}
          >
            <ArrowLeft size={18} />
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

  return (
    <StoreProvider store={store}>
      {/* Header */}
      <StoreHeader store={store} />

      {/* Backdrop & Info */}
      <section className="relative">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: movieInfo.backdropUrl
              ? `url(${movieInfo.backdropUrl})`
              : movieInfo.posterUrl
                ? `url(${movieInfo.posterUrl})`
                : "none",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom, ${store.theme.background}99 0%, ${store.theme.background}ee 60%, ${store.theme.background} 100%)`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to right, ${store.theme.background}99 0%, transparent 60%)`,
            }}
          />
        </div>

        {/* Glow */}
        <div
          className="absolute -right-40 top-0 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{ background: store.theme.primary }}
        />

        {/* Content */}
        <div className="page-shell relative py-8 md:py-12">
          {/* Back Button */}
          <Link
            href={`/stores/${store.slug}`}
            className="mb-6 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-white/10"
            style={{ color: store.theme.muted }}
          >
            <ArrowLeft size={18} />
            Quay lại {store.name}
          </Link>

          <div className="flex flex-col gap-6 md:flex-row md:gap-8">
            {/* Poster */}
            <div className="shrink-0">
              <div
                className="relative aspect-[2/3] w-40 overflow-hidden rounded-2xl md:w-56"
                style={{
                  boxShadow: `0 20px 60px ${store.theme.glow}`,
                }}
              >
                {movieInfo.posterUrl ? (
                  <Image
                    src={movieInfo.posterUrl}
                    alt={movieInfo.title}
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 768px) 160px, 224px"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center"
                    style={{ background: store.theme.surface }}
                  >
                    <Film size={48} style={{ color: store.theme.muted }} />
                  </div>
                )}

                {/* Quality Badge */}
                {movieInfo.quality && (
                  <div
                    className="absolute left-3 top-3 rounded-md px-2 py-1 text-xs font-bold text-white"
                    style={{ background: store.theme.primary }}
                  >
                    {movieInfo.quality}
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1
                className="text-2xl font-bold tracking-tight md:text-4xl"
                style={{ color: store.theme.text }}
              >
                {movieInfo.title}
              </h1>

              {movieInfo.originalTitle && movieInfo.originalTitle !== movieInfo.title && (
                <p className="mt-1 text-lg" style={{ color: store.theme.muted }}>
                  {movieInfo.originalTitle}
                </p>
              )}

              {/* Meta */}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm" style={{ color: store.theme.muted }}>
                {movieInfo.year && (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    {movieInfo.year}
                  </span>
                )}
                {movieInfo.quality && (
                  <span
                    className="rounded px-2 py-0.5 text-xs font-bold"
                    style={{ background: store.theme.primary, color: "#fff" }}
                  >
                    {movieInfo.quality}
                  </span>
                )}
                {movieInfo.durationMinutes && (
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} />
                    {movieInfo.durationMinutes} phút
                  </span>
                )}
                {movieInfo.type && (
                  <span className="flex items-center gap-1.5">
                    <Film size={14} />
                    {movieInfo.type === "single" && "Phim lẻ"}
                    {movieInfo.type === "series" && "Phim bộ"}
                    {movieInfo.type === "animation" && "Hoạt hình"}
                    {movieInfo.type === "tvshow" && "TV Show"}
                  </span>
                )}
                {movieInfo.totalEpisodes && (
                  <span className="flex items-center gap-1.5">
                    <span
                      className="rounded px-2 py-0.5 text-xs"
                      style={{ background: `${store.theme.primary}20`, color: store.theme.primary }}
                    >
                      {movieInfo.totalEpisodes} tập
                    </span>
                  </span>
                )}
              </div>

              {/* Genres */}
              {movieInfo.genres.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {movieInfo.genres.map((genre) => (
                    <span
                      key={genre.id}
                      className="rounded-full px-3 py-1 text-xs font-medium"
                      style={{
                        background: `${store.theme.primary}15`,
                        color: store.theme.primary,
                      }}
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Countries */}
              {movieInfo.countries.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm" style={{ color: store.theme.muted }}>
                  <span className="text-xs">Quốc gia:</span>
                  {movieInfo.countries.map((country) => (
                    <span key={country.id} className="text-xs">
                      {country.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Description */}
              {movieInfo.description && (
                <p className="mt-5 max-w-2xl text-sm leading-relaxed md:text-base" style={{ color: store.theme.muted }}>
                  {movieInfo.description}
                </p>
              )}

              {/* Directors & Actors */}
              {(movieInfo.directors.length > 0 || movieInfo.actors.length > 0) && (
                <div className="mt-5 space-y-2">
                  {movieInfo.directors.length > 0 && (
                    <div className="flex items-start gap-2 text-sm">
                      <span className="shrink-0 font-medium" style={{ color: store.theme.primary }}>
                        Đạo diễn:
                      </span>
                      <span style={{ color: store.theme.muted }}>
                        {movieInfo.directors.join(", ")}
                      </span>
                    </div>
                  )}
                  {movieInfo.actors.length > 0 && (
                    <div className="flex items-start gap-2 text-sm">
                      <span className="shrink-0 font-medium" style={{ color: store.theme.primary }}>
                        Diễn viên:
                      </span>
                      <span style={{ color: store.theme.muted }}>
                        {movieInfo.actors.slice(0, 8).join(", ")}
                        {movieInfo.actors.length > 8 && ` +${movieInfo.actors.length - 8} người khác`}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {uniqueEpisodes.length > 0 && (
                  <Link
                    href={`/stores/${store.slug}/watch/${movieSlug}?episode=${encodeURIComponent(uniqueEpisodes[0].episodeKey)}`}
                    className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all hover:scale-105"
                    style={{ background: store.theme.primary, color: "#fff" }}
                  >
                    <Play size={18} fill="white" />
                    <span>Xem ngay</span>
                  </Link>
                )}
                <button
                  className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all hover:scale-105"
                  style={{
                    background: `${store.theme.primary}15`,
                    color: store.theme.primary,
                  }}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span>Yêu thích</span>
                </button>
                <button
                  className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all hover:scale-105"
                  style={{
                    background: `${store.theme.surface}50`,
                    color: store.theme.text,
                  }}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span>Chia sẻ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Episodes */}
      {uniqueEpisodes.length > 0 && (
        <section className="page-shell py-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold" style={{ color: store.theme.text }}>
              Danh sách tập
            </h2>
            <span className="text-sm" style={{ color: store.theme.muted }}>
              {uniqueEpisodes.length} tập
            </span>
          </div>
          <div className="mt-4">
            <EpisodeList
              store={store}
              movieSlug={movieSlug}
              episodes={uniqueEpisodes}
            />
          </div>
        </section>
      )}
    </StoreProvider>
  );
}
