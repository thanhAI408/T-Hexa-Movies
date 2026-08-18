import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Clapperboard, Clock, Film, Globe, Languages, Mic2, Users } from "lucide-react";
import { getMovieBySlug, getRelatedMovies, listMovies } from "@/lib/catalog/repository";
import { MovieCard } from "@/components/movie/movie-card";
import { MovieRow } from "@/components/movie/movie-row";
import { Play } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const movie = await getMovieBySlug(slug);

  if (!movie) {
    return { title: "Không tìm thấy phim" };
  }

  const image = movie.posterUrl ?? movie.backdropUrl;

  return {
    title: movie.title,
    description: movie.description?.slice(0, 160) || `Xem phim ${movie.title} online`,
    openGraph: {
      title: movie.title,
      description: movie.description?.slice(0, 160) || `Xem phim ${movie.title} online`,
      images: image ? [{ url: image, width: 600, height: 900 }] : [],
    },
  };
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}p` : `${hours}h`;
}

export default async function MovieDetailPage({ params }: Props) {
  const { slug } = await params;
  const movie = await getMovieBySlug(slug);

  if (!movie) {
    notFound();
  }

  const related = await getRelatedMovies(movie, 18);

  return (
    <div className="min-h-screen">
      {/* Backdrop */}
      <div className="relative h-[45vh] min-h-[380px] overflow-hidden">
        {movie.backdropUrl && (
          <Image
            src={movie.backdropUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-top opacity-50"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090d] via-[#07090d]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07090d]/80 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="container relative -mt-48 pb-20">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Poster */}
          <div className="flex-shrink-0 lg:w-72">
            <div className="relative aspect-[2/3] overflow-hidden rounded-2xl shadow-2xl">
              {movie.posterUrl ? (
                <Image
                  src={movie.posterUrl}
                  alt={`Poster ${movie.title}`}
                  fill
                  priority
                  sizes="(max-width: 1024px) 288px, 320px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#121821] text-6xl text-[#4a5568]">
                  ?
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 pt-4 lg:pt-0">
            {/* Breadcrumb */}
            <nav className="mb-4 flex items-center gap-2 text-sm">
              <Link href="/" className="text-[#8896a9] hover:text-white">
                Trang chủ
              </Link>
              <span className="text-[#5a6577]">/</span>
              <span className="text-[#8896a9]">Phim</span>
              <span className="text-[#5a6577]">/</span>
              <span className="truncate max-w-[200px] text-white">{movie.title}</span>
            </nav>

            <h1 className="text-3xl font-bold text-white lg:text-4xl">{movie.title}</h1>
            {movie.originalTitle && movie.originalTitle !== movie.title && (
              <p className="mt-1 text-lg text-[#8a9ab0]">{movie.originalTitle}</p>
            )}

            {/* Badges */}
            <div className="mt-4 flex flex-wrap gap-2">
              {movie.isCinema && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e04655]/35 bg-[#bd2432]/20 px-3 py-1.5 text-[#ff8f9b] text-xs font-semibold">
                  <Clapperboard size={14} /> Phim chiếu rạp
                </span>
              )}
              <span className="rounded-full border border-white/10 bg-white/7 px-3 py-1.5 text-[#d3dae4] text-xs">
                {movie.type === "series" ? "Phim bộ" : movie.type === "animation" ? "Hoạt hình" : "Phim lẻ"}
              </span>
              {movie.year && (
                <span className="rounded-full border border-white/10 bg-white/7 px-3 py-1.5 text-[#d3dae4] text-xs">
                  {movie.year}
                </span>
              )}
              {movie.quality && (
                <span className="rounded-full bg-[#f3b55e] px-3 py-1.5 text-xs font-extrabold text-[#24180a]">
                  {movie.quality}
                </span>
              )}
              {movie.durationMinutes && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/7 px-3 py-1.5 text-[#d3dae4] text-xs">
                  <Clock size={14} /> {formatDuration(movie.durationMinutes)}
                </span>
              )}
              {movie.sourceCount > 1 && (
                <span className="rounded-full border border-[#f4b55e]/30 bg-[#f4b55e]/10 px-3 py-1.5 text-xs text-[#f4b55e]">
                  {movie.sourceCount} nguồn dự phòng
                </span>
              )}
            </div>

            {/* Description */}
            {movie.description && (
              <div className="mt-6">
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#8a9ab0]">
                  <Film size={16} /> Nội dung
                </h2>
                <p className="whitespace-pre-line text-[15px] leading-7 text-[#b8c1cf]">
                  {movie.description}
                </p>
              </div>
            )}

            {/* Metadata Grid */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {/* Genres */}
              {movie.genres.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#6a7a8a]">
                    Thể loại
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {movie.genres.map((genre) => (
                      <Link
                        key={genre.slug}
                        href={`/the-loai/${genre.slug}`}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[#c8d4e0] transition hover:border-white/20 hover:bg-white/10"
                      >
                        {genre.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Countries */}
              {movie.countries.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#6a7a8a]">
                    <Globe size={14} /> Quốc gia
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {movie.countries.map((country) => (
                      <Link
                        key={country.slug}
                        href={`/quoc-gia/${country.slug}`}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[#c8d4e0] transition hover:border-white/20 hover:bg-white/10"
                      >
                        {country.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Directors */}
              {movie.directors.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#6a7a8a]">
                    <Mic2 size={14} /> Đạo diễn
                  </h3>
                  <p className="text-sm text-[#b8c1cf]">{movie.directors.join(", ")}</p>
                </div>
              )}

              {/* Actors */}
              {movie.actors.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#6a7a8a]">
                    <Users size={14} /> Diễn viên
                  </h3>
                  <p className="line-clamp-2 text-sm text-[#b8c1cf]">
                    {movie.actors.slice(0, 8).join(", ")}
                    {movie.actors.length > 8 && ` +${movie.actors.length - 8} người khác`}
                  </p>
                </div>
              )}

              {/* Language */}
              {movie.language && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#6a7a8a]">
                    <Languages size={14} /> Ngôn ngữ
                  </h3>
                  <p className="text-sm text-[#b8c1cf]">{movie.language}</p>
                </div>
              )}
            </div>

            {/* Watch Button */}
            <div className="mt-8 flex flex-wrap gap-4">
              {movie.episodes.length > 0 ? (
                <Link
                  href={`/xem/${movie.slug}/${encodeURIComponent(movie.episodes[0].episodeKey)}`}
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-8 text-sm font-bold text-[#0b1017] shadow-xl transition hover:scale-[1.02] hover:bg-[#f2f4f8]"
                >
                  <Play size={18} fill="currentColor" /> Xem phim
                </Link>
              ) : (
                <button
                  disabled
                  className="inline-flex min-h-12 cursor-not-allowed items-center gap-2 rounded-full bg-white/40 px-8 text-sm font-bold text-[#0b1017]"
                >
                  <Play size={18} fill="currentColor" /> Chưa có nguồn
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Episodes */}
        {movie.episodes.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-4 text-xl font-bold text-white">
              {movie.type === "series" ? "Danh sách tập" : "Nguồn phát"}
            </h2>
            <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {movie.episodes.map((episode) => (
                <Link
                  key={episode.id}
                  href={`/xem/${movie.slug}/${encodeURIComponent(episode.episodeKey)}`}
                  className="flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:border-white/25 hover:bg-white/[0.08]"
                >
                  {episode.episodeLabel}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Related Movies */}
      {related.length > 0 && (
        <MovieRow
          title={`Phim cùng thể loại: ${movie.genres[0]?.name ?? ""}`}
          movies={related}
        />
      )}
    </div>
  );
}
