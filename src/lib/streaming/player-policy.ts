// No popups, top navigation, forms, downloads or modal dialogs.
// External players need scripts and their own origin for media/storage support.
export const PLAYER_SANDBOX = "allow-scripts allow-same-origin allow-presentation";
export const PLAYER_PERMISSIONS = "autoplay; fullscreen; picture-in-picture; encrypted-media";

export function safePlaybackUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}
