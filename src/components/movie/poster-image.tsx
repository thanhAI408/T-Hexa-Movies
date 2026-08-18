"use client";

import { Film } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface PosterImageProps {
  src: string | null;
  alt: string;
  className?: string;
  sizes: string;
  priority?: boolean;
}

export function PosterImage({
  src,
  alt,
  className = "",
  sizes,
  priority = false,
}: PosterImageProps) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={`relative block overflow-hidden bg-[#171d27] ${className}`}
      data-testid="poster-image"
    >
      {src && !failed ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover transition duration-500 group-hover:scale-[1.025]"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_25%,rgba(189,36,50,0.2),transparent_55%)] text-[#5e697a]">
          <Film size={32} strokeWidth={1.3} aria-hidden="true" />
          <span className="sr-only">Không có ảnh bìa</span>
        </span>
      )}
    </span>
  );
}
