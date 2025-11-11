export interface SkypeExport {
  userId: string;
  exportDate: string;
  conversations: Conversation[];
  mediaFiles?: Map<string, File>;
}

export interface Conversation {
  id: string;
  displayName: string;
  version: number;
  properties: ConversationProperties;
  threadProperties: ThreadProperties | null;
  MessageList: Message[];
}

export interface ConversationProperties {
  conversationblocked: boolean;
  lastimreceivedtime: string | null;
  consumptionhorizon: string | null;
  conversationstatus: string | null;
}

export interface ThreadProperties {
  membercount?: number;
  members?: string;
  membersBlocked?: string | null;
  membersNicknames?: string | null;
  topic?: string;
  picture?: string | null;
  description?: string | null;
  guidelines?: string | null;
  shareJoinLink?: string | null;
  joiningEnabled?: string | null;
  searchVisible?: string | null;
  websiteText?: string | null;
  websiteUrl?: string | null;
  consumptionhorizons?: unknown;
}

export interface Message {
  id: string;
  displayName: string | null;
  originalarrivaltime: string;
  messagetype: string;
  version: number;
  content: string;
  conversationid: string;
  from: string;
  properties?: MessageProperties | null;
  amsreferences?: unknown;
}

export interface MessageProperties {
  callLog?: string;
  [key: string]: unknown;
}

export interface TranslationContent {
  translations: Array<{
    translation: string;
    loc: string;
  }>;
  oloc: string;
  oid: string;
}

export interface ProcessedMessage {
  id: string;
  displayName: string | null;
  timestamp: string;
  content: string;
  type: "text" | "system" | "call" | "notice" | "media";
  from: string;
  isOwner: boolean;
  originalMessageType: string;
  mediaUrl?: string;
}

export interface MediaMetadata {
  expiry_date: string;
  filename: string;
  contents: {
    [key: string]: {
      type: string;
    };
  };
}

export interface MediaItem {
  id: string;
  mediaId: string;
  timestamp: string;
  displayName: string | null;
  isOwner: boolean;
}
