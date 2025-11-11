import {
  Paper,
  TextInput,
  Group,
  ActionIcon,
  Text,
  Tooltip,
  Collapse,
} from "@mantine/core";
import { IconSearch, IconX, IconChevronUp, IconChevronDown } from "@tabler/icons-react";
import { useEffect, useRef } from "react";

interface MessageSearchProps {
  opened: boolean;
  query: string;
  onSearch: (query: string) => void;
  onNavigate: (direction: "next" | "previous") => void;
  currentMatchIndex: number;
  totalMatches: number;
  hasMatches: boolean;
}

export function MessageSearch({
  opened,
  query,
  onSearch,
  onNavigate,
  currentMatchIndex,
  totalMatches,
  hasMatches,
}: MessageSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (opened && inputRef.current) {
      inputRef.current.focus();
    }
  }, [opened]);

  const handleClear = () => {
    onSearch("");
  };

  const handleNext = () => {
    onNavigate("next");
  };

  const handlePrevious = () => {
    onNavigate("previous");
  };

  return (
    <Collapse in={opened}>
      <Paper
        px="md"
        py="sm"
        withBorder
        style={{ flexShrink: 0 }}
        bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))"
      >
        <Group gap="xs" align="center">
          <TextInput
            ref={inputRef}
            placeholder="Search messages..."
            leftSection={<IconSearch size={16} />}
            rightSection={
              query ? (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={handleClear}
                >
                  <IconX size={14} />
                </ActionIcon>
              ) : null
            }
            value={query}
            onChange={(e) => onSearch(e.currentTarget.value)}
            style={{ flex: 1 }}
            size="sm"
          />
          {hasMatches && (
            <>
              <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                {currentMatchIndex + 1} / {totalMatches}
              </Text>
              <Tooltip label="Previous match" position="bottom">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={handlePrevious}
                  disabled={totalMatches === 0}
                  size="lg"
                >
                  <IconChevronUp size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Next match" position="bottom">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={handleNext}
                  disabled={totalMatches === 0}
                  size="lg"
                >
                  <IconChevronDown size={18} />
                </ActionIcon>
              </Tooltip>
            </>
          )}
        </Group>
      </Paper>
    </Collapse>
  );
}

