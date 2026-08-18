import type { Metadata } from "next";

import { Clapperboard } from "lucide-react";
import { listMovies } from "@/lib/catalog/repository";
import { MovieRow } from "@/components/movie/movie-row";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Phim chiếu rạp",
  description: "Danh sách phim đang chiếu rạp, cập nhật liên tục từ các rạp chiếu phim Việt Nam.",
};

export default async function CinemaPage() {
  const movies = await listMovies({ cinema: true, limit: 60 });

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center gap-3">
        <Clapperboard size={28} className="text-[#e04655]" />
        <h1 className="text-2xl font-bold text-white">Phim chiếu rạp</h1>
      </div>

      {movies.items.length > 0 ? (
        <MovieRow title="" href="" movies={movies.items} />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Clapperboard size={64} className="mb-6 text-[#4a5568]" />
          <h2 className="mb-3 text-xl font-semibold text-white">Chưa có phim chiếu rạp</h2>
          <p className="text-[#8896a9]">
            Danh sách phim đang chiếu rạp sẽ được cập nhật sớm.
          </p>
        </div>
      )}
    </div>
  );
}
