import type { ChatKind, ChatMessage, ChatRoomSummary } from "~/types/chat";

/**
 * Chat's rules that don't need the chat server: what a room is called, the
 * order of the room list, how messages group, and links in plain text.
 */

/** A player's channel is shared with every DM, so to the player it is "The DMs". */
export const PLAYER_CHANNEL_TITLE = "The DMs";

/** A room's title for the viewer: a DM sees a channel under its player's name, the player as "The DMs". */
export function roomTitle(room: { kind: ChatKind; name: string }, viewerIsDm: boolean): string {
  if (room.kind === "private") return viewerIsDm ? room.name || "A player" : PLAYER_CHANNEL_TITLE;
  return room.name || "Group";
}

/** Private channels first, then groups; within each, the latest message first, then by name. */
export function sortRooms<T extends Pick<ChatRoomSummary, "kind" | "lastActive" | "name">>(rooms: T[]): T[] {
  const rank = (kind: ChatKind) => (kind === "private" ? 0 : 1);
  return [...rooms].sort(
    (a, b) => rank(a.kind) - rank(b.kind) || b.lastActive - a.lastActive || a.name.localeCompare(b.name)
  );
}

/** Messages from one sender this close together share a heading. */
export const GROUP_GAP_MS = 5 * 60 * 1000;

function sameDay(a: number, b: number): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

/** "Today", "Yesterday", "Saturday, Oct 31", or with the year when it isn't this one. */
export function dayLabel(ts: number, now = Date.now()): string {
  if (sameDay(ts, now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (sameDay(ts, yesterday.getTime())) return "Yesterday";
  const date = new Date(ts);
  return new Date(now).getFullYear() === date.getFullYear()
    ? date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
    : date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** "3:05 PM". */
export function timeLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export type ChatBlock =
  | { type: "day"; key: string; label: string }
  | {
      type: "group";
      key: string;
      sender: string;
      senderName: string;
      mine: boolean;
      messages: ChatMessage[];
    };

/**
 * The conversation as it's drawn: a divider for each day, and consecutive
 * messages from one sender under one heading, until a gap of GROUP_GAP_MS.
 */
export function groupMessages(messages: ChatMessage[], now = Date.now()): ChatBlock[] {
  const blocks: ChatBlock[] = [];
  let group: Extract<ChatBlock, { type: "group" }> | null = null;
  let last: ChatMessage | null = null;

  for (const message of messages) {
    if (!last || !sameDay(last.ts, message.ts)) {
      blocks.push({ type: "day", key: `day-${message.id}`, label: dayLabel(message.ts, now) });
      group = null;
    }
    if (!group || group.sender !== message.sender || message.ts - (last?.ts ?? 0) > GROUP_GAP_MS) {
      group = {
        type: "group",
        key: `group-${message.id}`,
        sender: message.sender,
        senderName: message.senderName,
        mine: message.mine,
        messages: [],
      };
      blocks.push(group);
    }
    group.messages.push(message);
    last = message;
  }
  return blocks;
}

/** "Alice is typing…", "Alice and Bob are typing…", and past two, "Several people are typing…". */
export function typingLine(names: string[]): string {
  if (!names.length) return "";
  if (names.length === 1) return `${names[0]} is typing…`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
  return "Several people are typing…";
}

/** The newest message, as the line under a room's name. */
export function previewText(message: Pick<ChatMessage, "body" | "senderName" | "mine"> | null): string {
  if (!message) return "";
  const text = message.body === null ? "Attachment" : message.body.replace(/\s+/g, " ").trim();
  return `${message.mine ? "You" : message.senderName}: ${text}`;
}

export type TextPiece = { text: string; href?: string };

const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"]+/gi;
/** Punctuation that ends a sentence rather than a link. */
const TRAILING = /[.,;:!?'"*]$/;

/** Drops what ended the sentence around the link, and a closing bracket the link didn't open. */
function trimLink(url: string): string {
  let result = url;
  for (;;) {
    if (TRAILING.test(result)) {
      result = result.slice(0, -1);
      continue;
    }
    const close = result.slice(-1);
    const open = close === ")" ? "(" : close === "]" ? "[" : "";
    if (open && result.split(open).length < result.split(close).length) {
      result = result.slice(0, -1);
      continue;
    }
    return result;
  }
}

/**
 * Plain text cut into pieces, with web addresses as links: only http and
 * https (a bare `www.` gets https), so a link can never run script. The
 * pieces are drawn as text and anchors, never as HTML.
 */
export function linkify(text: string): TextPiece[] {
  const pieces: TextPiece[] = [];
  let at = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const url = trimLink(match[0]);
    const start = match.index ?? 0;
    let href: string;
    try {
      const parsed = new URL(/^www\./i.test(url) ? `https://${url}` : url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;
      href = parsed.href;
    } catch {
      continue;
    }
    if (start > at) pieces.push({ text: text.slice(at, start) });
    pieces.push({ text: url, href });
    at = start + url.length;
  }
  if (at < text.length) pieces.push({ text: text.slice(at) });
  return pieces;
}

const DEVICE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * A browser's chat device ID: PHANTOS and 24 letters or digits, made once and
 * kept. The session route (pb_hooks/phantos/chat.js) accepts nothing else.
 */
export function newDeviceId(randomBytes: (length: number) => Uint8Array): string {
  let id = "PHANTOS";
  for (const byte of randomBytes(24)) id += DEVICE_CHARS[byte % DEVICE_CHARS.length];
  return id;
}
