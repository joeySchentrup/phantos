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

/** GIF search's settings: GIPHY's key and content rating, from PocketBase's environment. */
export interface GifSettings {
  key: string;
  rating: string;
}

/** Whether chat is on, and where the chat server is: PocketBase's MATRIX_PUBLIC_URL. */
export interface ChatConfig {
  enabled: boolean;
  homeserver: string;
  /** GIF search, for approved players and DMs when GIPHY_API_KEY is set; null otherwise. */
  gifs: GifSettings | null;
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

/** The picture types chat sends and shows; the same as the site's other uploads (IMAGE_EXTENSIONS in lib.js). */
export type PictureType = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

/** A picture in a message (an `m.image` event): where it is on the chat server, and its size. */
export interface ChatPicture {
  /** Its `mxc://` address. */
  mxc: string;
  mimetype: PictureType;
  width: number;
  height: number;
  /** In bytes; 0 when the sender didn't say. */
  size: number;
  filename: string;
}

/** A picture ready to send: a photo shrunk and re-saved, or a GIF as it was. */
export interface PreparedPicture {
  blob: Blob;
  mimetype: PictureType;
  width: number;
  height: number;
  name: string;
}

/** One GIF from GIPHY's search: a small preview for the picker, and the copy to send. */
export interface GifResult {
  id: string;
  title: string;
  preview: { url: string; width: number; height: number };
  send: { url: string; width: number; height: number; size: number };
}

export interface ChatMessage {
  /** The event's ID, or its transaction ID while it's still being sent. */
  id: string;
  sender: string;
  senderName: string;
  /** The message's text, or a picture's caption ("" for none); null for anything the site doesn't show (a file). */
  body: string | null;
  /** The picture, for a picture message. */
  picture: ChatPicture | null;
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
