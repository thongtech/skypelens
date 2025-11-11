import {
  Group,
  Text,
  Progress,
  Stack,
  Loader,
  Alert,
  Button,
  Paper,
  Title,
  Divider,
  rem,
  Box,
} from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import {
  IconFileUpload,
  IconAlertCircle,
  IconFolder,
  IconShieldLock,
  IconFileText,
  IconPhotoVideo,
} from "@tabler/icons-react";
import { useState, useRef } from "react";
import { parseJsonFile, parseDirectoryFiles } from "../../utils/fileParser";
import type { SkypeExport } from "../../types/messages";
import { UPLOAD_WIDTH } from "../../constants/fileUpload";
import { debugLog } from "../../utils/debug";

interface FileUploadProps {
  onFileProcessed: (data: SkypeExport) => void;
}

export function FileUpload({ onFileProcessed }: FileUploadProps) {
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const directoryInputRef = useRef<HTMLInputElement>(null);

  function handleError(error: unknown, context: string): string {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error(`[FileUpload] Failed to process ${context}:`, error);
    return errorMessage;
  }

  async function handleDrop(files: File[]) {
    const file = files[0];
    if (!file) return;

    setError(null);
    setIsProcessing(true);
    setFileName(file.name);

    try {
      // parseJsonFile handles both small and large files automatically
      // For large files (>100MB), it uses streaming to avoid memory issues
      const data = await parseJsonFile(file, setProgress);

      // Validate that the file contains required Skype export structure
      if (!data.userId || !data.conversations) {
        throw new Error("Invalid Skype export file format");
      }

      debugLog("[FileUpload] File processed successfully:", {
        userId: data.userId,
        conversations: data.conversations.length,
      });

      onFileProcessed(data);
    } catch (error) {
      setError(handleError(error, "file"));
      setIsProcessing(false);
    }
  }

  async function handleDirectorySelect(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setIsProcessing(true);
    setFileName("Skype Export Directory");

    try {
      // parseDirectoryFiles extracts messages.json and builds a map of media files
      // Media files are indexed by their ID for efficient lookup during message rendering
      const data = await parseDirectoryFiles(Array.from(files), setProgress);

      if (!data.userId || !data.conversations) {
        throw new Error("Invalid Skype export directory format");
      }

      debugLog("[FileUpload] Directory processed successfully:", {
        userId: data.userId,
        conversations: data.conversations.length,
        mediaFiles: data.mediaFiles?.size || 0,
      });

      onFileProcessed(data);
    } catch (error) {
      setError(handleError(error, "directory"));
      setIsProcessing(false);
    }
  }

  if (isProcessing) {
    const isDirectory = fileName === "Skype Export Directory";
    const stageText = progress < 95 ? "Reading file..." : "Parsing JSON...";
    
    return (
      <Stack w={UPLOAD_WIDTH} gap="xl" align="center">
        <Paper
          p="xl"
          withBorder
          radius="md"
          style={{
            width: "100%",
            maxWidth: rem(500),
          }}
        >
          <Stack gap="lg" align="center">
            <Stack gap="md" align="center">
              <Box
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Loader size={48} color="blue" />
                {isDirectory ? (
                  <IconPhotoVideo
                    size={24}
                    style={{
                      position: "absolute",
                      color: "var(--mantine-color-blue-6)",
                    }}
                  />
                ) : (
                  <IconFileText
                    size={24}
                    style={{
                      position: "absolute",
                      color: "var(--mantine-color-blue-6)",
                    }}
                  />
                )}
              </Box>
              <Stack gap={4} align="center">
                <Text fw={600} size="lg">
                  Processing {isDirectory ? "directory" : "file"}...
                </Text>
                <Text size="sm" c="dimmed" ta="center" lineClamp={1} style={{ maxWidth: rem(400) }}>
                  {fileName}
                </Text>
              </Stack>
            </Stack>

            <Stack gap="md" style={{ width: "100%" }}>
              <Progress
                value={progress}
                size="xl"
                radius="xl"
                animated
                color="blue"
                style={{
                  boxShadow: "0 2px 8px rgba(0, 120, 212, 0.2)",
                }}
              />
              <Group justify="space-between" wrap="nowrap">
                <Text size="sm" c="dimmed" fw={500}>
                  {stageText}
                </Text>
                <Text size="sm" fw={700} c="blue">
                  {progress.toFixed(1)}%
                </Text>
              </Group>
            </Stack>
          </Stack>
        </Paper>
      </Stack>
    );
  }

  return (
    <Stack w={UPLOAD_WIDTH} gap="xl">
      <Stack gap="xs" align="center">
        <Group 
          gap={0} 
          align="center" 
          style={{ 
            lineHeight: 1.5,
            paddingTop: rem(8),
            paddingBottom: rem(8),
            minHeight: rem(60),
          }}
        >
          <Text
            size="2rem"
            fw={700}
            style={{
              background: "linear-gradient(135deg, #0078d4 0%, #00bcf2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              display: "inline-block",
              lineHeight: 1.5,
              padding: 0,
              margin: 0,
            }}
          >
            Skype
          </Text>
          <Text 
            size="2rem" 
            fw={600} 
            c="dimmed"
            style={{
              display: "inline-block",
              lineHeight: 1.5,
              padding: 0,
              margin: 0,
            }}
          >
            Lens
          </Text>
        </Group>
        <Title order={2} ta="center" fw={600}>
          Upload Your Skype Data
        </Title>
        <Text size="sm" c="dimmed" ta="center">
          Choose how you want to upload your Skype export
        </Text>
      </Stack>

      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error"
          color="red"
          onClose={() => setError(null)}
          withCloseButton
        >
          {error}
        </Alert>
      )}

      <Stack gap="lg">
        {/* File Upload Option */}
        <Dropzone
          onDrop={handleDrop}
          accept={["application/json"]}
        >
          <Paper
            p="lg"
            withBorder
            radius="md"
            style={{
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--mantine-color-blue-6)";
              e.currentTarget.style.backgroundColor =
                "light-dark(var(--mantine-color-blue-0), var(--mantine-color-dark-6))";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "";
              e.currentTarget.style.backgroundColor = "";
            }}
          >
            <Stack gap="md">
              <Group gap="md">
                <IconFileText
                  size={32}
                  style={{ color: "var(--mantine-color-blue-6)" }}
                />
                <Stack gap={4} style={{ flex: 1 }}>
                  <Text fw={600} size="lg">
                    Upload messages.json File
                  </Text>
                  <Text size="sm" c="dimmed">
                    For conversations only (no media files)
                  </Text>
                </Stack>
              </Group>
              <Group
                justify="center"
                gap="md"
                p="md"
              >
                <IconFileUpload
                  size={24}
                  style={{ color: "var(--mantine-color-dimmed)" }}
                />
                <Text size="sm" c="dimmed" ta="center">
                  Drag & drop or click to select messages.json
                </Text>
              </Group>
            </Stack>
          </Paper>
        </Dropzone>

        <Divider label="or" labelPosition="center" />

        {/* Directory Upload Option */}
        <Paper
          p="lg"
          withBorder
          radius="md"
          style={{
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onClick={() => directoryInputRef.current?.click()}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--mantine-color-blue-6)";
            e.currentTarget.style.backgroundColor =
              "light-dark(var(--mantine-color-blue-0), var(--mantine-color-dark-6))";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "";
            e.currentTarget.style.backgroundColor = "";
          }}
        >
          <Stack gap="md">
            <Group gap="md">
              <IconPhotoVideo
                size={32}
                style={{ color: "var(--mantine-color-blue-6)" }}
              />
              <Stack gap={4} style={{ flex: 1 }}>
                <Text fw={600} size="lg">
                  Upload Export Directory
                </Text>
                <Text size="sm" c="dimmed">
                  Includes conversations and all media files (recommended)
                </Text>
              </Stack>
            </Group>
            <Group
              justify="center"
              gap="md"
              p="md"
              style={{ minHeight: rem(60) }}
            >
              <Button
                variant="light"
                size="md"
                leftSection={<IconFolder size={18} />}
                onClick={(e) => {
                  e.stopPropagation();
                  directoryInputRef.current?.click();
                }}
              >
                Select Folder
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>

      {/* 
        Directory input uses webkitdirectory attribute to allow folder selection.
        This enables users to upload the entire Skype export directory including media files.
        The webkitdirectory attribute is supported in all modern browsers despite not being in TypeScript types.
      */}
      <input
        ref={directoryInputRef}
        type="file"
        // @ts-expect-error - webkitdirectory is not in TypeScript types but is widely supported in browsers
        webkitdirectory=""
        directory=""
        multiple
        style={{ display: "none" }}
        onChange={handleDirectorySelect}
      />

      <Paper
        p="md"
        radius="md"
        bg="light-dark(var(--mantine-color-blue-0), var(--mantine-color-dark-7))"
      >
        <Group gap="xs" justify="flex-start" wrap="nowrap">
          <IconShieldLock
            size={18}
            style={{ color: "var(--mantine-color-blue-6)" }}
          />
          <Stack gap={2} style={{ flex: 1 }}>
            <Text size="sm" fw={500} ta="left">
              Privacy First
            </Text>
            <Text size="xs" c="dimmed" ta="left">
              Everything happens in your browser. No data sent to servers. No file size limit.
            </Text>
          </Stack>
        </Group>
      </Paper>
    </Stack>
  );
}
