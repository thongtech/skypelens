import DOMPurify from "dompurify";
import type {
  Message,
  ProcessedMessage,
  TranslationContent,
} from "../types/messages";
import { extractMediaId } from "./mediaUtils";
import { parseSkypeEmoji } from "./skypeEmoji";
import { cleanDisplayName } from "./displayName";
import { GROUP_TIME_THRESHOLD } from "../constants/messages";
import { debugLog } from "./debug";
import {
  CONTENT_PATTERNS,
  PURIFY_CONFIG,
  THREAD_ACTIVITY_PATTERNS,
  CALL_EVENT_PATTERNS,
  STRIP_HTML_PATTERN,
  STRIP_SKYPE_PATTERN,
  PREVIEW_MAX_LENGTH,
} from "../constants/messageProcessor";

interface MessageProcessorContext {
  userId: string;
  swapRoles: boolean;
  mediaFiles?: Map<string, File>;
  skipIds: Set<string>;
}

function createBaseMessage(
  message: Message,
  context: MessageProcessorContext,
  content: string,
  type: ProcessedMessage["type"],
): ProcessedMessage {
  const { userId, swapRoles } = context;
  const isOwner = swapRoles ? message.from !== userId : message.from === userId;

  return {
    id: message.id,
    displayName: cleanDisplayName(message.displayName),
    timestamp: message.originalarrivaltime,
    content,
    type,
    from: message.from,
    isOwner,
    originalMessageType: message.messagetype,
  };
}

/**
 * Extracts the translated text from a Translation message's JSON content.
 * Translation messages contain metadata about translations in JSON format.
 */
function parseTranslationContent(content: string): string | null {
  try {
    const translationData: TranslationContent = JSON.parse(content);
    return translationData.translations[0]?.translation || null;
  } catch (error) {
    console.error("[messageProcessor] Failed to parse translation content:", {
      error,
      contentLength: content.length,
    });
    return null;
  }
}

/**
 * Handles Translation message types.
 * 
 * Translation logic:
 * - When the owner sends a message: Translation message contains metadata, followed by RichText with original.
 *   We show the original (RichText) and skip the Translation metadata message.
 * - When others send messages: Translation message contains the translated text for the owner.
 *   We show the translated text and skip the following RichText (which contains original in sender's language).
 * 
 * This reflects the natural conversation flow where the owner sees messages in their language.
 */
function handleTranslation(
  message: Message,
  nextMessage: Message | undefined,
  context: MessageProcessorContext,
): ProcessedMessage | null {
  const { userId, skipIds } = context;
  const isFromUserId = message.from === userId;

  // Owner's messages: show original (next RichText), skip Translation metadata
  if (isFromUserId && nextMessage?.messagetype === "RichText") {
    skipIds.add(nextMessage.id);
    return createBaseMessage(
      { ...nextMessage, from: message.from },
      context,
      parseMessageContent(nextMessage.content),
      "text",
    );
  }

  // Others' messages: extract translated text from Translation message's JSON content
  const translatedText = parseTranslationContent(message.content);
  const content = translatedText || message.content;

  // Skip the following RichText message (contains original in sender's language)
  if (nextMessage?.messagetype === "RichText") {
    skipIds.add(nextMessage.id);
  }

  return createBaseMessage(
    message,
    context,
    parseMessageContent(content),
    "text",
  );
}

function handleMediaMessage(
  message: Message,
  context: MessageProcessorContext,
): ProcessedMessage {
  const { mediaFiles } = context;
  const mediaId = extractMediaId(message.content);
  const hasMedia = Boolean(mediaId && mediaFiles);

  // If media files are not available, parse and display filename/size like generic files
  const content = hasMedia
    ? parseMessageContent(message.content)
    : parseMediaFileInfo(message.content);

  const processedMessage = createBaseMessage(
    message,
    context,
    content,
    hasMedia ? "media" : "text",
  );

  if (hasMedia && mediaId) {
    processedMessage.mediaUrl = mediaId;
  }

  return processedMessage;
}

