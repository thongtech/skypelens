import { Stack, Text, Box } from "@mantine/core";
import { useRef, useMemo, useState, useCallback, useEffect } from "react";
import { useMessageStore, useExportData } from "../../store/messageStore";
import { MessageHeader } from "./MessageHeader";
import { MessageList } from "./MessageList";
import { MessageSearch } from "./MessageSearch";
import { useMessageProcessing } from "../../hooks/useMessageProcessing";
import { useMessageScroll } from "../../hooks/useMessageScroll";
import { cleanDisplayName } from "../../utils/displayName";
import { MediaViewer } from "./MediaViewer";
import { useMediaGallery } from "../../hooks/useMediaGallery";
import type { MediaItem } from "../../types/messages";
import {
  findMatchingMessageIndices,
  filterMessages,
} from "../../utils/messageSearch";

const EMPTY_STATE_STYLE: React.CSSProperties = {
  backgroundColor:
    "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))",
};


export function MessageView() {
  const {
    getSelectedConversation,
    toggleRoleSwap,
    isRoleSwapped,
    cacheProcessedMessages,
    getProcessedMessages,
  } = useMessageStore();
  const exportData = useExportData();
  const conversation = getSelectedConversation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const swapped = conversation ? isRoleSwapped(conversation.id) : false;
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [mediaGalleryOpened, setMediaGalleryOpened] = useState(false);
  const [currentMediaId, setCurrentMediaId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoadingAll, setIsLoadingAll] = useState(false);

  const userDisplayName = useMemo(() => {
    return exportData?.userId
      ? cleanDisplayName(exportData.userId) || "You"
      : "You";
  }, [exportData?.userId]);

  const conversationDisplayName = useMemo(() => {
    if (!conversation?.id) return "";
    return (
      cleanDisplayName(conversation.displayName) ||
      cleanDisplayName(conversation.id) ||
      conversation.id
    );
  }, [conversation?.displayName, conversation?.id]);

  const headerTitle = useMemo(
    () => (swapped ? userDisplayName : conversationDisplayName),
    [swapped, userDisplayName, conversationDisplayName],
  );

  const { processedMessages, loadedMessageCount, setLoadedMessageCount } =
    useMessageProcessing({
      conversation,
      exportData,
      swapped,
      getProcessedMessages,
      cacheProcessedMessages,
    });

  useMessageScroll({
    scrollContainerRef,
    conversation,
    loadedMessageCount,
    isLoadingMore,
    swapped,
    setLoadedMessageCount,
    setIsLoadingMore,
  });

  const handleRoleSwap = () => {
    if (conversation) {
      toggleRoleSwap(conversation.id);
    }
  };

  const { mediaItems, isLoading: isLoadingGallery } = useMediaGallery(
    mediaGalleryOpened,
  );

  useEffect(() => {
    setMediaGalleryOpened(false);
    setCurrentMediaId("");
    setSearchQuery("");
    setCurrentMatchIndex(0);
    setIsSearchOpen(false);
    setIsLoadingAll(false);
  }, [conversation?.id, swapped]);

  const matchingIndices = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return findMatchingMessageIndices(processedMessages, searchQuery);
  }, [processedMessages, searchQuery]);

  const highlightedMessageIndex = useMemo(() => {
    if (matchingIndices.length === 0 || currentMatchIndex >= matchingIndices.length) {
      return undefined;
    }
    // The index in the original processedMessages array
    const originalIndex = matchingIndices[currentMatchIndex];
    if (originalIndex === undefined) return undefined;
    
    // Find the corresponding index in filtered messages
    // Since MessageList filters internally, we need to pass the index in the filtered array
    const filteredMessages = filterMessages(processedMessages, searchQuery);
    const targetMessage = processedMessages[originalIndex];
    return filteredMessages.findIndex((msg) => msg.id === targetMessage.id);
  }, [matchingIndices, currentMatchIndex, processedMessages, searchQuery]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentMatchIndex(0);
  }, []);

  const handleNavigateMatch = useCallback(
    (direction: "next" | "previous") => {
      if (matchingIndices.length === 0) return;

      setCurrentMatchIndex((prev) => {
        if (direction === "next") {
          return (prev + 1) % matchingIndices.length;
        }
        return prev === 0 ? matchingIndices.length - 1 : prev - 1;
      });
    },
    [matchingIndices.length],
  );

  useEffect(() => {
    if (
      highlightedMessageIndex !== undefined &&
      highlightedMessageIndex >= 0 &&
      scrollContainerRef.current
    ) {
      // Wait for next frame to ensure virtual items are rendered
      requestAnimationFrame(() => {
        const filteredMessages = filterMessages(processedMessages, searchQuery);
        if (highlightedMessageIndex >= filteredMessages.length) return;

        const targetMessage = filteredMessages[highlightedMessageIndex];
        const targetElement = document.querySelector(
          `[data-message-id="${targetMessage.id}"]`,
        );

        if (targetElement) {
          targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    }
  }, [highlightedMessageIndex, processedMessages, searchQuery]);

  useEffect(() => {
    if (
      mediaGalleryOpened &&
      !currentMediaId &&
      !isLoadingGallery &&
      mediaItems[0]
    ) {
      setCurrentMediaId(mediaItems[0].mediaId);
    }
  }, [mediaGalleryOpened, currentMediaId, mediaItems, isLoadingGallery]);

  const hasMedia = useMemo(() => {
    return processedMessages.some((msg) => msg.type === "media");
  }, [processedMessages]);

  const handleOpenMediaGallery = useCallback(() => {
    setMediaGalleryOpened(true);

    const firstMedia = processedMessages.find((msg) => msg.type === "media");
    if (firstMedia?.mediaUrl) {
      setCurrentMediaId(firstMedia.mediaUrl);
    }
  }, [processedMessages]);

  const handleCloseMediaGallery = useCallback(() => {
    setMediaGalleryOpened(false);
    setCurrentMediaId("");
  }, []);

  const handleMediaPrevious = useCallback(() => {
    const currentIndex = mediaItems.findIndex(
      (item: MediaItem) => item.mediaId === currentMediaId,
    );
    if (currentIndex > 0) {
      setCurrentMediaId(mediaItems[currentIndex - 1].mediaId);
    }
  }, [mediaItems, currentMediaId]);

  const handleMediaNext = useCallback(() => {
    const currentIndex = mediaItems.findIndex(
      (item: MediaItem) => item.mediaId === currentMediaId,
    );
    if (currentIndex < mediaItems.length - 1) {
      setCurrentMediaId(mediaItems[currentIndex + 1].mediaId);
    }
  }, [mediaItems, currentMediaId]);

  const handleNavigateToMediaIndex = useCallback(
    (index: number) => {
      if (mediaItems[index]) {
        setCurrentMediaId(mediaItems[index].mediaId);
      }
    },
    [mediaItems],
  );

  const currentMediaIndex = useMemo(() => {
    return mediaItems.findIndex(
      (item: MediaItem) => item.mediaId === currentMediaId,
    );
  }, [mediaItems, currentMediaId]);

  const hasPreviousMedia = currentMediaIndex > 0;
  const hasNextMedia = currentMediaIndex < mediaItems.length - 1;

  const hasMoreMessages = useMemo(() => {
    if (!conversation) return false;
    return loadedMessageCount < conversation.MessageList.length;
  }, [conversation, loadedMessageCount]);

  const handleLoadAll = useCallback(() => {
    if (!conversation || isLoadingAll || isLoadingMore) return;

    setIsLoadingAll(true);
    setIsLoadingMore(true);
    setLoadedMessageCount(conversation.MessageList.length);
  }, [conversation, isLoadingAll, isLoadingMore, setLoadedMessageCount]);

  useEffect(() => {
    if (isLoadingAll && conversation) {
      const totalMessages = conversation.MessageList.length;
      if (loadedMessageCount >= totalMessages) {
        setIsLoadingAll(false);
        setIsLoadingMore(false);
      }
    }
  }, [isLoadingAll, loadedMessageCount, conversation]);

  if (!conversation) {
    return (
      <Stack
        align="center"
        justify="center"
        h="100%"
        style={EMPTY_STATE_STYLE}
      >
        <Stack align="center" gap="md">
          <Text size="xl" c="dimmed" fw={500}>
            💬
          </Text>
          <Text c="dimmed" ta="center">
            Select a conversation to view messages
          </Text>
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack gap={0} h="100%">
      <MessageHeader
        title={headerTitle}
        swapped={swapped}
        onRoleSwap={handleRoleSwap}
        onMediaGallery={handleOpenMediaGallery}
        hasMedia={hasMedia}
        onSearchToggle={() => setIsSearchOpen((prev) => !prev)}
        isSearchOpen={isSearchOpen}
        onLoadAll={handleLoadAll}
        hasMoreMessages={hasMoreMessages}
        isLoadingAll={isLoadingAll}
      />

      <MessageSearch
        opened={isSearchOpen}
        query={searchQuery}
        onSearch={handleSearch}
        onNavigate={handleNavigateMatch}
        currentMatchIndex={currentMatchIndex}
        totalMatches={matchingIndices.length}
        hasMatches={matchingIndices.length > 0}
      />

      {mediaGalleryOpened && (
        <MediaViewer
          opened={mediaGalleryOpened}
          onClose={handleCloseMediaGallery}
          mediaId={currentMediaId || mediaItems[0]?.mediaId || ""}
          onPrevious={hasPreviousMedia ? handleMediaPrevious : undefined}
          onNext={hasNextMedia ? handleMediaNext : undefined}
          onNavigateToIndex={
            mediaItems.length > 1 ? handleNavigateToMediaIndex : undefined
          }
          hasPrevious={hasPreviousMedia}
          hasNext={hasNextMedia}
          currentIndex={currentMediaIndex >= 0 ? currentMediaIndex : 0}
          totalMedia={mediaItems.length}
          mediaItems={mediaItems}
          isLoadingGallery={isLoadingGallery}
        />
      )}

      <Box
        ref={scrollContainerRef}
        h="100%"
        style={{ overflow: "auto", position: "relative" }}
        bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))"
      >
        <MessageList
          messages={processedMessages}
          isLoadingMore={isLoadingMore}
          isRoleSwapped={swapped}
          userDisplayName={userDisplayName}
          scrollContainerRef={scrollContainerRef}
          searchQuery={searchQuery}
          highlightedMessageIndex={highlightedMessageIndex}
        />
      </Box>
    </Stack>
  );
}
