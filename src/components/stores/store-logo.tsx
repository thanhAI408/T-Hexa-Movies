"use client";

import React from "react";

export type StoreSlug = "binh-minh" | "ban-mai" | "hoang-hon" | "da-nguyet" | string;

interface StoreLogoProps {
  slug: StoreSlug;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  showGlow?: boolean;
}

const SIZE_MAP = {
  sm: "h-7 w-7",
  md: "h-10 w-10",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
  "2xl": "h-20 w-20",
};

export function StoreLogo({ slug, size = "md", className = "", showGlow = true }: StoreLogoProps) {
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;

  switch (slug) {
    case "binh-minh":
      return (
        <div className={`relative inline-flex items-center justify-center shrink-0 ${sizeClass} ${className}`}>
          {showGlow && (
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/50 via-amber-500/40 to-transparent blur-md opacity-80 transition-opacity group-hover:opacity-100 animate-pulse" />
          )}
          <svg viewBox="0 0 100 100" className="relative h-full w-full drop-shadow-xl" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bm-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#431407" />
                <stop offset="50%" stopColor="#1c0a02" />
                <stop offset="100%" stopColor="#080301" />
              </linearGradient>
              <linearGradient id="bm-sun" x1="50%" y1="100%" x2="50%" y2="0%">
                <stop offset="0%" stopColor="#ea580c" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#fef08a" />
              </linearGradient>
              <linearGradient id="bm-ray" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#fef08a" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="bm-wave" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#c2410c" />
                <stop offset="50%" stopColor="#ea580c" />
                <stop offset="100%" stopColor="#9a3412" />
              </linearGradient>
              <linearGradient id="bm-border" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#7c2d12" />
              </linearGradient>
              <filter id="bm-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Rounded Enamel Shield Base */}
            <rect x="4" y="4" width="92" height="92" rx="26" fill="url(#bm-bg)" stroke="url(#bm-border)" strokeWidth="2.5" />
            
            {/* Ambient Radial Aura */}
            <circle cx="50" cy="58" r="32" fill="#ea580c" fillOpacity="0.25" filter="url(#bm-glow)" />

            {/* Rising Sunrays */}
            <g opacity="0.9" filter="url(#bm-glow)">
              <line x1="50" y1="52" x2="50" y2="18" stroke="url(#bm-ray)" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="40" y1="53" x2="26" y2="25" stroke="url(#bm-ray)" strokeWidth="3" strokeLinecap="round" />
              <line x1="60" y1="53" x2="74" y2="25" stroke="url(#bm-ray)" strokeWidth="3" strokeLinecap="round" />
              <line x1="33" y1="56" x2="14" y2="38" stroke="url(#bm-ray)" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="67" y1="56" x2="86" y2="38" stroke="url(#bm-ray)" strokeWidth="2.5" strokeLinecap="round" />
            </g>

            {/* Rising Sun Sphere */}
            <path d="M 28 58 A 22 22 0 0 1 72 58 Z" fill="url(#bm-sun)" filter="url(#bm-glow)" />
            <circle cx="50" cy="58" r="14" fill="#fffbeb" fillOpacity="0.85" filter="url(#bm-glow)" />

            {/* Horizon Ocean / Mountain Crest */}
            <path d="M 12 60 Q 32 55 50 60 T 88 60 L 88 78 Q 68 84 50 82 T 12 78 Z" fill="url(#bm-wave)" opacity="0.9" />
            <path d="M 16 68 Q 36 64 50 67 T 84 66" stroke="#fef08a" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
            <path d="M 24 74 Q 40 71 50 73 T 76 72" stroke="#fed7aa" strokeWidth="1" strokeLinecap="round" opacity="0.5" />

            {/* Brilliant Dawn Sparkle */}
            <polygon points="50,14 52,20 58,22 52,24 50,30 48,24 42,22 48,20" fill="#ffffff" filter="url(#bm-glow)" />
          </svg>
        </div>
      );

    case "ban-mai":
      return (
        <div className={`relative inline-flex items-center justify-center shrink-0 ${sizeClass} ${className}`}>
          {showGlow && (
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-yellow-400/50 via-sky-400/30 to-amber-500/40 blur-md opacity-80 transition-opacity group-hover:opacity-100 animate-pulse" />
          )}
          <svg viewBox="0 0 100 100" className="relative h-full w-full drop-shadow-xl" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bmai-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#082f49" />
                <stop offset="50%" stopColor="#0c1929" />
                <stop offset="100%" stopColor="#030712" />
              </linearGradient>
              <linearGradient id="bmai-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="40%" stopColor="#facc15" />
                <stop offset="80%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
              <linearGradient id="bmai-border" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <filter id="bmai-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Rounded Enamel Shield */}
            <rect x="4" y="4" width="92" height="92" rx="26" fill="url(#bmai-bg)" stroke="url(#bmai-border)" strokeWidth="2.5" />

            {/* Radiant Solar Disc Aura */}
            <circle cx="50" cy="50" r="32" fill="#facc15" fillOpacity="0.22" filter="url(#bmai-glow)" />

            {/* 16-Point Geometrical Sunburst Corona */}
            <g transform="translate(50, 50)" filter="url(#bmai-glow)">
              {Array.from({ length: 12 }).map((_, i) => {
                const rot = (i * 360) / 12;
                return (
                  <path
                    key={i}
                    d="M 0 -36 L 4 -23 L 0 -19 L -4 -23 Z"
                    fill="url(#bmai-gold)"
                    transform={`rotate(${rot})`}
                  />
                );
              })}
            </g>

            {/* Outer Solar Orbital Rings */}
            <circle cx="50" cy="50" r="22" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.65" />
            <circle cx="50" cy="50" r="18" fill="url(#bmai-gold)" />

            {/* Blazing White Solar Core */}
            <circle cx="50" cy="50" r="10" fill="#ffffff" filter="url(#bmai-glow)" />

            {/* Four-Point Prismatic Diamond Star Flare */}
            <polygon points="50,22 53,47 78,50 53,53 50,78 47,53 22,50 47,47" fill="#ffffff" opacity="0.9" filter="url(#bmai-glow)" />
          </svg>
        </div>
      );

    case "hoang-hon":
      return (
        <div className={`relative inline-flex items-center justify-center shrink-0 ${sizeClass} ${className}`}>
          {showGlow && (
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-rose-500/50 via-purple-600/40 to-amber-500/40 blur-md opacity-80 transition-opacity group-hover:opacity-100 animate-pulse" />
          )}
          <svg viewBox="0 0 100 100" className="relative h-full w-full drop-shadow-xl" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="hh-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4c0519" />
                <stop offset="50%" stopColor="#2e1065" />
                <stop offset="100%" stopColor="#090514" />
              </linearGradient>
              <linearGradient id="hh-sun" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="35%" stopColor="#f43f5e" />
                <stop offset="70%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#facc15" />
              </linearGradient>
              <linearGradient id="hh-border" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="50%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#fb923c" />
              </linearGradient>
              <linearGradient id="hh-city" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#581c87" />
                <stop offset="100%" stopColor="#1e1b4b" />
              </linearGradient>
              <filter id="hh-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Rounded Enamel Base */}
            <rect x="4" y="4" width="92" height="92" rx="26" fill="url(#hh-bg)" stroke="url(#hh-border)" strokeWidth="2.5" />

            {/* Twilight Neon Glow */}
            <circle cx="50" cy="46" r="30" fill="#f43f5e" fillOpacity="0.25" filter="url(#hh-glow)" />

            {/* Retro-Modern Cinema Sun with Anamorphic Slits */}
            <g filter="url(#hh-glow)">
              {/* Top Dome */}
              <path d="M 28 40 A 24 24 0 0 1 72 40 Z" fill="url(#hh-sun)" />
              {/* Middle Slats */}
              <rect x="27" y="43" width="46" height="5" rx="2.5" fill="url(#hh-sun)" />
              <rect x="29" y="51" width="42" height="4.5" rx="2.2" fill="url(#hh-sun)" />
              <rect x="33" y="58" width="34" height="3.5" rx="1.7" fill="url(#hh-sun)" />
              <rect x="39" y="64" width="22" height="2.5" rx="1.2" fill="url(#hh-sun)" />
            </g>

            {/* Skyline / Cinema Silhouette */}
            <path
              d="M 12 78 L 22 78 L 22 70 L 30 70 L 30 65 L 38 65 L 38 72 L 46 72 L 46 62 L 54 62 L 54 75 L 64 75 L 64 68 L 72 68 L 72 74 L 88 74 L 88 88 L 12 88 Z"
              fill="url(#hh-city)"
              opacity="0.95"
            />
            {/* Glowing Windows in Skyline */}
            <circle cx="26" cy="74" r="1" fill="#fef08a" />
            <circle cx="34" cy="68" r="1.2" fill="#fde047" />
            <circle cx="50" cy="66" r="1.2" fill="#fde047" />
            <circle cx="68" cy="71" r="1" fill="#fef08a" />

            {/* Twilight Star Sparkle */}
            <polygon points="76,20 77.5,24 82,25 77.5,26.5 76,31 74.5,26.5 70,25 74.5,24" fill="#fbcfe8" filter="url(#hh-glow)" />
          </svg>
        </div>
      );

    case "da-nguyet":
      return (
        <div className={`relative inline-flex items-center justify-center shrink-0 ${sizeClass} ${className}`}>
          {showGlow && (
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/50 via-purple-500/40 to-cyan-400/40 blur-md opacity-80 transition-opacity group-hover:opacity-100 animate-pulse" />
          )}
          <svg viewBox="0 0 100 100" className="relative h-full w-full drop-shadow-xl" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="dn-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e1b4b" />
                <stop offset="50%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#020617" />
              </linearGradient>
              <linearGradient id="dn-moon" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e0e7ff" />
                <stop offset="30%" stopColor="#a5b4fc" />
                <stop offset="70%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
              <linearGradient id="dn-star" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="50%" stopColor="#67e8f9" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
              <linearGradient id="dn-border" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="50%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#4338ca" />
              </linearGradient>
              <filter id="dn-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Rounded Enamel Base */}
            <rect x="4" y="4" width="92" height="92" rx="26" fill="url(#dn-bg)" stroke="url(#dn-border)" strokeWidth="2.5" />

            {/* Nebula Aura */}
            <circle cx="48" cy="50" r="30" fill="#6366f1" fillOpacity="0.25" filter="url(#dn-glow)" />

            {/* Glowing Celestial Crescent Moon */}
            <path
              d="M 58 18 C 76 26 84 50 72 68 C 60 84 36 86 22 74 C 36 78 54 72 62 58 C 70 42 66 26 58 18 Z"
              fill="url(#dn-moon)"
              filter="url(#dn-glow)"
            />

            {/* Moonlight Inner Glow Accent */}
            <path
              d="M 55 24 C 68 32 74 50 64 64 C 58 72 48 76 36 75 C 48 73 58 66 62 54 C 66 42 62 30 55 24 Z"
              fill="#e0e7ff"
              opacity="0.6"
            />

            {/* Radiant 8-Point Polaris Star in Crescent Cradle */}
            <g transform="translate(34, 40)" filter="url(#dn-glow)">
              <polygon
                points="0,-16 3,-5 14,-3 5,3 8,14 0,7 -8,14 -5,3 -14,-3 -3,-5"
                fill="url(#dn-star)"
              />
              <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
            </g>

            {/* Tiny Stardust Constellation Dots */}
            <circle cx="28" cy="24" r="1.5" fill="#a5f3fc" opacity="0.8" />
            <circle cx="20" cy="48" r="1" fill="#c7d2fe" opacity="0.6" />
            <circle cx="78" cy="38" r="1.2" fill="#67e8f9" opacity="0.7" />
            <circle cx="72" cy="78" r="1.5" fill="#e0e7ff" opacity="0.8" />
          </svg>
        </div>
      );

    default:
      return null;
  }
}
