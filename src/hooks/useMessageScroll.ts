import { useRef, useEffect, useCallback, startTransition } from "react";
import type { Conversation } from "../types/messages";
import {
  SCROLL_THRESHOLD,
  LOAD_MORE_INCREMENT,
  REQUIRED_STABLE_FRAMES,
  MAX_SCROLL_FRAMES,
} from "../constants/messages";

interface UseMessageScrollProps {
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  conversation: Conversation | null;
  loadedMessageCount: number;
  isLoadingMore: boolean;
  swapped: boolean;
  setLoadedMessageCount: (updater: (prev: number) => number) => void;
  setIsLoadingMore: (value: boolean) => void;
}

/**
 * Manages scroll behavior for the message view.
 * Handles auto-scroll to bottom on conversation open and scroll position restoration
 * when loading more messages. Waits for virtualizer to stabilize before scrolling.
 */
export function useMessageScroll({
  scrollContainerRef,
  conversation,
  loadedMessageCount,
  isLoadingMore,
  swapped,
  setLoadedMessageCount,
  setIsLoadingMore,
}: UseMessageScrollProps) {
  const previousScrollHeightRef = useRef(0);
  const previousScrollTopRef = useRef(0);

  useEffect(() => {
    previousScrollHeightRef.current = 0;
    previousScrollTopRef.current = 0;
  }, [conversation?.id, swapped]);

  /**
   * Auto-scrolls to bottom when conversation changes.
   * Waits for virtualizer to stabilise (scrollHeight stops changing) before scrolling
   * to ensure accurate positioning. Uses frame counting as fallback timeout.
   */
  useEffect(() => {
    if (!conversation || !scrollContainerRef.current) {
      return;
    }

    let lastHeight = 0;
    let stableFrames = 0;
    let frameCount = 0;

    const scrollToBottom = () => {
      const scrollContainer = scrollContainerRef.current;
      if (!scrollContainer) {
        return;
      }

      const currentHeight = scrollContainer.scrollHeight;
      frameCount++;

      // Track consecutive frames with stable height (virtualizer has finished rendering)
      if (currentHeight === lastHeight) {
        stableFrames++;
      } else {
        stableFrames = 0;
        lastHeight = currentHeight;
      }

      // Scroll when height is stable or max frames reached (timeout fallback)
      if (stableFrames >= REQUIRED_STABLE_FRAMES || frameCount >= MAX_SCROLL_FRAMES) {
        const performScroll = () => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
          }
        };
        // Perform scroll twice: immediately and after a short delay to handle any remaining layout shifts
        performScroll();
        setTimeout(performScroll, 100);
      } else {
        requestAnimationFrame(scrollToBottom);
      }
    };

    requestAnimationFrame(scrollToBottom);
  }, [conversation, swapped, scrollContainerRef]);

  const loadMoreMessages = useCallback(() => {
    if (!conversation || !scrollContainerRef.current || isLoadingMore) return;

    previousScrollHeightRef.current =
      scrollContainerRef.current.scrollHeight ?? 0;
    previousScrollTopRef.current = scrollContainerRef.current.scrollTop ?? 0;

    startTransition(() => {
      setIsLoadingMore(true);
      setLoadedMessageCount((prev) =>
        Math.min(prev + LOAD_MORE_INCREMENT, conversation.MessageList.length),
      );
    });
  }, [conversation, isLoadingMore, setLoadedMessageCount, scrollContainerRef, setIsLoadingMore]);

  /**
   * Handles scroll events to trigger loading more messages.
   * When user scrolls near the top (within SCROLL_THRESHOLD), loads additional older messages.
   * Prevents multiple simultaneous loads with isLoadingMore check.
   */
  const handleScroll = useCallback(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || isLoadingMore || !conversation) {
      return;
    }

    const scrollTop = scrollContainer.scrollTop;

    // Load more when scrolled near top and not all messages are loaded
    const shouldLoadMore =
      scrollTop < SCROLL_THRESHOLD &&
      loadedMessageCount < conversation.MessageList.length;

    if (shouldLoadMore) {
      loadMoreMessages();
    }
  }, [
    conversation,
    isLoadingMore,
    loadedMessageCount,
    loadMoreMessages,
    scrollContainerRef,
  ]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll, scrollContainerRef]);

  /**
   * Restores scroll position after loading more messages.
   * When new messages are added above the current view, we adjust scrollTop by the height difference
   * to maintain the user's visual position. Waits for virtualizer to stabilise before restoring.
   */
  useEffect(() => {
    if (
      !isLoadingMore ||
      !scrollContainerRef.current ||
      previousScrollHeightRef.current === 0
    ) {
      return;
    }

    let lastHeight = 0;
    let stableFrames = 0;
    let frameCount = 0;

    const restoreScroll = () => {
      const scrollContainer = scrollContainerRef.current;
      if (!scrollContainer) {
        startTransition(() => setIsLoadingMore(false));
        return;
      }

      const currentHeight = scrollContainer.scrollHeight;
      frameCount++;

      // Wait for height to stabilise (virtualizer finished rendering new messages)
      if (currentHeight === lastHeight) {
        stableFrames++;
      } else {
        stableFrames = 0;
        lastHeight = currentHeight;
      }

      if (stableFrames >= REQUIRED_STABLE_FRAMES || frameCount >= MAX_SCROLL_FRAMES) {
        // Calculate new scroll position: previous position + height added above
        const heightDifference = currentHeight - previousScrollHeightRef.current;
        const newScrollTop = previousScrollTopRef.current + heightDifference;
        scrollContainer.scrollTop = newScrollTop;

        previousScrollHeightRef.current = 0;
        previousScrollTopRef.current = 0;
        startTransition(() => setIsLoadingMore(false));
      } else {
        requestAnimationFrame(restoreScroll);
      }
    };

    requestAnimationFrame(restoreScroll);
  }, [isLoadingMore, setIsLoadingMore, scrollContainerRef]);
}

