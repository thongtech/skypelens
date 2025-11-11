import { SkypeExport } from "../types/messages";
import { debugLog } from "./debug";
import {
  SMALL_FILE_THRESHOLD,
  FILE_CHUNK_SIZE,
  MEDIA_PATH_PREFIX,
  PROGRESS_UPDATE_INTERVAL,
} from "../constants/fileUpload";

/**
 * Parses a Skype messages.json file, handling both small and large files.
 * For large files (>100MB), uses streaming to avoid memory issues.
 */
export async function parseJsonFile(
  file: File,
  onProgress: (progress: number) => void,
): Promise<SkypeExport> {
  debugLog("[fileParser] Starting to parse JSON file:", {
    fileName: file.name,
    fileSize: file.size,
    fileSizeMB: (file.size / 1024 / 1024).toFixed(2),
    method: file.size < SMALL_FILE_THRESHOLD ? "small file" : "streaming",
  });

  return file.size < SMALL_FILE_THRESHOLD
    ? parseSmallFile(file, onProgress)
    : parseStreamingFile(file, onProgress);
}

/**
 * Parses a Skype export directory containing messages.json and media files.
 * Extracts messages and builds a map of media files for later use.
 */
export async function parseDirectoryFiles(
  files: File[],
  onProgress: (progress: number) => void,
): Promise<SkypeExport> {
  const messagesFile = files.find(
    (file) =>
      file.name === "messages.json" ||
      file.webkitRelativePath.endsWith("messages.json"),
  );

  if (!messagesFile) {
    console.error("[fileParser] messages.json not found in directory:", {
      fileCount: files.length,
      fileNames: files.map((f) => f.name).slice(0, 10),
    });
    throw new Error("messages.json not found in directory");
  }

  // Parse messages.json first (90% of progress allocated to this)
  const data = await parseJsonFile(messagesFile, (prog) =>
    onProgress(Math.min(prog * 0.9, 90)),
  );

  // Build a map of media files for efficient lookup during message rendering
  // Files are indexed by both full filename and media ID (without extension)
  const mediaMap = new Map<string, File>();
  let mediaFileCount = 0;

  for (const file of files) {
    const path = file.webkitRelativePath;
    const mediaIndex = path.indexOf(MEDIA_PATH_PREFIX);
    if (mediaIndex === -1) continue;

    // Extract filename from path (e.g., "media/abc123.1.jpg" -> "abc123.1.jpg")
    const fileName = path.substring(mediaIndex + MEDIA_PATH_PREFIX.length);
    const lastDotIndex = fileName.lastIndexOf(".");
    if (lastDotIndex <= 0) continue;

    // Store file by full filename (e.g., "abc123.1.jpg")
    mediaMap.set(fileName, file);
    mediaFileCount++;

    // Also store by media ID for non-JSON files (e.g., "abc123" -> file)
    // This allows lookup by ID without knowing the exact extension
    if (!fileName.endsWith(".json")) {
      const mediaId = fileName.substring(0, lastDotIndex);
      if (!mediaMap.has(mediaId)) {
        mediaMap.set(mediaId, file);
      }
    }
  }

  debugLog("[fileParser] Directory parsing complete:", {
    conversations: data.conversations.length,
    mediaFiles: mediaMap.size,
    mediaFileCount,
  });

  onProgress(100);

  return { ...data, mediaFiles: mediaMap };
}

function parseJsonContent(content: string): SkypeExport {
  try {
    const parsed = JSON.parse(content) as SkypeExport;
    return parsed;
  } catch (error) {
    console.error("[fileParser] Failed to parse JSON content:", {
      error,
      contentLength: content.length,
      contentPreview: content.substring(0, 100),
    });
    throw new Error(
      `Failed to parse JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

async function parseSmallFile(
  file: File,
  onProgress: (progress: number) => void,
): Promise<SkypeExport> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = (error) => {
      console.error("[fileParser] FileReader error:", {
        error,
        fileName: file.name,
        fileSize: file.size,
      });
      reject(new Error("Failed to read file"));
    };

    reader.onload = (event) => {
      try {
        onProgress(100);
        const content = event.target?.result;
        if (typeof content !== "string") {
          console.error("[fileParser] File content is not a string:", {
            fileName: file.name,
            fileSize: file.size,
            resultType: typeof content,
          });
          reject(new Error("File content is not a string"));
          return;
        }
        resolve(parseJsonContent(content));
      } catch (error) {
        console.error("[fileParser] Failed to parse small file:", {
          error,
          fileName: file.name,
          fileSize: file.size,
        });
        reject(error);
      }
    };

    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.min((event.loaded / event.total) * 95, 95));
      }
    };

    reader.readAsText(file);
  });
}

/**
 * Parses large files by reading in chunks to avoid loading entire file into memory.
 * Uses recursive chunk reading with setTimeout(0) to yield to the event loop between chunks,
 * preventing UI blocking. Progress updates are throttled to avoid excessive re-renders.
 */
async function parseStreamingFile(
  file: File,
  onProgress: (progress: number) => void,
): Promise<SkypeExport> {
  return new Promise((resolve, reject) => {
    let offset = 0;
    const chunks: string[] = [];
    let lastProgressUpdate = 0;

    const readNextChunk = () => {
      const reader = new FileReader();

      reader.onerror = (error) => {
        console.error("[fileParser] FileReader chunk error:", {
          error,
          fileName: file.name,
          offset,
          chunkSize: FILE_CHUNK_SIZE,
        });
        reject(new Error("Failed to read file chunk"));
      };

      reader.onload = (e) => {
        chunks.push(e.target?.result as string);
        offset += FILE_CHUNK_SIZE;

        // Throttle progress updates to avoid excessive re-renders
        const now = Date.now();
        if (now - lastProgressUpdate > PROGRESS_UPDATE_INTERVAL) {
          onProgress(Math.min((offset / file.size) * 95, 95));
          lastProgressUpdate = now;
        }

        if (offset < file.size) {
          // Yield to event loop before reading next chunk to prevent UI blocking
          setTimeout(readNextChunk, 0);
        } else {
          try {
            onProgress(100);
            // Join all chunks into complete text before parsing JSON
            const textContent = chunks.join("");
            resolve(parseJsonContent(textContent));
          } catch (error) {
            console.error("[fileParser] Failed to parse streaming file:", {
              error,
              fileName: file.name,
              fileSize: file.size,
              chunksCount: chunks.length,
            });
            reject(
              error instanceof Error
                ? error
                : new Error("Failed to parse JSON"),
            );
          }
        }
      };

      reader.readAsText(file.slice(offset, offset + FILE_CHUNK_SIZE));
    };

    readNextChunk();
  });
}
