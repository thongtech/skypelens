import { create } from "zustand";
import type {
  Conversation,
  SkypeExport,
  ProcessedMessage,
} from "../types/messages";
import { debugLog } from "../utils/debug";

interface ProcessedMessagesCache {
  [conversationId: string]: {
    normal: ProcessedMessage[];
    swapped: ProcessedMessage[];
  };
}

interface MessageStore {
  conversations: Conversation[];
  selectedConversationId: string | null;
  exportData: SkypeExport | null;
  swappedRoles: Record<string, boolean>;
  processedMessagesCache: ProcessedMessagesCache;
  setExportData: (data: SkypeExport) => void;
  selectConversation: (id: string) => void;
  getSelectedConversation: () => Conversation | null;
  toggleRoleSwap: (conversationId: string) => void;
  isRoleSwapped: (conversationId: string) => boolean;
  cacheProcessedMessages: (
    conversationId: string,
    messages: ProcessedMessage[],
    isSwapped: boolean,
  ) => void;
  getProcessedMessages: (
    conversationId: string,
    isSwapped: boolean,
  ) => ProcessedMessage[] | null;
}

export const useMessageStore = create<MessageStore>((set, get) => ({
  conversations: [],
  selectedConversationId: null,
  exportData: null,
  swappedRoles: {},
  processedMessagesCache: {},

  setExportData: (data) => {
    const filteredConversations = data.conversations.filter(
      (conv) => conv.MessageList?.length > 0,
    );

    filteredConversations.sort((a, b) => {
      const aLastMessage = a.MessageList[a.MessageList.length - 1];
      const bLastMessage = b.MessageList[b.MessageList.length - 1];

      if (!aLastMessage) return 1;
      if (!bLastMessage) return -1;

      const aTime = new Date(aLastMessage.originalarrivaltime).getTime();
      const bTime = new Date(bLastMessage.originalarrivaltime).getTime();
      return bTime - aTime;
    });

    const selectedId = filteredConversations[0]?.id || null;

    set({
      exportData: data,
      conversations: filteredConversations,
      selectedConversationId: selectedId,
      processedMessagesCache: {},
    });
  },

  selectConversation: (id) => {
    debugLog("[messageStore] Selecting conversation:", { conversationId: id });
    set({ selectedConversationId: id });
  },

  getSelectedConversation: () => {
    const { conversations, selectedConversationId } = get();
    return conversations.find((c) => c.id === selectedConversationId) || null;
  },

  toggleRoleSwap: (conversationId) => {
    set((state) => {
      const newCache = { ...state.processedMessagesCache };
      delete newCache[conversationId];
      const newSwappedState = !state.swappedRoles[conversationId];

      return {
        swappedRoles: {
          ...state.swappedRoles,
          [conversationId]: newSwappedState,
        },
        processedMessagesCache: newCache,
      };
    });
  },

  isRoleSwapped: (conversationId) => {
    return get().swappedRoles[conversationId] || false;
  },

  cacheProcessedMessages: (conversationId, messages, isSwapped) => {
    set((state) => ({
      processedMessagesCache: {
        ...state.processedMessagesCache,
        [conversationId]: {
          ...state.processedMessagesCache[conversationId],
          [isSwapped ? "swapped" : "normal"]: messages,
        },
      },
    }));
  },

  getProcessedMessages: (conversationId, isSwapped) => {
    const cache = get().processedMessagesCache[conversationId];
    return cache?.[isSwapped ? "swapped" : "normal"] ?? null;
  },
}));

export const useConversations = () =>
  useMessageStore((state) => state.conversations);
export const useSelectedConversationId = () =>
  useMessageStore((state) => state.selectedConversationId);
export const useExportData = () => useMessageStore((state) => state.exportData);
export const useSelectConversation = () =>
  useMessageStore((state) => state.selectConversation);
