import type { ProcessedMessage } from "../types/messages";

/**
 * Strips HTML tags and returns plain text for searching.
 */
function stripHtmlForSearch(html: string): string {
  if (!html) return "";

  const tempDiv =
    typeof document !== "undefined" ? document.createElement("div") : null;
  if (!tempDiv) {
    return html.replace(/<[^>]*>/g, "");
  }

  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || "";
}

/**
 * Checks if a message matches the search query.
 * Searches in content and display name.
 */
function messageMatchesSearch(
  message: ProcessedMessage,
  query: string,
): boolean {
  if (!query.trim()) return true;

  const searchQuery = query.toLowerCase().trim();
  const contentText = stripHtmlForSearch(message.content).toLowerCase();
  const displayNameText = (message.displayName || "").toLowerCase();

  return (
    contentText.includes(searchQuery) || displayNameText.includes(searchQuery)
  );
}

/**
 * Filters messages based on search query.
 */
export function filterMessages(
  messages: ProcessedMessage[],
  query: string,
): ProcessedMessage[] {
  if (!query.trim()) return messages;

  return messages.filter((message) => messageMatchesSearch(message, query));
}

/**
 * Highlights search matches in HTML content.
 * Returns HTML with highlighted matches wrapped in a mark tag.
 * Uses a simple approach that works for most cases but may not handle
 * all edge cases with complex nested HTML.
 */
export function highlightSearchMatch(html: string, query: string): string {
  if (!query.trim() || !html) return html;

  const searchQuery = query.trim();
  const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");

  // If the content is plain text (no HTML tags), simple replacement works
  if (!/<[^>]+>/.test(html)) {
    return html.replace(
      regex,
      '<mark style="background-color: rgba(255, 255, 0, 0.4); padding: 2px 0;">$1</mark>',
    );
  }

  // For HTML content, we need to be more careful
  // We'll use a simple approach: replace text nodes while avoiding tags
  // This works by finding text that's not inside HTML tags
  let lastIndex = 0;
  const parts: string[] = [];
  let inTag = false;

  // Simple state machine to track if we're inside a tag
  for (let i = 0; i < html.length; i++) {
    if (html[i] === "<") {
      if (lastIndex < i) {
        // Process text before the tag
        const textBefore = html.substring(lastIndex, i);
        const highlighted = textBefore.replace(
          regex,
          '<mark style="background-color: rgba(255, 255, 0, 0.4); padding: 2px 0;">$1</mark>',
        );
        parts.push(highlighted);
      }
      inTag = true;
      lastIndex = i;
    } else if (html[i] === ">" && inTag) {
      // End of tag, include the tag as-is
      parts.push(html.substring(lastIndex, i + 1));
      lastIndex = i + 1;
      inTag = false;
    }
  }

  // Process any remaining text after the last tag
  if (lastIndex < html.length) {
    const textAfter = html.substring(lastIndex);
    const highlighted = textAfter.replace(
      regex,
      '<mark style="background-color: rgba(255, 255, 0, 0.4); padding: 2px 0;">$1</mark>',
    );
    parts.push(highlighted);
  }

  return parts.join("");
}

/**
 * Finds all message indices that match the search query.
 */
export function findMatchingMessageIndices(
  messages: ProcessedMessage[],
  query: string,
): number[] {
  if (!query.trim()) return [];

  const indices: number[] = [];
  for (let i = 0; i < messages.length; i++) {
    if (messageMatchesSearch(messages[i], query)) {
      indices.push(i);
    }
  }

  return indices;
}