/**
 * Formats file size in bytes to human-readable format (KB or MB).
 */
function formatFileSize(fileSizeBytes: number): string {
  const fileSizeKB = fileSizeBytes / 1024;
  const fileSizeMB = fileSizeKB / 1024;

  if (fileSizeMB >= 1) {
    return `${fileSizeMB.toFixed(1)} MB`;
  }
  return `${fileSizeKB.toFixed(1)} KB`;
}

/**
 * Parses filename and file size from RichText/Media_GenericFile content.
 * These files are not available in the export, so we only display the metadata.
 */
function parseGenericFile(content: string): string {
  const originalNameMatch = content.match(/<OriginalName v="([^"]+)"(?:\s*\/>|><\/OriginalName>)/);
  const fileSizeMatch = content.match(/<FileSize v="(\d+)"(?:\s*\/>|><\/FileSize>)/);

  const filename = originalNameMatch?.[1] || "Unknown file";
  const fileSizeBytes = fileSizeMatch ? parseInt(fileSizeMatch[1], 10) : null;

  if (fileSizeBytes !== null && !Number.isNaN(fileSizeBytes)) {
    return `📎 <em>${filename}</em> (${formatFileSize(fileSizeBytes)})`;
  }

  return `📎 <em>${filename}</em>`;
}

/**
 * Parses media file info (video/image) from URIObject content when media files are not available.
 * Determines if it's a video or image based on the type attribute or filename extension.
 */
function parseMediaFileInfo(content: string): string {
  const originalNameMatch = content.match(/<OriginalName v="([^"]+)"(?:\s*\/>|><\/OriginalName>)/);
  const fileSizeMatch = content.match(/<FileSize v="(\d+)"(?:\s*\/>|><\/FileSize>)/);
  const typeMatch = content.match(/<URIObject[^>]*type="([^"]+)"/);

  const filename = originalNameMatch?.[1] || "Unknown file";
  const fileSizeBytes = fileSizeMatch ? parseInt(fileSizeMatch[1], 10) : null;
  const type = typeMatch?.[1]?.toLowerCase() || "";

  // Determine if it's a video or image based on type attribute or filename extension
  const isVideo =
    type.startsWith("video") ||
    /\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v)$/i.test(filename);
  const icon = isVideo ? "📹" : "📷";

  if (fileSizeBytes !== null && !Number.isNaN(fileSizeBytes)) {
    return `${icon} <em>${filename}</em> (${formatFileSize(fileSizeBytes)})`;
  }

  return `${icon} <em>${filename}</em>`;
}

function handleSystemMessage(
  message: Message,
  context: MessageProcessorContext,
  content: string,
  type: ProcessedMessage["type"],
): ProcessedMessage {
  const processedMessage = createBaseMessage(message, context, content, type);
  processedMessage.displayName = null;
  processedMessage.isOwner = false;
  return processedMessage;
}

