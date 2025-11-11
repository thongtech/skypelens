import { useState, useEffect, startTransition } from "react";
import { processMessages } from "../utils/messageProcessor";
import type { ProcessedMessage, Conversation, SkypeExport } from "../types/messages";
import { INITIAL_MESSAGE_COUNT } from "../constants/messages";

interface UseMessageProcessingProps {
  conversation: Conversation | null;
  exportData: SkypeExport | null;
  swapped: boolean;
  getProcessedMessages: (
    conversationId: string,
    isSwapped: boolean,
  ) => ProcessedMessage[] | null;
  cacheProcessedMessages: (
    conversationId: string,
    messages: ProcessedMessage[],
    isSwapped: boolean,
  ) => void;
}

/**
 * Processes messages for display with caching support.
 * Caches processed messages to avoid reprocessing on re-renders.
 * Handles incremental loading and role swapping.
 */
export function useMessageProcessing({
  conversation,
  exportData,
  swapped,
  getProcessedMessages,
  cacheProcessedMessages,
}: UseMessageProcessingProps) {
  const [processedMessages, setProcessedMessages] = useState<
    ProcessedMessage[]
  >([]);
  const [loadedMessageCount, setLoadedMessageCount] = useState(
    INITIAL_MESSAGE_COUNT,
  );

  useEffect(() => {
    if (conversation) {
      setLoadedMessageCount(INITIAL_MESSAGE_COUNT);
    }
  }, [conversation, swapped]);

  useEffect(() => {
    if (
      !conversation?.id ||
      !conversation?.MessageList ||
      !exportData?.userId
    ) {
      startTransition(() => setProcessedMessages([]));
      return;
    }

    const cachedAll = getProcessedMessages(conversation.id, swapped);
    const totalMessages = conversation.MessageList.length;
    const messagesToLoad = Math.min(loadedMessageCount, totalMessages);

    if (cachedAll && cachedAll.length >= totalMessages) {
      startTransition(() =>
        setProcessedMessages(cachedAll.slice(0, messagesToLoad)),
      );
      return;
    }

    if (cachedAll && cachedAll.length >= messagesToLoad) {
      startTransition(() =>
        setProcessedMessages(cachedAll.slice(0, messagesToLoad)),
      );
      return;
    }

    if (cachedAll && cachedAll.length > 0 && cachedAll.length < messagesToLoad) {
      const timeoutId = setTimeout(() => {
        const processed = processMessages(
          conversation.MessageList,
          exportData.userId,
          swapped,
          exportData.mediaFiles,
          messagesToLoad,
        );
        cacheProcessedMessages(conversation.id, processed, swapped);
        startTransition(() => setProcessedMessages(processed));
      }, 0);

      return () => clearTimeout(timeoutId);
    }

    const timeoutId = setTimeout(() => {
      const processed = processMessages(
        conversation.MessageList,
        exportData.userId,
        swapped,
        exportData.mediaFiles,
        messagesToLoad,
      );
      cacheProcessedMessages(conversation.id, processed, swapped);
      startTransition(() => setProcessedMessages(processed));
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [
    conversation?.id,
    conversation?.MessageList,
    exportData?.userId,
    exportData?.mediaFiles,
    swapped,
    loadedMessageCount,
    getProcessedMessages,
    cacheProcessedMessages,
  ]);

  return {
    processedMessages,
    loadedMessageCount,
    setLoadedMessageCount,
  };
}

