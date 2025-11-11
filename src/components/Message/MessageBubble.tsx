import { Text, Paper, Box, Group, Stack } from "@mantine/core";
import { memo } from "react";
import { formatMessageTime } from "../../utils/dateFormat";
import type { ProcessedMessage } from "../../types/messages";
import { MediaMessage } from "./MediaMessage";
import {
  OWNER_COLOR,
  MESSAGE_BUBBLE_STYLE,
  MESSAGE_TEXT_STYLE,
} from "../../constants/messageBubble";
import { highlightSearchMatch } from "../../utils/messageSearch";

interface MessageBubbleProps {
  message: ProcessedMessage;
  showSender: boolean;
  showTimestamp: boolean;
  isRoleSwapped?: boolean;
  userDisplayName?: string;
  searchQuery?: string;
  isHighlighted?: boolean;
}

function MessageBubbleComponent({
  message,
  showSender,
  showTimestamp,
  isRoleSwapped = false,
  userDisplayName = "You",
  searchQuery = "",
  isHighlighted = false,
}: MessageBubbleProps) {
  const shouldShowName = !message.isOwner && showSender;
  const displayName =
    isRoleSwapped && !message.isOwner ? userDisplayName : message.displayName;

  const highlightedContent = searchQuery
    ? highlightSearchMatch(message.content, searchQuery)
    : message.content;

  if (message.type === "media" && message.mediaUrl) {
    return (
      <Box w="100%" pt={showSender ? 14 : 6} pb={6}>
        <Stack
          align={message.isOwner ? "flex-end" : "flex-start"}
          w="100%"
          px={16}
          gap={0}
        >
          {shouldShowName && displayName && (
            <Text size="xs" c="dimmed" mb={4} ml={4} fw={600}>
              {displayName}
            </Text>
          )}
          <MediaMessage mediaId={message.mediaUrl} isOwner={message.isOwner} />
          {showTimestamp && (
            <Text
              size="xs"
              c="dimmed"
              mt={2}
              ml={4}
              opacity={0.7}
              dangerouslySetInnerHTML={{
                __html: formatMessageTime(message.timestamp),
              }}
            />
          )}
        </Stack>
      </Box>
    );
  }

  if (message.type === "system") {
    return (
      <Box ta="center" py={20} px={16}>
        <Text
          size="xs"
          c="dimmed"
          fw={500}
          opacity={0.7}
          dangerouslySetInnerHTML={{
            __html: highlightedContent,
          }}
        />
      </Box>
    );
  }

  if (message.type === "call") {
    return (
      <Box ta="center" py={20} px={16}>
        <Paper
          px={16}
          py={8}
          radius="md"
          bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))"
          style={{
            display: "inline-block",
            border:
              "1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Text
            size="sm"
            c="dimmed"
            fw={500}
            dangerouslySetInnerHTML={{
              __html: `📞 ${highlightedContent}`,
            }}
          />
        </Paper>
        {showTimestamp && (
          <Text
            size="xs"
            c="dimmed"
            mt={8}
            style={{ opacity: 0.7 }}
            dangerouslySetInnerHTML={{
              __html: formatMessageTime(message.timestamp),
            }}
          />
        )}
      </Box>
    );
  }

  if (message.type === "notice") {
    return (
      <Box ta="center" py={20} px={16}>
        <Paper
          px={16}
          py={10}
          radius="md"
          bg="rgba(255, 193, 7, 0.1)"
          style={{
            display: "inline-block",
            border: "1px solid rgba(255, 193, 7, 0.3)",
            maxWidth: "80%",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Group gap="xs" wrap="nowrap">
            <Text size="lg">ℹ️</Text>
            <Text
              size="sm"
              c="yellow.4"
              flex={1}
              dangerouslySetInnerHTML={{
                __html: highlightedContent,
              }}
            />
          </Group>
        </Paper>
      </Box>
    );
  }

  return (
    <Box w="100%" pt={showSender ? 10 : 3} pb={3}>
      <Stack
        align={message.isOwner ? "flex-end" : "flex-start"}
        w="100%"
        px={16}
        gap={0}
      >
        {shouldShowName && displayName && (
          <Text size="xs" c="dimmed" mb={6} ml={4} fw={600}>
            {displayName}
          </Text>
        )}
        <Paper
          px={16}
          py={8}
          radius="md"
          bg={
            message.isOwner
              ? OWNER_COLOR
              : "light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))"
          }
          style={{
            ...MESSAGE_BUBBLE_STYLE,
            ...(isHighlighted
              ? {
                  outline: "2px solid rgba(37, 99, 235, 0.6)",
                  outlineOffset: "2px",
                }
              : {}),
          }}
        >
          <Text
            c={
              message.isOwner
                ? "white"
                : "light-dark(var(--mantine-color-gray-9), var(--mantine-color-gray-0))"
            }
            size="sm"
            style={MESSAGE_TEXT_STYLE}
            dangerouslySetInnerHTML={{
              __html: highlightedContent,
            }}
          />
        </Paper>
        {showTimestamp && (
          <Text
            size="xs"
            c="dimmed"
            mt={3}
            ml={4}
            style={{ opacity: 0.7 }}
            dangerouslySetInnerHTML={{
              __html: formatMessageTime(message.timestamp),
            }}
          />
        )}
      </Stack>
    </Box>
  );
}

export const MessageBubble = memo(MessageBubbleComponent);