function processMessage(
  message: Message,
  nextMessage: Message | undefined,
  context: MessageProcessorContext,
): ProcessedMessage | null {
  const { skipIds } = context;
  const { messagetype } = message;

  // Skip messages that were already processed as part of a Translation pair
  // (e.g., RichText messages that follow Translation messages)
  if (skipIds.has(message.id)) {
    return null;
  }

  // Skip RichText/Media_Album messages (they are just images stacked together)
  if (messagetype === "RichText/Media_Album") {
    return null;
  }

  // Translation messages require special handling with lookahead to next message
  if (messagetype === "Translation") {
    return handleTranslation(message, nextMessage, context);
  }

  if (
    messagetype === "RichText/UriObject" ||
    messagetype === "RichText/Media_Video"
  ) {
    return handleMediaMessage(message, context);
  }

  if (messagetype === "RichText/Media_GenericFile") {
    return createBaseMessage(
      message,
      context,
      parseGenericFile(message.content),
      "text",
    );
  }

  if (messagetype === "RichText") {
    return createBaseMessage(
      message,
      context,
      parseMessageContent(message.content),
      "text",
    );
  }

  if (messagetype.startsWith("ThreadActivity")) {
    const systemContent = parseThreadActivity(message);
    return systemContent
      ? handleSystemMessage(message, context, systemContent, "system")
      : null;
  }

  if (messagetype.startsWith("Event/Call")) {
    return createBaseMessage(
      message,
      context,
      parseCallEvent(message, context),
      "call",
    );
  }

  if (messagetype === "Notice") {
    return handleSystemMessage(
      message,
      context,
      parseNotice(message),
      "notice",
    );
  }

  if (messagetype === "PopCard") {
    return handleSystemMessage(
      message,
      context,
      parsePopCard(message),
      "notice",
    );
  }

  if (messagetype.startsWith("InviteFreeRelationshipChanged")) {
    return handleSystemMessage(
      message,
      context,
      parseMessageContent(message.content),
      "system",
    );
  }

  if (messagetype === "Text") {
    return createBaseMessage(message, context, message.content, "text");
  }

  debugLog("[messageProcessor] Processing unknown message type as text:", {
    messageId: message.id,
    messagetype,
    conversationId: message.conversationid,
    from: message.from,
    displayName: message.displayName,
    timestamp: message.originalarrivaltime,
    version: message.version,
    contentLength: message.content.length,
    contentPreview: message.content.substring(0, 100),
    hasProperties: !!message.properties,
  });

  return createBaseMessage(
    message,
    context,
    parseMessageContent(message.content),
    "text",
  );
}

/**
 * Processes raw Skype messages into a format suitable for display.
 * Handles message types, translations, media, and system messages.
 * @param messages - Raw messages from Skype export
 * @param userId - The user's ID for determining message ownership
 * @param swapRoles - If true, swap the perspective (show conversation from other participant's view)
 * @param mediaFiles - Optional map of media files for media message handling
 * @param maxMessages - Optional limit on number of messages to process
 */
export function processMessages(
  messages: Message[],
  userId: string,
  swapRoles = false,
  mediaFiles?: Map<string, File>,
  maxMessages?: number,
): ProcessedMessage[] {
  const startTime = performance.now();
  const context: MessageProcessorContext = {
    userId,
    swapRoles,
    mediaFiles,
    skipIds: new Set<string>(),
  };

  const endIndex = maxMessages
    ? Math.min(maxMessages, messages.length)
    : messages.length;
  const processedMessages: ProcessedMessage[] = [];

  debugLog("[messageProcessor] Starting message processing:", {
    totalMessages: messages.length,
    maxMessages,
    endIndex,
    userId,
    swapRoles,
    hasMediaFiles: !!mediaFiles,
  });

  for (let i = 0; i < endIndex; i++) {
    const message = messages[i];
    if (context.skipIds.has(message.id)) continue;

    const nextMessage = messages[i + 1];
    const processed = processMessage(message, nextMessage, context);

    if (processed) {
      processedMessages.push(processed);
    }
  }

  const duration = performance.now() - startTime;
  debugLog("[messageProcessor] Message processing complete:", {
    inputCount: endIndex,
    outputCount: processedMessages.length,
    skippedCount: context.skipIds.size,
    duration: `${duration.toFixed(2)}ms`,
  });

  return processedMessages;
}

/**
 * Parses and sanitizes message content, converting Skype-specific markup to HTML.
 * Handles emoji, links, formatting, and removes unwanted tags.
 */
function parseMessageContent(content: string): string {
  if (!content) return "";

  let parsed = parseSkypeEmoji(content);

  for (const [pattern, replacement] of CONTENT_PATTERNS) {
    parsed = parsed.replace(pattern, replacement);
  }

  return DOMPurify.sanitize(parsed, PURIFY_CONFIG);
}

