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
      <section className="relative overflow-hidden">
        {/* Backdrop Banner */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
          style={{
            backgroundImage: movieInfo.backdropUrl
              ? `url(${movieInfo.backdropUrl})`
              : movieInfo.posterUrl
                ? `url(${movieInfo.posterUrl})`
                : "none",
            filter: "brightness(0.7) blur(2px)",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `
                linear-gradient(to bottom, 
                  ${store.theme.background}aa 0%, 
                  ${store.theme.background}f2 60%, 
                  ${store.theme.background} 100%
                ),
                linear-gradient(to right,
                  ${store.theme.background}f2 0%,
                  ${store.theme.background}aa 50%,
                  transparent 100%
                )
              `,
            }}
          />
        </div>

        {/* Ambient Halo */}
        <div
          className="absolute -right-20 top-10 h-96 w-96 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: store.theme.primary }}
        />

        {/* Main Info Shell */}
        <div className="page-shell relative z-10 py-8 sm:py-12">
          {/* Back Button */}
          <Link
            href={`/stores/${store.slug}`}
            className="mb-8 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide border transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              color: store.theme.text,
              background: store.theme.surface,
              borderColor: store.theme.border,
              boxShadow: store.theme.shadowSm,
            }}
          >
            <ArrowLeft size={16} />
            <span>Quay lại {store.name}</span>
          </Link>

          <div className="flex flex-col gap-8 md:flex-row md:gap-10 items-start">
            {/* Poster Card */}
            <div className="shrink-0 w-full sm:w-auto flex justify-center">
              <div
                className="relative aspect-[2/3] w-48 sm:w-60 md:w-72 overflow-hidden rounded-3xl border shadow-2xl transition-transform duration-500 hover:scale-102"
                style={{
                  borderColor: store.theme.border,
                  boxShadow: `0 25px 60px -12px ${store.theme.glow}`,
                  background: store.theme.surface,
                }}
              >
                {movieInfo.posterUrl ? (
                  <Image
                    src={movieInfo.posterUrl}
                    alt={movieInfo.title}
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 768px) 192px, 288px"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center"
                    style={{ background: store.theme.surface }}
                  >
                    <Film size={54} style={{ color: store.theme.textMuted }} />
                  </div>
                )}

                {/* Quality Badge */}
                {movieInfo.quality && (
                  <div
                    className="absolute left-3.5 top-3.5 rounded-xl px-3 py-1 text-xs font-black text-white uppercase tracking-wider shadow-lg"
                    style={{ background: store.theme.gradientAccent }}
                  >
                    {movieInfo.quality}
                  </div>
                )}
              </div>
            </div>

            {/* Movie Info Details */}
            <div className="flex-1 space-y-5">
              <div>
                <h1
                  className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight"
                  style={{ color: store.theme.text }}
                >
                  {movieInfo.title}
                </h1>

                {movieInfo.originalTitle && movieInfo.originalTitle !== movieInfo.title && (
                  <p className="mt-1.5 text-base sm:text-xl font-medium" style={{ color: store.theme.textSecondary }}>
                    {movieInfo.originalTitle}
                  </p>
                )}
              </div>

              {/* Meta Badges */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold">
                {movieInfo.year && (
                  <span 
                    className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 border"
                    style={{ background: store.theme.surface, borderColor: store.theme.border, color: store.theme.text }}
                  >
                    <Calendar size={14} style={{ color: store.theme.accent }} />
                    {movieInfo.year}
                  </span>
                )}
                {movieInfo.durationMinutes && (
                  <span 
                    className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 border"
                    style={{ background: store.theme.surface, borderColor: store.theme.border, color: store.theme.text }}
                  >
                    <Clock size={14} style={{ color: store.theme.primary }} />
                    {movieInfo.durationMinutes} phút
                  </span>
                )}
                {movieInfo.type && (
                  <span 
                    className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 border"
                    style={{ background: store.theme.primaryMuted, borderColor: store.theme.border, color: store.theme.primary }}
                  >
                    <Film size={14} />
                    {movieInfo.type === "single" ? "Phim lẻ" : movieInfo.type === "series" ? "Phim bộ" : "Hoạt hình"}
                  </span>
                )}
                {movieInfo.totalEpisodes && (
                  <span
                    className="rounded-xl px-3 py-1.5 border font-bold"
                    style={{ background: store.theme.primaryMuted, borderColor: store.theme.primary, color: store.theme.primary }}
                  >
                    {movieInfo.totalEpisodes} tập
                  </span>
                )}
              </div>

              {/* Genres Pills */}
              {movieInfo.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {movieInfo.genres.map((genre) => (
                    <span
                      key={genre.id}
                      className="rounded-full px-3.5 py-1 text-xs font-semibold border"
                      style={{
                        background: store.theme.surface,
                        borderColor: store.theme.border,
                        color: store.theme.textSecondary,
                      }}
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Countries */}
              {movieInfo.countries.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: store.theme.textMuted }}>
                  <span className="font-semibold uppercase tracking-wider">Quốc gia:</span>
                  {movieInfo.countries.map((country) => (
                    <span 
                      key={country.id} 
                      className="rounded-lg px-2.5 py-0.5 border"
                      style={{ background: store.theme.surface, borderColor: store.theme.border, color: store.theme.textSecondary }}
                    >
                      {country.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Synopsis / Description */}
              {movieInfo.description && (
                <div 
                  className="rounded-2xl border p-4 sm:p-5 backdrop-blur-xl"
                  style={{ background: `${store.theme.surface}80`, borderColor: store.theme.border }}
                >
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: store.theme.primary }}>
                    Tóm tắt nội dung
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed" style={{ color: store.theme.textSecondary }}>
                    {movieInfo.description}
                  </p>
                </div>
              )}

              {/* Directors & Actors */}
              {(movieInfo.directors.length > 0 || movieInfo.actors.length > 0) && (
                <div 
                  className="rounded-2xl border p-4 sm:p-5 backdrop-blur-xl space-y-3"
                  style={{ background: `${store.theme.surface}80`, borderColor: store.theme.border }}
                >
                  {movieInfo.directors.length > 0 && (
                    <div className="flex items-start gap-2 text-xs sm:text-sm">
                      <span className="shrink-0 font-bold uppercase tracking-wider text-xs" style={{ color: store.theme.primary }}>
                        Đạo diễn:
                      </span>
                      <span style={{ color: store.theme.text }}>
                        {movieInfo.directors.join(", ")}
                      </span>
                    </div>
                  )}
                  {movieInfo.actors.length > 0 && (
                    <div className="flex items-start gap-2 text-xs sm:text-sm">
                      <span className="shrink-0 font-bold uppercase tracking-wider text-xs" style={{ color: store.theme.primary }}>
                        Diễn viên:
                      </span>
                      <span style={{ color: store.theme.textSecondary }}>
                        {movieInfo.actors.slice(0, 10).join(", ")}
                        {movieInfo.actors.length > 10 && ` +${movieInfo.actors.length - 10} người khác`}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {uniqueEpisodes.length > 0 && (
                  <Link
                    href={`/stores/${store.slug}/watch/${movieSlug}?episode=${encodeURIComponent(uniqueEpisodes[0].episodeKey)}`}
                    className="group flex items-center gap-2.5 rounded-2xl px-8 py-3.5 text-sm sm:text-base font-bold transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl"
                    style={{
                      background: store.theme.gradientAccent,
                      color: store.theme.textInverse,
                      boxShadow: `0 8px 30px ${store.theme.glow}`,
                    }}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                      <Play size={15} fill="currentColor" className="ml-0.5" />
                    </div>
                    <span>Xem Phim Ngay</span>
                  </Link>
                )}
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-2xl border px-6 py-3.5 text-xs sm:text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
                  style={{
                    background: store.theme.surface,
                    borderColor: store.theme.border,
                    color: store.theme.text,
                    boxShadow: store.theme.shadowSm,
                  }}
                >
                  <svg className="h-4 w-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span>Yêu thích</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Episodes Section */}
      {uniqueEpisodes.length > 0 && (
        <section className="page-shell py-10 pb-20">
          <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: store.theme.border }}>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: store.theme.text }}>
              Danh Sách Tập Phim
            </h2>
            <span 
              className="rounded-full px-3.5 py-1 text-xs font-bold" 
              style={{ background: store.theme.primaryMuted, color: store.theme.primary }}
            >
              {uniqueEpisodes.length} tập
            </span>
          </div>

          <div className="mt-2">
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
