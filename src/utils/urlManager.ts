import { URL_REVOKE_DELAY } from "../constants/media";

export function revokeObjectUrl(url: string | null, loaded: boolean): void {
  if (!url) return;

  if (loaded) {
    try {
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("[urlManager] Failed to revoke object URL:", {
        error,
        url,
      });
    }
  } else {
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("[urlManager] Failed to revoke object URL (delayed):", {
          error,
          url,
        });
      }
    }, URL_REVOKE_DELAY);
  }
}