function parseThreadActivity(message: Message): string | null {
  const { messagetype, content } = message;

  if (messagetype === "ThreadActivity/AddMember") {
    const targetMatches = content.match(THREAD_ACTIVITY_PATTERNS.AddMember);
    if (!targetMatches) return null;

    const members = targetMatches
      .map(
        (target) =>
          target
            .replace(/<\/?target>/g, "")
            .split(":")
            .pop() || "",
      )
      .filter(Boolean)
      .join(", ");

    return members ? `Added ${members} to the conversation` : null;
  }

  const valueMatch = content.match(THREAD_ACTIVITY_PATTERNS.Value);
  if (!valueMatch) return null;

  const value = valueMatch[1].toLowerCase() === "true";

  if (messagetype === "ThreadActivity/HistoryDisclosedUpdate") {
    return value ? "Chat history is now visible" : "Chat history is now hidden";
  }

  if (messagetype === "ThreadActivity/JoiningEnabledUpdate") {
    return value
      ? "Anyone can join this conversation"
      : "Joining this conversation is restricted";
  }

  return null;
}

interface CallParticipant {
  identity: string;
  name: string;
}

function formatCallDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return minutes > 0
    ? `${minutes}m ${remainingSeconds}s`
    : `${remainingSeconds}s`;
}

function normaliseParticipantName(
  name: string | null,
  identity: string,
): string {
  const trimmedName = name ? name.trim() : "";

  return (
    cleanDisplayName(trimmedName) ||
    cleanDisplayName(identity) ||
    trimmedName ||
    identity ||
    "Unknown participant"
  );
}

function extractCallDetails(content: string): {
  participants: CallParticipant[];
  maxDuration: number | null;
} {
  const participantData: CallParticipant[] = [];
  const seenIdentities = new Set<string>();
  let maxDuration = 0;

  let partMatch: RegExpExecArray | null;
  while ((partMatch = CALL_EVENT_PATTERNS.Part.exec(content)) !== null) {
    const identity = partMatch[1] ?? "";
    const partBody = partMatch[2] ?? "";
    const identityKey = identity.toLowerCase();

    if (!seenIdentities.has(identityKey)) {
      seenIdentities.add(identityKey);
      const nameMatch = partBody.match(CALL_EVENT_PATTERNS.Name);
      const name = nameMatch?.[1] ?? "";
      participantData.push({
        identity,
        name: normaliseParticipantName(name, identity),
      });
    }

    const durationMatch = partBody.match(CALL_EVENT_PATTERNS.Duration);
    if (durationMatch) {
      const seconds = parseFloat(durationMatch[1]);
      if (!Number.isNaN(seconds)) {
        maxDuration = Math.max(maxDuration, seconds);
      }
    }
  }

  return {
    participants: participantData,
    maxDuration: maxDuration > 0 ? maxDuration : null,
  };
}

/**
 * Parses call event messages and formats them with participant names.
 * Handles role swapping: when viewing from another participant's perspective,
 * "You" refers to that participant, not the original user.
 */
