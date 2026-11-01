/**
 * Chat: the table's rooms on the chat server (Synapse). PocketBase decides
 * who is in each room; the site talks to the chat server only through
 * app/backend/chat.ts.
 */

export type ChatKind = "private" | "group";

/** What PocketBase's session route hands the browser: a chat session on this browser's device. */
export interface ChatSession {
  /** The chat server's address, as browsers reach it. */
  homeserver: string;
  user_id: string;
  access_token: string;
  device_id: string;
}

/** Whether chat is on, and where the chat server is: PocketBase's MATRIX_PUBLIC_URL. */
export interface ChatConfig {
  enabled: boolean;
  homeserver: string;
}

/** A `chats` record, which only DMs read: a player's private channel, or a group a DM made. */
export interface ChatRecord {
  id: string;
  kind: ChatKind;
  /** A group's name; empty for a private channel. */
  name: string;
  /** Whose private channel; "" for a group. */
  player: string;
  /** Who is in a group, besides the DMs. */
  players: string[];
  /** The Matrix room ID, once the sync has made it. */
  room: string;
  /** Why the chat server isn't in step yet; empty when it is. */
  sync_error: string;
  created: string;
  updated: string;
}

export interface GroupChatInput {
  name: string;
  players: string[];
}

/** What a room says it is: the `org.phantos.chat` state event the sync puts in it. */
export interface ChatMarker {
  kind: ChatKind;
  /** The player of a private channel. */
  player: string;
  /** The `chats` record's ID. */
  chat: string;
}

/** A room in the list. */
export interface ChatRoomSummary {
  id: string;
  kind: ChatKind;
  /** The `chats` record's ID. */
  chatId: string;
  /** The room's name on the server: a group's name, or a channel's player. */
  name: string;
  unread: number;
  /** When its newest message was sent; 0 when it has none. */
  lastActive: number;
  /** The newest message, for a line under the room's name. */
  preview: string;
}

export type ChatMessageStatus = "sent" | "sending" | "failed";

export interface ChatMessage {
  /** The event's ID, or its transaction ID while it's still being sent. */
  id: string;
  sender: string;
  senderName: string;
  /** The message's text; null for anything the site doesn't show (a picture, a file). */
  body: string | null;
  ts: number;
  mine: boolean;
  status: ChatMessageStatus;
}

/** One room's conversation, as the page shows it. */
export interface ChatRoomView {
  messages: ChatMessage[];
  /** The names of those typing, other than you. */
  typing: string[];
  /** Whether there may be older messages to load. */
  canLoadOlder: boolean;
  loadingOlder: boolean;
}

export type ChatStatus = "idle" | "connecting" | "ready" | "error";

export interface ChatState {
  status: ChatStatus;
  /** Why chat couldn't start, when `status` is "error". */
  error: string;
  /** Your chat ID, once connected. */
  userId: string;
  /** False while the connection to the chat server is down and being retried. */
  online: boolean;
  rooms: ChatRoomSummary[];
}
