import { normalizeTitle } from "@/providers/shared/normalize";

export function slugify(value: string) {
  return normalizeTitle(value).replace(/\s+/g, "-").replace(/^-+|-+$/g, "");
}

export function canonicalSlug(title: string, year: number | null, suffix?: string) {
  return [slugify(title) || "phim", year, suffix].filter(Boolean).join("-");
}