function parseCallEvent(
  message: Message,
  context: MessageProcessorContext,
): string {
  const typeMatch = message.content.match(CALL_EVENT_PATTERNS.Type);
  const rawType = typeMatch?.[1]?.toLowerCase();
  const { participants: participantData, maxDuration } = extractCallDetails(
    message.content,
  );
  const { userId, swapRoles } = context;
  const userIdLower = userId.toLowerCase();
  const userCleanLower =
    cleanDisplayName(userId)?.toLowerCase() ?? userIdLower;

  // Normalise participant identities for comparison (handle both raw IDs and display names)
  const participants = participantData.map((participant) => ({
    identityLower: participant.identity.toLowerCase(),
    cleanIdentityLower:
      cleanDisplayName(participant.identity)?.toLowerCase() ??
      participant.identity.toLowerCase(),
    label: participant.name,
  }));

  // Determine viewer identity: if role-swapped, use the other participant's identity
  let viewerIdentityLower = userIdLower;
  let viewerCleanLower = userCleanLower;

  if (swapRoles) {
    const otherParticipant = participants.find(
      (participant) =>
        participant.identityLower !== userIdLower &&
        participant.cleanIdentityLower !== userCleanLower,
    );

    if (otherParticipant) {
      viewerIdentityLower = otherParticipant.identityLower;
      viewerCleanLower = otherParticipant.cleanIdentityLower;
    }
  }

  // Map participants to labels, replacing viewer with "You"
  const participantLabels = participants.map((participant) => {
    const isViewer =
      participant.identityLower === viewerIdentityLower ||
      participant.cleanIdentityLower === viewerCleanLower;

    if (isViewer) {
      return "You";
    }

    // When role-swapped, show the original user's name (not "You")
    if (swapRoles) {
      if (
        participant.identityLower === userIdLower ||
        participant.cleanIdentityLower === userCleanLower
      ) {
        return participant.label;
      }
    }

    return participant.label;
  });

  const participantsText =
    participantLabels.length > 0 ? participantLabels.join(", ") : "";
  const durationText =
    typeof maxDuration === "number"
      ? formatCallDuration(maxDuration)
      : null;

  if (!rawType) {
    return participantsText
      ? `Call event • ${participantsText}`
      : "Call event";
  }

  if (rawType === "started") {
    return participantsText
      ? `Call started • ${participantsText}`
      : "Call started";
  }

  if (rawType === "missed") {
    return participantsText
      ? `Missed call • ${participantsText}`
      : "Missed call";
  }

  if (rawType === "ended") {
    if (durationText && participantsText) {
      return `Call ended • ${durationText} • ${participantsText}`;
    }
    if (durationText) {
      return `Call ended • ${durationText}`;
    }
    return participantsText
      ? `Call ended • ${participantsText}`
      : "Call ended";
  }

  return participantsText
    ? `Call ${rawType} • ${participantsText}`
    : `Call ${rawType}`;
}

interface NoticeAttachment {
  title?: string;
  text?: string;
}

interface NoticeData {
  attachments?: Array<{ content?: NoticeAttachment }>;
}

function parseNotice(message: Message): string {
  try {
    const data = JSON.parse(message.content) as NoticeData[];
    const attachment = data[0]?.attachments?.[0]?.content;
    return attachment?.title || attachment?.text || "System Notice";
  } catch (error) {
    console.error("[messageProcessor] Failed to parse notice:", {
      error,
      messageId: message.id,
      messageType: message.messagetype,
    });
    return "System Notice";
  }
}

interface PopCardContent {
  title?: string;
  text?: string;
}

interface PopCardData {
  content?: PopCardContent;
}

