import { useState, useEffect, useCallback, useRef } from "react";
import { useMessageStore } from "../store/messageStore";
import type { MediaItem, ProcessedMessage } from "../types/messages";
import { debugLog } from "../utils/debug";
import {
  MEDIA_GALLERY_CHUNK_SIZE,
  IDLE_TIMEOUT,
  INITIAL_IDLE_TIMEOUT,
} from "../constants/mediaGallery";

function scheduleIdleCallback(callback: () => void, timeout: number): void {
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, 0);
  }
}

/**
 * Extracts and processes media items from processed messages.
 * Only processes when enabled (e.g., when media gallery is opened) to avoid
 * unnecessary work. Processes in chunks using idle callbacks for performance.
 */
export function useMediaGallery(enabled: boolean = false) {
  const { getSelectedConversation, isRoleSwapped, getProcessedMessages } =
    useMessageStore();
  const conversation = getSelectedConversation();
  const swapped = conversation ? isRoleSwapped(conversation.id) : false;

  const processedMessagesLength = useMessageStore((state) => {
    const selectedId = state.selectedConversationId;
    if (!selectedId) return 0;
    const isSwapped = state.swappedRoles[selectedId] || false;
    const cache = state.processedMessagesCache[selectedId];
    const messages = cache?.[isSwapped ? "swapped" : "normal"];
    return messages?.length ?? 0;
  });

  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const lastProcessedCountRef = useRef(0);
  const processingRef = useRef(false);

  /**
   * Processes messages in chunks to extract media items.
   * Uses idle callbacks to avoid blocking the UI during processing of large conversation histories.
   * Recursively processes chunks until all messages are examined.
   */
  const processChunk = useCallback(
    (processed: ProcessedMessage[], items: MediaItem[], index: number) => {
      const end = Math.min(index + MEDIA_GALLERY_CHUNK_SIZE, processed.length);

      // Extract media items from current chunk
      for (let i = index; i < end; i++) {
        const msg = processed[i];
        if (msg.type === "media" && msg.mediaUrl) {
          items.push({
            id: msg.id,
            mediaId: msg.mediaUrl,
            timestamp: msg.timestamp,
            displayName: msg.displayName,
            isOwner: msg.isOwner,
          });
        }
      }

      // Continue processing next chunk if more messages remain
      if (end < processed.length) {
        scheduleIdleCallback(
          () => processChunk(processed, items, end),
          IDLE_TIMEOUT,
        );
      } else {
        // All messages processed, update state
        debugLog("[useMediaGallery] Media processing complete:", {
          totalMediaItems: items.length,
          processedMessages: processed.length,
        });

        setMediaItems(items);
        setIsLoading(false);
        lastProcessedCountRef.current = processed.length;
        processingRef.current = false;
      }
    },
    [],
  );

  useEffect(() => {
    lastProcessedCountRef.current = 0;
    processingRef.current = false;
  }, [conversation?.id, swapped]);

  useEffect(() => {
    if (!conversation) {
      setMediaItems([]);
      lastProcessedCountRef.current = 0;
      processingRef.current = false;
      return;
    }

    if (!enabled) {
      return;
    }

    const processed = getProcessedMessages(conversation.id, swapped);
    if (!processed) {
      return;
    }

    if (
      processed.length > lastProcessedCountRef.current &&
      !processingRef.current
    ) {
      processingRef.current = true;
      setIsLoading(true);

      const processMedia = () => {
        try {
          const items: MediaItem[] = [];
          scheduleIdleCallback(
            () => processChunk(processed, items, 0),
            INITIAL_IDLE_TIMEOUT,
          );
        } catch (error) {
          console.error("[MediaGallery] Failed to process media items:", {
            error,
            conversationId: conversation.id,
            swapped,
            messageCount: processed.length,
          });
          setIsLoading(false);
          processingRef.current = false;
        }
      };

      scheduleIdleCallback(processMedia, INITIAL_IDLE_TIMEOUT);
    }
  }, [
    enabled,
    conversation,
    swapped,
    processedMessagesLength,
    getProcessedMessages,
    processChunk,
  ]);

  return { mediaItems, isLoading };
}

export function useMediaNavigation(
  currentMediaId: string,
  enabled: boolean = false,
) {
  const { mediaItems, isLoading } = useMediaGallery(enabled);

  const currentIndex = mediaItems.findIndex(
    (item) => item.mediaId === currentMediaId,
  );

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < mediaItems.length - 1;

  const previousMediaId = hasPrevious
    ? mediaItems[currentIndex - 1].mediaId
    : null;
  const nextMediaId = hasNext ? mediaItems[currentIndex + 1].mediaId : null;

  return {
    currentIndex,
    totalMedia: mediaItems.length,
    hasPrevious,
    hasNext,
    previousMediaId,
    nextMediaId,
    mediaItems,
    isLoading,
  };
}
