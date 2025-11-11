import { Box, Text, Divider, Center, Loader, Group, Stack } from "@mantine/core";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo } from "react";
import { MessageBubble } from "./MessageBubble";
import {
  groupMessagesByDate,
  shouldGroupWithPrevious,
} from "../../utils/messageProcessor";
import type { ProcessedMessage } from "../../types/messages";
import { filterMessages } from "../../utils/messageSearch";

interface VirtualItem {
  type: "date" | "message";
  content: string | ProcessedMessage;
  showSender: boolean;
  showTimestamp: boolean;
  messageIndex?: number;
}

interface MessageListProps {
  messages: ProcessedMessage[];
  isLoadingMore: boolean;
  isRoleSwapped: boolean;
  userDisplayName: string;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  searchQuery?: string;
  highlightedMessageIndex?: number;
}

export function MessageList({
  messages,
  isLoadingMore,
  isRoleSwapped,
  userDisplayName,
  scrollContainerRef,
  searchQuery = "",
  highlightedMessageIndex,
}: MessageListProps) {
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    return filterMessages(messages, searchQuery);
  }, [messages, searchQuery]);

  const virtualItems = useMemo(() => {
    if (filteredMessages.length === 0) return [];

    const reversedMessages = [...filteredMessages].reverse();
    const grouped = groupMessagesByDate(reversedMessages);
    const items: VirtualItem[] = [];
    let messageIndex = 0;

    for (const [date, dateMessages] of grouped.entries()) {
      items.push({
        type: "date",
        content: date,
        showSender: false,
        showTimestamp: false,
      });

      for (let i = 0; i < dateMessages.length; i++) {
        const message = dateMessages[i];
        const previousMessage = i > 0 ? dateMessages[i - 1] : null;
        const nextMessage =
          i < dateMessages.length - 1 ? dateMessages[i + 1] : null;
        const currentMessageIndex = messageIndex;
        items.push({
          type: "message",
          content: message,
          showSender: !shouldGroupWithPrevious(message, previousMessage),
          showTimestamp:
            !nextMessage || !shouldGroupWithPrevious(nextMessage, message),
          messageIndex: currentMessageIndex,
        });
        messageIndex++;
      }
    }

    return items;
  }, [filteredMessages]);

  const virtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 100,
    overscan: 10,
  });

  if (messages.length === 0) {
    return (
      <Center h="100%">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text c="dimmed">Loading messages...</Text>
        </Stack>
      </Center>
    );
  }

  if (searchQuery.trim() && filteredMessages.length === 0) {
    return (
      <Center h="100%">
        <Text c="dimmed">No messages found matching &quot;{searchQuery}&quot;</Text>
      </Center>
    );
  }

  return (
    <>
      {isLoadingMore && (
        <Center
          p="xs"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
          bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))"
        >
          <Group gap="xs">
            <Loader size="xs" />
            <Text size="xs" c="dimmed">
              Loading older messages...
            </Text>
          </Group>
        </Center>
      )}

      <div
        style={{
          height: `${virtualizer.getTotalSize() + 24}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = virtualItems[virtualRow.index];
          const isDate = item.type === "date";

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              data-message-index={item.type === "message" ? item.messageIndex : undefined}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: `${virtualRow.start}px`,
                left: 0,
                width: "100%",
              }}
            >
              {isDate ? (
                <Box py={24} px={12}>
                  <Divider
                    label={
                      <Text size="xs" fw={600} c="dimmed">
                        {item.content as string}
                      </Text>
                    }
                    labelPosition="center"
                  />
                </Box>
              ) : (
                <div data-message-id={(item.content as ProcessedMessage).id}>
                  <MessageBubble
                    message={item.content as ProcessedMessage}
                    showSender={item.showSender}
                    showTimestamp={item.showTimestamp}
                    isRoleSwapped={isRoleSwapped}
                    userDisplayName={userDisplayName}
                    searchQuery={searchQuery}
                    isHighlighted={
                      item.messageIndex !== undefined &&
                      item.messageIndex === highlightedMessageIndex
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

