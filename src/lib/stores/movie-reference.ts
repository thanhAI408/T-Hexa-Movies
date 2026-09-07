import { PROVIDER_IDS, type ProviderId } from "@/types/catalog";

// Preserve the catalog's identity from discovery to playback.
export function movieReference(provider: ProviderId, slug: string): string {
  return `${provider}~${slug}`;
}

export function parseMovieReference(reference: string) {
  const separator = reference.indexOf("~");
  const provider = reference.slice(0, separator) as ProviderId;
  if (separator > 0 && PROVIDER_IDS.includes(provider)) {
    return { provider, slug: reference.slice(separator + 1) };
  }
  return { provider: null, slug: reference };
}