function parsePopCard(message: Message): string {
  try {
    const data = JSON.parse(message.content) as PopCardData[];
    const content = data[0]?.content;
    if (!content) return "System Message";

    const { title, text } = content;
    if (title && text) return `${title}: ${text}`;
    return title || text || "System Message";
  } catch (error) {
    console.error("[messageProcessor] Failed to parse pop card:", {
      error,
      messageId: message.id,
      messageType: message.messagetype,
    });
    return "System Message";
  }
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * Groups messages by date for display purposes.
 * Returns a map where keys are formatted dates and values are arrays of messages.
 */
export function groupMessagesByDate(
  messages: ProcessedMessage[],
): Map<string, ProcessedMessage[]> {
  const grouped = new Map<string, ProcessedMessage[]>();

  for (const message of messages) {
    const dateKey = DATE_FORMATTER.format(new Date(message.timestamp));
    const group = grouped.get(dateKey) || [];
    group.push(message);
    grouped.set(dateKey, group);
  }

  return grouped;
}

/**
 * Determines if a message should be visually grouped with the previous message.
 * 
 * Grouping rules:
 * 1. Must be from same sender
 * 2. Must be same message type (text/media/system)
 * 3. Must be within time threshold (GROUP_TIME_THRESHOLD)
 * 4. System messages are never grouped
 * 
 * Grouped messages share the same bubble styling and only show sender/timestamp on the first message.
 */
export function shouldGroupWithPrevious(
  current: ProcessedMessage,
  previous: ProcessedMessage | null,
): boolean {
  // Different sender or type cannot be grouped
  if (
    !previous ||
    current.from !== previous.from ||
    current.type !== previous.type
  ) {
    return false;
  }
  // System messages are always displayed separately
  if (current.type === "system" || previous.type === "system") {
    return false;
  }

  // Check if messages are close enough in time to be grouped
  const timeDiff = Math.abs(
    new Date(current.timestamp).getTime() -
      new Date(previous.timestamp).getTime(),
  );
  return timeDiff < GROUP_TIME_THRESHOLD;
}

function stripHtml(html: string): string {
  if (!html) return "";

  const tempDiv =
    typeof document !== "undefined" ? document.createElement("div") : null;
  if (!tempDiv) {
    return html.replace(STRIP_HTML_PATTERN, "");
  }

  const content = parseSkypeEmoji(html)
    .replace(STRIP_SKYPE_PATTERN, "$1")
    .replace(STRIP_HTML_PATTERN, "");

  tempDiv.innerHTML = content;
  return tempDiv.textContent || tempDiv.innerText || "";
}

function getPreviewText(text: string): string {
  return stripHtml(text).substring(0, PREVIEW_MAX_LENGTH);
}

/**
 * Generates a preview text for a message, used in conversation list.
 * Handles different message types and extracts appropriate preview content.
 */
export function getMessagePreview(
  message: Message,
  userId: string,
  nextMessage?: Message,
): string {
  const { messagetype, content, from } = message;

  if (messagetype === "Translation") {
    if (from === userId && nextMessage?.messagetype === "RichText") {
      return getPreviewText(nextMessage.content);
    }

    try {
      const translatedText = parseTranslationContent(content);
      return getPreviewText(translatedText || content);
    } catch (error) {
      console.error(
        "[messageProcessor] Failed to get message preview for Translation:",
        {
          error,
          messageId: message.id,
          contentLength: content.length,
        },
      );
      return getPreviewText(content);
    }
  }

  if (
    messagetype === "RichText" ||
    messagetype.startsWith("InviteFreeRelationshipChanged")
  ) {
    return getPreviewText(content);
  }

  if (messagetype === "RichText/Media_GenericFile") {
    return parseGenericFile(content);
  }

  if (
    messagetype === "RichText/UriObject" ||
    messagetype === "RichText/Media_Video"
  ) {
    // Check if content has OriginalName tag (media file info available)
    if (content.includes("<OriginalName")) {
      return parseMediaFileInfo(content);
    }
    // Fallback to preview text for other URIObject formats
    return getPreviewText(content);
  }

  if (messagetype.startsWith("ThreadActivity")) {
    try {
      return parseThreadActivity(message) || "System message";
    } catch (error) {
      console.error(
        "[messageProcessor] Failed to parse ThreadActivity for preview:",
        {
          error,
          messageId: message.id,
          messagetype,
        },
      );
      return "System message";
    }
  }

  if (messagetype.startsWith("Event/Call")) {
    try {
      const previewContext: MessageProcessorContext = {
        userId,
        swapRoles: false,
        skipIds: new Set(),
      };
      return parseCallEvent(message, previewContext);
    } catch (error) {
      console.error(
        "[messageProcessor] Failed to parse Call event for preview:",
        {
          error,
          messageId: message.id,
        },
      );
      return "Call event";
    }
  }

  if (messagetype === "Notice") {
    try {
      return parseNotice(message);
    } catch (error) {
      console.error("[messageProcessor] Failed to parse Notice for preview:", {
        error,
        messageId: message.id,
      });
      return "System Notice";
    }
  }

  if (messagetype === "PopCard") {
    try {
      return parsePopCard(message);
    } catch (error) {
      console.error("[messageProcessor] Failed to parse PopCard for preview:", {
        error,
        messageId: message.id,
      });
      return "System Message";
    }
  }

  return "Message";
}
