import { z } from "zod";

const localPath = z
  .string()
  .max(1500)
  .regex(/^\/stores\/[a-z-]+\/(?:watch|movie)\/[^?#]+(?:\?[^#]*)?$/);
export const movieEntrySchema = z.object({
  id: z.string().max(400),
  title: z.string().max(300),
  href: localPath,
  detailHref: localPath,
  poster: z.string().max(2000).nullable().optional(),
  favorite: z.boolean().optional(),
  later: z.boolean().optional(),
  episode: z.string().max(150).optional(),
  position: z.number().finite().min(0).optional(),
  duration: z.number().finite().min(0).optional(),
  completed: z.boolean().optional(),
  updated: z.number().finite(),
});
export type MovieEntry = z.infer<typeof movieEntrySchema>;
export type MovieIdentity = Pick<
  MovieEntry,
  "id" | "title" | "href" | "detailHref" | "poster"
>;
export const LIBRARY_KEY = "thexa-movies-v1";
export const PREFERENCES_KEY = "thexa-viewing-v1";
export const STORAGE_EVENT = "thexa-local-change";
const volatile = new Map<string, string>();
export function readLocal(key: string, fallback = "[]"): string {
  if (typeof window === "undefined") return fallback;
  if (volatile.has(key)) return volatile.get(key)!;
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
export function writeLocal(key: string, value: string): boolean {
  let persisted = true;
  try {
    window.localStorage.setItem(key, value);
    volatile.delete(key);
  } catch {
    persisted = false;
    volatile.set(key, value);
  }
  window.dispatchEvent(new Event(STORAGE_EVENT));
  return persisted;
}
export function subscribeLocal(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(STORAGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}
export function parseLibrary(raw: string): MovieEntry[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value)
      ? value
          .flatMap((item) => {
            const parsed = movieEntrySchema.safeParse(item);
            return parsed.success ? [parsed.data] : [];
          })
          .slice(0, 100)
      : [];
  } catch {
    return [];
  }
}
export function updateMovie(movie: MovieIdentity, patch: Partial<MovieEntry>) {
  const entries = parseLibrary(readLocal(LIBRARY_KEY));
  const previous = entries.find((entry) => entry.id === movie.id);
  const next = movieEntrySchema.parse({
    ...previous,
    ...movie,
    ...patch,
    id: movie.id,
    updated: Date.now(),
  });
  return writeLocal(
    LIBRARY_KEY,
    JSON.stringify(
      [next, ...entries.filter((entry) => entry.id !== movie.id)].slice(0, 100),
    ),
  );
}
export function preferences() {
  try {
    const p = JSON.parse(readLocal(PREFERENCES_KEY, "{}"));
    return { autoNext: p.autoNext !== false, reduced: p.reduced === true };
  } catch {
    return { autoNext: true, reduced: false };
  }
}
export function setPreference(patch: Partial<ReturnType<typeof preferences>>) {
  return writeLocal(
    PREFERENCES_KEY,
    JSON.stringify({ ...preferences(), ...patch }),
  );
}
