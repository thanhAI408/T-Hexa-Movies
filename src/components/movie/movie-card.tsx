import { Clapperboard, Play } from "lucide-react";
import Link from "next/link";

import { PosterImage } from "@/components/movie/poster-image";
import type { CanonicalMovieView } from "@/types/catalog";

export function MovieCard({ movie, priority = false }: { movie: CanonicalMovieView; priority?: boolean }) {
  const episode = movie.currentEpisode ?? movie.latestEpisodeLabel;
  return (
    <article className="movie-card">
      <Link
        href={`/phim/${movie.slug}`}
        className="block focus-visible:outline-offset-4"
        aria-label={`Xem chi tiết ${movie.title}`}
      >
        {/* Poster Container */}
        <div className="movie-poster-container">
          <PosterImage
            src={movie.posterUrl}
            alt={`Poster ${movie.title}`}
            sizes="(max-width: 720px) 130px, (max-width: 1200px) 15vw, 180px"
            priority={priority}
            className="movie-poster"
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

          {/* Play Button */}
          <div className="movie-play-overlay">
            <div className="movie-play-btn">
              <Play size={22} fill="currentColor" className="ml-0.5" />
            </div>
          </div>

          {/* Badges */}
          <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
            {movie.quality ? (
              <span className="movie-quality">{movie.quality}</span>
            ) : null}
            {movie.isCinema ? (
              <span className="movie-cinema">
                <Clapperboard size={11} /> Rạp
              </span>
            ) : null}
          </div>

          {/* Episode Label */}
          {episode ? (
            <span className="absolute bottom-2 right-2 max-w-[75%] truncate rounded-md bg-black/70 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">
              {episode}
            </span>
          ) : null}
        </div>

        {/* Movie Info */}
        <h3 className="mt-3 line-clamp-2 min-h-[36px] movie-title">
          {movie.title}
        </h3>
        <div className="mt-1.5 flex items-center gap-2 movie-meta">
          <span>{movie.year ?? "—"}</span>
          <span className="opacity-40">•</span>
          <span>{movie.type === "series" ? "Phim bộ" : movie.type === "animation" ? "Hoạt hình" : "Phim lẻ"}</span>
          {movie.sourceCount > 1 ? (
            <span className="movie-sources ml-auto">{movie.sourceCount} nguồn</span>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
