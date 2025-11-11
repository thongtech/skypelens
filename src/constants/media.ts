export const MEDIA_MAX_SIZE = 400;
export const MEDIA_BORDER_RADIUS = 8;
export const PLAY_BUTTON_SIZE = 60;
export const PLAY_ICON_SIZE = 32;
export const THUMBNAIL_SIZE = 80;
export const URL_REVOKE_DELAY = 500;

export const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"]);
export const VIDEO_EXTS = new Set(["mp4", "webm", "mov", "avi", "mkv", "m4v"]);

export const MEDIA_PAPER_STYLE = {
  maxWidth: `${MEDIA_MAX_SIZE}px`,
  width: "fit-content",
  display: "inline-block",
  cursor: "pointer",
} as const;

export const MEDIA_IMAGE_STYLE = {
  maxHeight: `${MEDIA_MAX_SIZE}px`,
  maxWidth: `${MEDIA_MAX_SIZE}px`,
  width: "auto",
  height: "auto",
  display: "block",
  borderRadius: `${MEDIA_BORDER_RADIUS}px`,
  objectFit: "contain",
} as const;

export const FILENAME_TEXT_STYLE = {
  display: "block",
  wordBreak: "break-word",
  overflowWrap: "break-word",
} as const;
