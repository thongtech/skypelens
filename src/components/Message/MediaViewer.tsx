import {
  Modal,
  Stack,
  Text,
  Group,
  ActionIcon,
  Box,
  ScrollArea,
  Loader,
  Center,
} from "@mantine/core";
import {
  IconX,
  IconDownload,
  IconChevronLeft,
  IconChevronRight,
  IconZoomIn,
  IconZoomOut,
  IconZoomReset,
  IconPlayerPlayFilled,
} from "@tabler/icons-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useMessageStore } from "../../store/messageStore";
import {
  createMediaUrl,
  createVideoThumbnailUrl,
  getMediaType,
} from "../../utils/mediaUtils";
import type { MediaMetadata, MediaItem } from "../../types/messages";
import { revokeObjectUrl } from "../../utils/urlManager";
import { THUMBNAIL_SIZE } from "../../constants/media";

interface MediaThumbnailProps {
  mediaId: string;
  isActive: boolean;
  thumbnailRef?: (el: HTMLDivElement | null) => void;
  onClick: () => void;
}

function MediaThumbnail({
  mediaId,
  isActive,
  thumbnailRef,
  onClick,
}: MediaThumbnailProps) {
  const { exportData } = useMessageStore();
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const thumbnailLoadedRef = useRef(false);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!exportData?.mediaFiles) return;

    const mediaFiles = exportData.mediaFiles;
    thumbnailLoadedRef.current = false;

    async function loadThumbnail() {
      try {
        const type = await getMediaType(mediaId, mediaFiles);
        setMediaType(type);

        let url: string | null = null;

        if (type === "video") {
          try {
            url = await createVideoThumbnailUrl(mediaId, mediaFiles);
          } catch (error) {
            console.error("[MediaViewer] Failed to load video thumbnail:", {
              error,
              mediaId,
            });
          }
        }

        if (!url) {
          try {
            url = await createMediaUrl(mediaId, mediaFiles);
          } catch (error) {
            console.error(
              "[MediaViewer] Failed to load media URL for thumbnail:",
              {
                error,
                mediaId,
              },
            );
          }
        }

        if (url) {
          urlRef.current = url;
          setThumbnailUrl(url);
        }
      } catch (error) {
        console.error("[MediaViewer] Failed to load thumbnail:", {
          error,
          mediaId,
        });
      }
    }

    loadThumbnail();

    return () => {
      const url = urlRef.current;
      if (url) {
        revokeObjectUrl(url, thumbnailLoadedRef.current);
        urlRef.current = null;
      }
    };
  }, [mediaId, exportData?.mediaFiles]);

  return (
    <Box
      ref={thumbnailRef}
      onClick={onClick}
      style={{
        cursor: "pointer",
        border: isActive ? "2px solid #0078d4" : "2px solid transparent",
        borderRadius: "4px",
        overflow: "hidden",
        minWidth: `${THUMBNAIL_SIZE}px`,
        height: `${THUMBNAIL_SIZE}px`,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {thumbnailUrl ? (
        <>
          <img
            src={thumbnailUrl}
            alt="Thumbnail"
            onLoad={() => {
              thumbnailLoadedRef.current = true;
            }}
            onError={(e) => {
              thumbnailLoadedRef.current = true;
              console.error("[MediaViewer] Thumbnail load error:", {
                error: e,
                mediaId,
                thumbnailUrl,
                mediaType,
              });
            }}
            style={{
              width: `${THUMBNAIL_SIZE}px`,
              height: `${THUMBNAIL_SIZE}px`,
              objectFit: "cover",
              display: "block",
            }}
          />
          {mediaType === "video" && (
            <Box
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                borderRadius: "50%",
                width: "60px",
                height: "60px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconPlayerPlayFilled size={32} color="white" />
            </Box>
          )}
        </>
      ) : (
        <Center h={`${THUMBNAIL_SIZE}px`} w={`${THUMBNAIL_SIZE}px`}>
          <Loader size="xs" color="white" />
        </Center>
      )}
    </Box>
  );
}

interface MediaViewerProps {
  opened: boolean;
  onClose: () => void;
  mediaId: string;
  initialMediaUrl?: string | null;
  initialMetadata?: MediaMetadata | null;
  onPrevious?: () => void;
  onNext?: () => void;
  onNavigateToIndex?: (index: number) => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  currentIndex?: number;
  totalMedia?: number;
  mediaItems?: MediaItem[];
  isLoadingGallery?: boolean;
}

export function MediaViewer({
  opened,
  onClose,
  mediaId,
  initialMediaUrl,
  initialMetadata,
  onPrevious,
  onNext,
  onNavigateToIndex,
  hasPrevious,
  hasNext,
  currentIndex = 0,
  totalMedia = 0,
  mediaItems = [],
  isLoadingGallery = false,
}: MediaViewerProps) {
  const { exportData } = useMessageStore();
  const [mediaUrl, setMediaUrl] = useState<string | null>(
    initialMediaUrl || null,
  );
  const [metadata, setMetadata] = useState<MediaMetadata | null>(
    initialMetadata || null,
  );
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [isLoading, setIsLoading] = useState(!initialMediaUrl);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const createdUrlRef = useRef<string | null>(null);
  const thumbnailRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const isImage = mediaType === "image";
  const isVideo = mediaType === "video";

  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
  }, [mediaId]);

  const scrollToActiveThumbnail = useCallback((index: number) => {
    const thumbnailElement = thumbnailRefs.current.get(index);
    if (thumbnailElement) {
      thumbnailElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, []);

  /**
   * Scrolls thumbnail gallery to show the currently active media item.
   * Uses a small delay to ensure thumbnails are rendered before scrolling.
   */
  useEffect(() => {
    if (!opened || currentIndex < 0 || isLoadingGallery) return;

    const tryScroll = () => {
      scrollToActiveThumbnail(currentIndex);
    };

    // Delay ensures thumbnails are rendered and refs are set before scrolling
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(tryScroll);
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [opened, currentIndex, isLoadingGallery, scrollToActiveThumbnail]);

  useEffect(() => {
    if (!opened || !mediaId) return;

    async function loadMedia() {
      if (!exportData?.mediaFiles) {
        console.error("[MediaViewer] No media files available:", {
          mediaId,
          hasExportData: !!exportData,
        });
        setError("No media files available");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        if (initialMediaUrl && initialMetadata) {
          setMediaUrl(initialMediaUrl);
          setMetadata(initialMetadata);
          if (createdUrlRef.current) {
            revokeObjectUrl(createdUrlRef.current, true);
            createdUrlRef.current = null;
          }
        } else {
          const metadataFile = exportData.mediaFiles.get(`${mediaId}.json`);

          if (metadataFile) {
            try {
              const text = await metadataFile.text();
              const meta: MediaMetadata = JSON.parse(text);
              setMetadata(meta);
            } catch (error) {
              console.error("[MediaViewer] Failed to parse metadata:", {
                error,
                mediaId,
                fileName: metadataFile.name,
              });
            }
          }

          try {
            const url = await createMediaUrl(mediaId, exportData.mediaFiles);

            if (url) {
              if (createdUrlRef.current) {
                revokeObjectUrl(createdUrlRef.current, true);
              }
              createdUrlRef.current = url;
              setMediaUrl(url);
            } else {
              console.error("[MediaViewer] Media file not found:", {
                mediaId,
              });
              setError("Media file not found");
            }
          } catch (error) {
            console.error("[MediaViewer] Failed to create media URL:", {
              error,
              mediaId,
            });
            setError("Failed to load media");
          }
        }

        try {
          const type = await getMediaType(mediaId, exportData.mediaFiles);
          setMediaType(type);
        } catch (error) {
          console.error("[MediaViewer] Failed to get media type:", {
            error,
            mediaId,
          });
        }
      } catch (error) {
        console.error("[MediaViewer] Failed to load media:", {
          error,
          mediaId,
          hasMediaFiles: !!exportData?.mediaFiles,
        });
        setError("Failed to load media");
      } finally {
        setIsLoading(false);
      }
    }

    loadMedia();

    return () => {
      if (createdUrlRef.current && !initialMediaUrl) {
        revokeObjectUrl(createdUrlRef.current, true);
        createdUrlRef.current = null;
      }
    };
  }, [mediaId, opened, exportData, initialMediaUrl, initialMetadata]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.5, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.5, 0.5));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  /**
   * Handles mouse wheel zoom for images.
   * Scroll down (deltaY > 0) zooms out, scroll up zooms in.
   * Prevents default scroll behaviour to avoid page scrolling while zooming.
   */
  useEffect(() => {
    if (!opened || !isImage) return;

    const container = imageContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Invert delta: scroll down zooms out, scroll up zooms in
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.max(0.5, Math.min(5, prev + delta)));
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [opened, isImage]);

  /**
   * Handles image dragging when zoomed in.
   * Calculates drag offset relative to current position to enable smooth panning.
   */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom > 1) {
        setIsDragging(true);
        // Store initial drag point relative to current position
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      }
    },
    [zoom, position],
  );

  /**
   * Updates image position during drag.
   * Only active when zoomed in (zoom > 1) to allow panning around zoomed image.
   */
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging && zoom > 1) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, zoom, dragStart],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove]);

  useEffect(() => {
    if (!opened) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (
        e.key === "ArrowLeft" &&
        hasPrevious &&
        onPrevious &&
        !e.shiftKey
      ) {
        onPrevious();
      } else if (e.key === "ArrowRight" && hasNext && onNext && !e.shiftKey) {
        onNext();
      } else if ((e.key === "+" || e.key === "=") && isImage) {
        e.preventDefault();
        handleZoomIn();
      } else if ((e.key === "-" || e.key === "_") && isImage) {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === "0" && isImage) {
        e.preventDefault();
        handleZoomReset();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    opened,
    onClose,
    hasPrevious,
    hasNext,
    onPrevious,
    onNext,
    isImage,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
  ]);

  function handleDownload() {
    if (!mediaUrl) return;
    const link = document.createElement("a");
    link.href = mediaUrl;
    link.download = metadata?.filename || "media";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="90vw"
      padding={0}
      withCloseButton={false}
      centered
      styles={{
        content: {
          backgroundColor: "rgba(0, 0, 0, 0.95)",
        },
        body: {
          padding: 0,
        },
      }}
    >
      <Stack gap={0} h="90vh">
        <Group
          justify="space-between"
          p="md"
          style={{
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <Group gap="sm">
            <Text size="sm" c="white" fw={500}>
              {metadata?.filename || "Media"}
            </Text>
            {totalMedia > 0 && (
              <Text size="sm" c="dimmed">
                {currentIndex + 1} / {totalMedia}
              </Text>
            )}
          </Group>
          <Group gap="xs">
            {isImage && (
              <>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                >
                  <IconZoomOut size={20} />
                </ActionIcon>
                <Text
                  size="xs"
                  c="dimmed"
                  style={{ minWidth: "50px", textAlign: "center" }}
                >
                  {Math.round(zoom * 100)}%
                </Text>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  onClick={handleZoomIn}
                  disabled={zoom >= 5}
                >
                  <IconZoomIn size={20} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  onClick={handleZoomReset}
                  disabled={zoom === 1 && position.x === 0 && position.y === 0}
                >
                  <IconZoomReset size={20} />
                </ActionIcon>
              </>
            )}
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              onClick={handleDownload}
              disabled={!mediaUrl}
            >
              <IconDownload size={20} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              onClick={onClose}
            >
              <IconX size={20} />
            </ActionIcon>
          </Group>
        </Group>

        <Box
          ref={imageContainerRef}
          style={{
            flex: 1,
            position: "relative",
            overflow: zoom > 1 ? "hidden" : "visible",
            cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseDown={handleMouseDown}
        >
          {isLoading && (
            <Center h="100%">
              <Loader color="white" />
            </Center>
          )}

          {error && (
            <Center h="100%">
              <Text c="dimmed">{error}</Text>
            </Center>
          )}

          {!isLoading && !error && mediaUrl && (
            <>
              {isImage && (
                <Box
                  style={{
                    // Position is divided by zoom to compensate for scale transform
                    // This ensures drag distance matches visual movement
                    transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                    // Disable transition during drag for immediate response
                    transition: isDragging ? "none" : "transform 0.2s ease-out",
                    transformOrigin: "center center",
                    maxHeight:
                      totalMedia > 1
                        ? "calc(90vh - 220px)"
                        : "calc(90vh - 100px)",
                    maxWidth: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    key={mediaUrl}
                    src={mediaUrl}
                    alt={metadata?.filename || "Image"}
                    onLoad={() => {
                      setError(null);
                    }}
                    onError={(e) => {
                      console.error("[MediaViewer] Image load error:", {
                        mediaUrl,
                        mediaId,
                        error: e,
                      });
                      setError("Failed to load image");
                    }}
                    style={{
                      maxHeight:
                        totalMedia > 1
                          ? "calc(90vh - 220px)"
                          : "calc(90vh - 100px)",
                      maxWidth: "calc(90vw - 100px)",
                      height: "auto",
                      width: "auto",
                      objectFit: "contain",
                      userSelect: "none",
                      pointerEvents: "none",
                    }}
                  />
                </Box>
              )}

              {isVideo && (
                <video
                  src={mediaUrl}
                  controls
                  autoPlay
                  style={{
                    maxHeight:
                      totalMedia > 1
                        ? "calc(90vh - 220px)"
                        : "calc(90vh - 100px)",
                    maxWidth: "100%",
                  }}
                >
                  Your browser does not support the video tag.
                </video>
              )}
            </>
          )}

          {hasPrevious && onPrevious && (
            <ActionIcon
              variant="filled"
              color="dark"
              size="xl"
              radius="xl"
              onClick={onPrevious}
              style={{
                position: "absolute",
                left: "20px",
                top: "50%",
                transform: "translateY(-50%)",
                opacity: 0.8,
                zIndex: 10,
              }}
            >
              <IconChevronLeft size={24} />
            </ActionIcon>
          )}

          {hasNext && onNext && (
            <ActionIcon
              variant="filled"
              color="dark"
              size="xl"
              radius="xl"
              onClick={onNext}
              style={{
                position: "absolute",
                right: "20px",
                top: "50%",
                transform: "translateY(-50%)",
                opacity: 0.8,
                zIndex: 10,
              }}
            >
              <IconChevronRight size={24} />
            </ActionIcon>
          )}
        </Box>

        {(totalMedia > 1 || isLoadingGallery) && (
          <Box
            style={{
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            {isLoadingGallery ? (
              <Center p="md">
                <Group gap="xs">
                  <Loader size="sm" color="white" />
                  <Text size="sm" c="dimmed">
                    Loading media gallery...
                  </Text>
                </Group>
              </Center>
            ) : (
              <ScrollArea>
                <Group gap="xs" p="md" wrap="nowrap">
                  {mediaItems.map((item, index) => (
                    <MediaThumbnail
                      key={item.id}
                      mediaId={item.mediaId}
                      isActive={index === currentIndex}
                      thumbnailRef={(el) => {
                        if (el) {
                          thumbnailRefs.current.set(index, el);
                          if (index === currentIndex && opened) {
                            requestAnimationFrame(() => {
                              scrollToActiveThumbnail(index);
                            });
                          }
                        } else {
                          thumbnailRefs.current.delete(index);
                        }
                      }}
                      onClick={() => {
                        if (onNavigateToIndex) {
                          onNavigateToIndex(index);
                        }
                      }}
                    />
                  ))}
                </Group>
              </ScrollArea>
            )}
          </Box>
        )}
      </Stack>
    </Modal>
  );
}
