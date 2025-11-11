import { Paper, Group, Text, ActionIcon, Tooltip } from "@mantine/core";
import { IconArrowsExchange, IconPhoto, IconSearch, IconDownload } from "@tabler/icons-react";
import { useMemo } from "react";

interface MessageHeaderProps {
  title: string;
  swapped: boolean;
  onRoleSwap: () => void;
  onMediaGallery?: () => void;
  hasMedia?: boolean;
  onSearchToggle?: () => void;
  isSearchOpen?: boolean;
  onLoadAll?: () => void;
  hasMoreMessages?: boolean;
  isLoadingAll?: boolean;
}

export function MessageHeader({
  title,
  swapped,
  onRoleSwap,
  onMediaGallery,
  hasMedia = false,
  onSearchToggle,
  isSearchOpen = false,
  onLoadAll,
  hasMoreMessages = false,
  isLoadingAll = false,
}: MessageHeaderProps) {
  const roleSwapTooltip = useMemo(
    () =>
      swapped
        ? "Switch back to your perspective"
        : "View from other person's perspective",
    [swapped],
  );

  return (
    <Paper
      px="lg"
      py="md"
      withBorder
      style={{ flexShrink: 0 }}
      bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))"
    >
      <Group justify="space-between" align="center">
        <Text size="lg" fw={600}>
          {title}
        </Text>
        <Group gap="xs">
          {hasMedia && onMediaGallery && (
            <Tooltip label="Media gallery" position="bottom">
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={onMediaGallery}
                size="lg"
              >
                <IconPhoto size={20} />
              </ActionIcon>
            </Tooltip>
          )}
          {hasMoreMessages && onLoadAll && (
            <Tooltip label="Load all messages" position="bottom">
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={onLoadAll}
                size="lg"
                loading={isLoadingAll}
                disabled={isLoadingAll}
              >
                <IconDownload size={20} />
              </ActionIcon>
            </Tooltip>
          )}
          {onSearchToggle && (
            <Tooltip label="Search messages" position="bottom">
              <ActionIcon
                variant={isSearchOpen ? "filled" : "subtle"}
                color={isSearchOpen ? "blue" : "gray"}
                onClick={onSearchToggle}
                size="lg"
              >
                <IconSearch size={20} />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label={roleSwapTooltip} position="bottom">
            <ActionIcon
              variant={swapped ? "filled" : "subtle"}
              color={swapped ? "blue" : "gray"}
              onClick={onRoleSwap}
              size="lg"
            >
              <IconArrowsExchange size={20} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </Paper>
  );
}

