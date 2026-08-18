import { Clapperboard, Info, Play, Server } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { CanonicalMovieView } from "@/types/catalog";

export function HeroSection({ movie }: { movie: CanonicalMovieView }) {
  const image = movie.backdropUrl ?? movie.posterUrl;
  return (
    <section className="hero-section">
      {/* Backdrop Image */}
      {image && (
        <div
          className="hero-backdrop"
          style={{ backgroundImage: `url(${image})` }}
        />
      )}

      {/* Gradient Overlays */}
      <div className="hero-gradient" />

      {/* Content */}
      <div className="hero-content">
        {/* Badges */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {movie.isCinema ? (
            <span className="movie-cinema">
              <Clapperboard size={13} /> Phim chiếu rạp
            </span>
          ) : (
            <span className="rounded-full border border-white/15 bg-white/8 px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm">
              Mới cập nhật
            </span>
          )}
          {movie.quality && (
            <span className="movie-quality">{movie.quality}</span>
          )}
        </div>

        {/* Title */}
        <h1 className="hero-title">{movie.title}</h1>

        {/* Meta */}
        <div className="hero-meta">
          <span className="font-semibold text-white">{movie.year ?? "Mới"}</span>
          {movie.durationMinutes && (
            <span>{movie.durationMinutes} phút</span>
          )}
          {movie.genres.slice(0, 3).map((genre) => (
            <span key={genre.slug}>{genre.name}</span>
          ))}
          {movie.sourceCount > 1 && (
            <span className="flex items-center gap-1.5 text-[#38bdf8]">
              <Server size={14} /> {movie.sourceCount} nguồn dự phòng
            </span>
          )}
        </div>

        {/* Description */}
        {movie.description && (
          <p className="hero-description line-clamp-3">
            {movie.description}
          </p>
        )}

        {/* Actions */}
        <div className="hero-actions">
          <Link
            href={`/phim/${movie.slug}`}
            className="hero-btn-primary"
          >
            <Play size={18} fill="currentColor" /> Xem phim
          </Link>
          <Link
            href={`/phim/${movie.slug}`}
            className="hero-btn-secondary"
          >
            <Info size={18} /> Chi tiết
          </Link>
        </div>
      </div>
    </section>
  );
}
