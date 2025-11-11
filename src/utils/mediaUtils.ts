import type { MediaMetadata } from "../types/messages";
import { IMAGE_EXTS, VIDEO_EXTS } from "../constants/media";

const uriObjectPattern =
  /<URIObject[^>]*uri="https:\/\/api\.asm\.skype\.com\/v1\/objects\/([a-zA-Z0-9-]+)"/;
const picPattern = /[?&]pic=([a-zA-Z0-9-]+)/;
const filePattern = /[?&]file=([a-zA-Z0-9-]+)/;

/**
 * Extracts the media ID from message content.
 * Handles different Skype media URL formats:
 * - URIObject: <URIObject uri="https://api.asm.skype.com/v1/objects/{id}">
 * - pic parameter: ?pic={id}
 * - file parameter: ?file={id}
 * Returns the first match found, or null if no media ID is present.
 */
export function extractMediaId(content: string): string | null {
  return (
    uriObjectPattern.exec(content)?.[1] ||
    picPattern.exec(content)?.[1] ||
    filePattern.exec(content)?.[1] ||
    null
  );
}

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot === -1 ? "" : filename.substring(lastDot + 1).toLowerCase();
}

function isImageExtension(extension: string): boolean {
  return IMAGE_EXTS.has(extension.toLowerCase());
}

function isVideoExtension(extension: string): boolean {
  return VIDEO_EXTS.has(extension.toLowerCase());
}

async function getMediaMetadata(
  mediaId: string,
  mediaFiles: Map<string, File>,
): Promise<MediaMetadata | null> {
  const jsonFile = mediaFiles.get(`${mediaId}.json`);
  if (!jsonFile) return null;

  try {
    return JSON.parse(await jsonFile.text()) as MediaMetadata;
  } catch (error) {
    console.error("[mediaUtils] Failed to parse media metadata:", {
      error,
      mediaId,
      fileName: jsonFile.name,
    });
    return null;
  }
}

/**
 * Creates an object URL for a media file.
 * Handles file extension detection and alternative extensions (jpg/jpeg).
 */
export async function createMediaUrl(
  mediaId: string,
  mediaFiles: Map<string, File>,
): Promise<string | null> {
  try {
    const metadata = await getMediaMetadata(mediaId, mediaFiles);
    if (!metadata) {
      return null;
    }

    const extension = getFileExtension(metadata.filename);
    if (!extension) {
      return null;
    }

    // Skype media files follow pattern: {mediaId}.1.{extension}
    // The ".1" indicates the first version/variant of the media
    const mediaFileName = `${mediaId}.1.${extension}`;
    let mediaFile = mediaFiles.get(mediaFileName);

    // Handle jpg/jpeg extension variations (Skype may store as either)
    if (!mediaFile && isImageExtension(extension)) {
      const altExt =
        extension === "jpg" ? "jpeg" : extension === "jpeg" ? "jpg" : null;
      if (altExt) {
        mediaFile = mediaFiles.get(`${mediaId}.1.${altExt}`);
      }
    }

    if (mediaFile) {
      const url = URL.createObjectURL(mediaFile);
      return url;
    }

    return null;
  } catch (error) {
    console.error("[mediaUtils] Failed to create media URL:", {
      error,
      mediaId,
    });
    return null;
  }
}

/**
 * Creates an object URL for a video thumbnail.
 * Video thumbnails follow pattern: {mediaId}.2.jpeg (the ".2" indicates thumbnail variant).
 */
export async function createVideoThumbnailUrl(
  mediaId: string,
  mediaFiles: Map<string, File>,
): Promise<string | null> {
  try {
    const thumbnailFile = mediaFiles.get(`${mediaId}.2.jpeg`);
    if (thumbnailFile) {
      const url = URL.createObjectURL(thumbnailFile);
      return url;
    }

    return null;
  } catch (error) {
    console.error("[mediaUtils] Failed to create video thumbnail URL:", {
      error,
      mediaId,
    });
    return null;
  }
}

export async function getMediaType(
  mediaId: string,
  mediaFiles: Map<string, File>,
): Promise<"image" | "video" | null> {
  const metadata = await getMediaMetadata(mediaId, mediaFiles);
  if (!metadata) {
    return null;
  }

  const extension = getFileExtension(metadata.filename);
  if (!extension) {
    return null;
  }

  return isImageExtension(extension)
    ? "image"
    : isVideoExtension(extension)
      ? "video"
      : null;
}
