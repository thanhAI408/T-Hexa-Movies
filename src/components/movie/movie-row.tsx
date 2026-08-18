import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { MovieCard } from "@/components/movie/movie-card";
import type { CanonicalMovieView } from "@/types/catalog";

export function MovieRow({
  title,
  eyebrow,
  href,
  movies,
  priority = false,
}: {
  title: string;
  eyebrow?: string;
  href?: string;
  movies: CanonicalMovieView[];
  priority?: boolean;
}) {
  if (!movies.length) return null;
  const rowId = href ? href.replace(/\W/g, "-") : "all";
  return (
    <section className="content-auto py-8 sm:py-10" aria-labelledby={`row-${rowId}`}>
      <div className="section-header">
        <div>
          {eyebrow && (
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#38bdf8]">
              {eyebrow}
            </p>
          )}
          <h2 id={`row-${rowId}`} className="section-title">
            {title}
          </h2>
        </div>
        {href && (
          <Link href={href} className="section-link">
            Xem tất cả <ArrowRight size={14} />
          </Link>
        )}
      </div>
      <div className="movie-row-scroll">
        {movies.map((movie, index) => (
          <MovieCard key={movie.id} movie={movie} priority={priority && index < 5} />
        ))}
      </div>
    </section>
  );
}
