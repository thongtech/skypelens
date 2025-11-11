import { Paper, Text, Loader, Center, Box } from "@mantine/core";
import { useState, useEffect, useRef, useCallback } from "react";
import { useMessageStore } from "../../store/messageStore";
import {
  createMediaUrl,
  createVideoThumbnailUrl,
  getMediaType,
} from "../../utils/mediaUtils";
import type { MediaMetadata } from "../../types/messages";
import { MediaViewer } from "./MediaViewer";
import { useMediaNavigation } from "../../hooks/useMediaGallery";
import { IconPlayerPlayFilled } from "@tabler/icons-react";
import { revokeObjectUrl } from "../../utils/urlManager";
import {
  MEDIA_PAPER_STYLE,
  MEDIA_IMAGE_STYLE,
  FILENAME_TEXT_STYLE,
  PLAY_BUTTON_SIZE,
  PLAY_ICON_SIZE,
} from "../../constants/media";

interface MediaMessageProps {
  mediaId: string;
  isOwner: boolean;
}

export function MediaMessage({ mediaId, isOwner }: MediaMessageProps) {
  const { exportData } = useMessageStore();
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerOpened, setViewerOpened] = useState(false);
  const [currentViewMediaId, setCurrentViewMediaId] = useState(mediaId);
  const imageLoadedRef = useRef(false);
  const thumbLoadedRef = useRef(false);
  const urlRef = useRef<string | null>(null);
  const thumbUrlRef = useRef<string | null>(null);

  const navigation = useMediaNavigation(currentViewMediaId, viewerOpened);
  const hasNavigation = !navigation.isLoading && navigation.totalMedia > 1;

  const handleOpenViewer = useCallback(() => {
    setCurrentViewMediaId(mediaId);
    setViewerOpened(true);
  }, [mediaId]);

  const handleClose = useCallback(() => {
    setViewerOpened(false);
  }, []);

  const handlePrevious = useCallback(() => {
    if (navigation.previousMediaId) {
      setCurrentViewMediaId(navigation.previousMediaId);
    }
  }, [navigation.previousMediaId]);

  const handleNext = useCallback(() => {
    if (navigation.nextMediaId) {
      setCurrentViewMediaId(navigation.nextMediaId);
    }
  }, [navigation.nextMediaId]);

  const handleNavigateToIndex = useCallback(
    (index: number) => {
      if (navigation.mediaItems[index]) {
        setCurrentViewMediaId(navigation.mediaItems[index].mediaId);
      }
    },
    [navigation.mediaItems],
  );

  useEffect(() => {
    let cancelled = false;
    imageLoadedRef.current = false;
    thumbLoadedRef.current = false;

    async function loadMedia() {
      if (!exportData?.mediaFiles) {
        if (!cancelled) {
          console.error("[MediaMessage] No media files available:", {
            mediaId,
            hasExportData: !!exportData,
          });
          setError("No media files available");
          setIsLoading(false);
        }
        return;
      }

      try {
        const [metadataFile, type, url] = await Promise.all([
          exportData.mediaFiles
            .get(`${mediaId}.json`)
            ?.text()
            .catch((error) => {
              console.error("[MediaMessage] Failed to read metadata file:", {
                error,
                mediaId,
                fileName: `${mediaId}.json`,
              });
              return null;
            }),
          getMediaType(mediaId, exportData.mediaFiles),
          createMediaUrl(mediaId, exportData.mediaFiles),
        ]);

        if (cancelled) {
          if (url) revokeObjectUrl(url, false);
          return;
        }

        if (metadataFile) {
          try {
            const meta: MediaMetadata = JSON.parse(metadataFile);
            if (!cancelled) setMetadata(meta);
          } catch (error) {
            console.error("[MediaMessage] Failed to parse metadata:", {
              error,
              mediaId,
              fileName: `${mediaId}.json`,
            });
          }
        }

        setMediaType(type);

        if (url) {
          urlRef.current = url;
          setMediaUrl(url);

          if (type === "video") {
            try {
              const thumb = await createVideoThumbnailUrl(
                mediaId,
                exportData.mediaFiles,
              );
              if (!cancelled && thumb) {
                thumbUrlRef.current = thumb;
                setThumbnailUrl(thumb);
              }
            } catch (error) {
              console.error("[MediaMessage] Failed to load video thumbnail:", {
                error,
                mediaId,
              });
            }
          }
        } else {
          console.error("[MediaMessage] Media file not found:", {
            mediaId,
            mediaType: type,
          });
          setError("Media file not found");
        }
      } catch (error) {
        console.error("[MediaMessage] Failed to load media:", {
          error,
          mediaId,
          hasMediaFiles: !!exportData?.mediaFiles,
        });
        if (!cancelled) setError("Failed to load media");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadMedia();

    return () => {
      cancelled = true;
      revokeObjectUrl(urlRef.current, imageLoadedRef.current);
      revokeObjectUrl(thumbUrlRef.current, thumbLoadedRef.current);
      urlRef.current = null;
      thumbUrlRef.current = null;
    };
  }, [mediaId, exportData]);

  const paperBaseStyle = {
    maxWidth: "400px",
    width: "auto",
  } as const;

  if (isLoading) {
    return (
      <Paper
        px="md"
        py="sm"
        radius="lg"
        bg={isOwner ? "#0078d4" : "dark.5"}
        style={paperBaseStyle}
      >
        <Center p="xl">
          <Loader size="sm" color={isOwner ? "white" : "blue"} />
        </Center>
      </Paper>
    );
  }

  if (error || !mediaUrl) {
    return (
      <Paper
        px="md"
        py="sm"
        radius="lg"
        bg={isOwner ? "#0078d4" : "dark.5"}
        style={paperBaseStyle}
      >
        <Text size="sm" c={isOwner ? "white" : "dimmed"}>
          📎 {metadata?.filename || "Media file not available"}
        </Text>
      </Paper>
    );
  }

  const renderMediaViewer = () => (
    <MediaViewer
      opened={viewerOpened}
      onClose={handleClose}
      mediaId={currentViewMediaId}
      initialMediaUrl={currentViewMediaId === mediaId ? mediaUrl : undefined}
      initialMetadata={currentViewMediaId === mediaId ? metadata : undefined}
      onPrevious={hasNavigation ? handlePrevious : undefined}
      onNext={hasNavigation ? handleNext : undefined}
      onNavigateToIndex={hasNavigation ? handleNavigateToIndex : undefined}
      hasPrevious={hasNavigation && navigation.hasPrevious}
      hasNext={hasNavigation && navigation.hasNext}
      currentIndex={navigation.currentIndex}
      totalMedia={navigation.totalMedia}
      mediaItems={hasNavigation ? navigation.mediaItems : []}
      isLoadingGallery={navigation.isLoading}
    />
  );

  const renderMediaContent = (
    src: string,
    alt: string,
    onLoad: () => void,
    onError: (e: React.SyntheticEvent<HTMLImageElement>) => void,
  ) => (
    <>
      <Box display="contents">
        <Paper
          p={4}
          radius="lg"
          bg={isOwner ? "#0078d4" : "dark.5"}
          style={MEDIA_PAPER_STYLE}
          onClick={handleOpenViewer}
        >
          <img
            src={src}
            alt={alt}
            onLoad={onLoad}
            onError={onError}
            style={MEDIA_IMAGE_STYLE}
          />
        </Paper>
        {metadata?.filename && (
          <Text size="xs" c="dimmed" mt={4} style={FILENAME_TEXT_STYLE}>
            {metadata.filename}
          </Text>
        )}
      </Box>
      {renderMediaViewer()}
    </>
  );

  if (mediaType === "image") {
    return renderMediaContent(
      mediaUrl,
      metadata?.filename || "Shared image",
      () => {
        imageLoadedRef.current = true;
      },
      (e) => {
        imageLoadedRef.current = true;
        console.error("[MediaMessage] Image load error:", {
          error: e,
          mediaId,
          mediaUrl,
          mediaType,
        });
      },
    );
  }

  if (mediaType === "video") {
    const playButtonStyle = {
      position: "absolute" as const,
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      borderRadius: "50%",
      width: `${PLAY_BUTTON_SIZE}px`,
      height: `${PLAY_BUTTON_SIZE}px`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    };

    return (
      <>
        <Box display="contents">
          <Paper
            p={4}
            radius="lg"
            bg={isOwner ? "#0078d4" : "dark.5"}
            style={{ ...MEDIA_PAPER_STYLE, position: "relative" }}
            onClick={handleOpenViewer}
          >
            <Box style={{ position: "relative", display: "inline-block" }}>
              <img
                src={thumbnailUrl || mediaUrl || ""}
                alt={metadata?.filename || "Shared video"}
                onLoad={() => {
                  thumbLoadedRef.current = true;
                }}
                onError={(e) => {
                  thumbLoadedRef.current = true;
                  console.error("[MediaMessage] Thumbnail load error:", {
                    error: e,
                    mediaId,
                    thumbnailUrl,
                    mediaType,
                  });
                }}
                style={MEDIA_IMAGE_STYLE}
              />
              <Box style={playButtonStyle}>
                <IconPlayerPlayFilled size={PLAY_ICON_SIZE} color="white" />
              </Box>
            </Box>
          </Paper>
          {metadata?.filename && (
          <Text size="xs" c="dimmed" mt={4} style={FILENAME_TEXT_STYLE}>
            {metadata.filename}
          </Text>
        )}
        </Box>
        {renderMediaViewer()}
      </>
    );
  }

  return (
    <Paper
      px="md"
      py="sm"
      radius="lg"
      bg={isOwner ? "#0078d4" : "dark.5"}
      style={paperBaseStyle}
    >
      <a
        href={mediaUrl}
        download={metadata?.filename}
        style={{
          color: isOwner ? "white" : "var(--mantine-color-blue-4)",
          textDecoration: "none",
        }}
      >
        <Text size="sm">📎 {metadata?.filename || "Download file"}</Text>
      </a>
    </Paper>
  );
}
