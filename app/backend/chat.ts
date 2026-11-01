import type { MatrixClient, MatrixEvent, Room } from "matrix-js-sdk";
import type { RoomMessageEventContent } from "matrix-js-sdk/lib/types";
import { newDeviceId, previewText, sortRooms } from "../lib/chat";
import type { ChatKind, ChatMarker, ChatMessage, ChatRoomSummary, ChatRoomView, ChatSession, ChatState } from "../types/chat";
import { getChatSession, onAccountChange, signedInAccountId } from "./api";

/**
 * The site's chat client: the only file that talks to the chat server
 * (Synapse), as api.ts is the only one that talks to PocketBase. Pages use it
 * through the hooks in app/lib/useChat.ts.
 *
 * matrix-js-sdk is large, so it is loaded only when chat starts. This file can
 * be imported anywhere (root.tsx does, to end the session on signing out)
 * without pulling it into the page.
 */

type Sdk = typeof import("matrix-js-sdk");

const SESSION_KEY = "phantos_chat_session";
const DEVICE_KEY = "phantos_chat_device";
/** The state event the sync puts in every room the site makes (pb_hooks/phantos/chat.js). */
const MARKER = "org.phantos.chat";
const INITIAL_SYNC_LIMIT = 30;
const PAGE_SIZE = 30;
/** How long "… is typing" lasts without another keystroke, and how often a keystroke renews it. */
const TYPING_TIMEOUT_MS = 6000;
const TYPING_RENEW_MS = 3000;
/** Message types shown as text. Anything else (a picture, a file) shows as an attachment. */
const TEXT_TYPES = new Set(["m.text", "m.notice", "m.emote"]);

/** The browser's session, and whose it is: the PocketBase account it was made for. */
interface StoredSession extends ChatSession {
  owner: string;
}

// ---------------------------------------------------------------------------
// The session, kept in this browser
// ---------------------------------------------------------------------------

function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function writeSession(session: StoredSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Private browsing: the session lasts as long as the page.
  }
}

function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // nothing kept
  }
}

/** This browser's device, made once and kept, so reloads don't pile up devices on the chat server. */
function deviceId(): string {
  try {
    const kept = localStorage.getItem(DEVICE_KEY);
    if (kept) return kept;
  } catch {
    // made afresh below
  }
  const id = newDeviceId((length) => crypto.getRandomValues(new Uint8Array(length)));
  try {
    localStorage.setItem(DEVICE_KEY, id);
  } catch {
    // a new device next time
  }
  return id;
}

/** The signed-in account's session: the one kept in this browser, or a new one from PocketBase. */
async function accountSession(fresh: boolean): Promise<StoredSession> {
  const owner = signedInAccountId();
  const kept = readSession();
  if (!fresh && kept && kept.owner === owner) return kept;
  const session = { ...(await getChatSession(deviceId())), owner };
  writeSession(session);
  return session;
}

/**
 * Ends the kept session when the site's account changes: signing out, or
 * signing in as someone else. Returns an unsubscribe function.
 */
export function watchChatAccount(): () => void {
  const check = () => {
    const kept = readSession();
    if (!kept || kept.owner === signedInAccountId()) return;
    stopChat();
    clearSession();
    fetch(`${kept.homeserver}/_matrix/client/v3/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${kept.access_token}` },
    }).catch(() => {
      // The chat server is down: the token stays until the player is next signed out there.
    });
  };
  check();
  return onAccountChange(check);
}

// ---------------------------------------------------------------------------
// State the pages read
// ---------------------------------------------------------------------------

let sdk: Sdk | null = null;
let client: MatrixClient | null = null;
/** Bumped by each start and stop, so a start that finishes after a stop gives up. */
let generation = 0;
/** Fresh sessions asked for since the last good sync; the second rejected one in a row is an error. */
let freshSessions = 0;

let state: ChatState = { status: "idle", error: "", userId: "", online: true, rooms: [] };
const listeners = new Set<() => void>();

/** Each room's version: bumped whenever its conversation changes, so its view is rebuilt. */
const roomVersions = new Map<string, number>();
const views = new Map<string, { version: number; view: ChatRoomView }>();
const loadingOlder = new Set<string>();
/** Rooms whose oldest message the viewer may see has been loaded. */
const noOlder = new Set<string>();

const EMPTY_VIEW: ChatRoomView = { messages: [], typing: [], canLoadOlder: false, loadingOlder: false };

export function getChatState(): ChatState {
  return state;
}

export function subscribeChat(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(): void {
  for (const listener of listeners) listener();
}

function setState(patch: Partial<ChatState>): void {
  state = { ...state, ...patch };
  emit();
}

let queued = false;

/**
 * Something changed: in one room's conversation when `roomId` is given. The
 * room list is worked out again and the pages told, once for a burst of
 * events (a sync brings many at a time).
 */
function changed(roomId?: string): void {
  if (roomId) roomVersions.set(roomId, (roomVersions.get(roomId) ?? 0) + 1);
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    if (client) state = { ...state, rooms: summarizeRooms(client) };
    emit();
  });
}

// ---------------------------------------------------------------------------
// From the chat server's rooms to what the pages show
// ---------------------------------------------------------------------------

/** What a room says it is; null for a room the site didn't make. */
function roomMarker(room: Room): ChatMarker | null {
  const content = room.currentState.getStateEvents(MARKER, "")?.getContent();
  const kind = content?.kind as ChatKind | undefined;
  if (kind !== "private" && kind !== "group") return null;
  return { kind, player: String(content?.player ?? ""), chat: String(content?.chat ?? "") };
}

function toMessage(event: MatrixEvent, me: string): ChatMessage | null {
  if (event.getType() !== "m.room.message" || event.isRedacted()) return null;
  const content = event.getContent();
  if (typeof content.msgtype !== "string") return null;
  const status = event.status as string | null;
  if (status === "cancelled") return null;

  const sender = event.getSender() ?? "";
  return {
    id: event.getId() ?? event.getTxnId() ?? "",
    sender,
    senderName: event.sender?.name ?? sender,
    body: TEXT_TYPES.has(content.msgtype) && typeof content.body === "string" ? content.body : null,
    ts: event.getTs(),
    mine: sender === me,
    status: status === "not_sent" ? "failed" : status && status !== "sent" ? "sending" : "sent",
  };
}

function lastMessage(room: Room, me: string): ChatMessage | null {
  const events = room.getLiveTimeline().getEvents();
  for (let i = events.length - 1; i >= 0; i--) {
    const message = toMessage(events[i], me);
    if (message) return message;
  }
  return null;
}

/**
 * Unread messages: those from others since your read receipt, or since your
 * own last message, among those loaded. Counted here because Synapse works
 * out no notification counts for an app service's accounts, which every
 * account on this server is.
 */
function unreadCount(room: Room, me: string): number {
  const readUpTo = room.getEventReadUpTo(me);
  const events = room.getLiveTimeline().getEvents();
  let count = 0;
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    if (event.getId() === readUpTo || event.getSender() === me) break;
    if (toMessage(event, me)) count++;
  }
  return count;
}

function summarizeRooms(matrix: MatrixClient): ChatRoomSummary[] {
  const me = matrix.getUserId() ?? "";
  const rooms: ChatRoomSummary[] = [];
  for (const room of matrix.getRooms()) {
    if (room.getMyMembership() !== "join") continue;
    const marker = roomMarker(room);
    if (!marker) continue;
    const last = lastMessage(room, me);
    rooms.push({
      id: room.roomId,
      kind: marker.kind,
      chatId: marker.chat,
      name: room.name,
      unread: unreadCount(room, me),
      lastActive: last?.ts ?? 0,
      preview: previewText(last),
    });
  }
  return sortRooms(rooms);
}

/**
 * Whether the conversation may go back further. It can't past the room's
 * creation, or past the viewer's own invitation: they see messages from the
 * point they were added (`history_visibility: invited`).
 */
function mayLoadOlder(room: Room, me: string): boolean {
  if (noOlder.has(room.roomId) || !sdk) return false;
  const timeline = room.getLiveTimeline();
  const first = timeline.getEvents()[0];
  if (first?.getType() === "m.room.create") return false;
  if (first?.getType() === "m.room.member" && first.getStateKey() === me && first.getContent().membership === "invite") {
    return false;
  }
  return timeline.getPaginationToken(sdk.Direction.Backward) !== null;
}

function buildView(room: Room, me: string): ChatRoomView {
  const messages: ChatMessage[] = [];
  for (const event of room.getLiveTimeline().getEvents()) {
    const message = toMessage(event, me);
    if (message) messages.push(message);
  }
  return {
    messages,
    typing: room
      .getMembers()
      .filter((member) => member.typing && member.userId !== me)
      .map((member) => member.name),
    canLoadOlder: mayLoadOlder(room, me),
    loadingOlder: loadingOlder.has(room.roomId),
  };
}

/** One room's conversation. The same object until the room changes, as useSyncExternalStore needs. */
export function getRoomView(roomId: string): ChatRoomView {
  const room = client?.getRoom(roomId);
  if (!client || !room) return EMPTY_VIEW;
  const version = roomVersions.get(roomId) ?? 0;
  const cached = views.get(roomId);
  if (cached && cached.version === version) return cached.view;
  const view = buildView(room, client.getUserId() ?? "");
  views.set(roomId, { version, view });
  return view;
}

// ---------------------------------------------------------------------------
// Starting and stopping
// ---------------------------------------------------------------------------

function messageOf(error: any, fallback: string): string {
  return error?.response?.message || error?.data?.error || error?.message || fallback;
}

function listen(matrix: MatrixClient, api: Sdk): void {
  matrix.on(api.ClientEvent.Sync, (sync) => {
    if (sync === api.SyncState.Prepared || sync === api.SyncState.Syncing) {
      freshSessions = 0;
      if (state.status !== "ready" || !state.online) setState({ status: "ready", online: true });
      changed();
    } else if (sync === api.SyncState.Error || sync === api.SyncState.Reconnecting) {
      if (state.online) setState({ online: false });
    }
  });
  matrix.on(api.ClientEvent.Room, () => changed());
  matrix.on(api.RoomEvent.Timeline, (_event, room) => changed(room?.roomId));
  matrix.on(api.RoomEvent.TimelineReset, (room) => changed(room?.roomId));
  matrix.on(api.RoomEvent.LocalEchoUpdated, (_event, room) => changed(room.roomId));
  matrix.on(api.RoomEvent.Redaction, (_event, room) => changed(room.roomId));
  matrix.on(api.RoomEvent.Receipt, (_event, room) => changed(room.roomId));
  matrix.on(api.RoomEvent.Name, (room) => changed(room.roomId));
  matrix.on(api.RoomEvent.MyMembership, (room) => changed(room.roomId));
  matrix.on(api.RoomMemberEvent.Typing, (_event, member) => changed(member.roomId));
  matrix.on(api.RoomMemberEvent.Name, (_event, member) => changed(member.roomId));
  matrix.on(api.RoomStateEvent.Events, (event) => changed(event.getRoomId()));
  // The token was rejected (the player was revoked, or signed out elsewhere): ask PocketBase for another.
  matrix.on(api.HttpApiEvent.SessionLoggedOut, () => {
    clearSession();
    stopClient();
    if (freshSessions >= 1) {
      setState({ status: "error", error: "Chat signed you out. Reload the page to sign in again." });
      return;
    }
    freshSessions++;
    startChat(true);
  });
}

function stopClient(): void {
  generation++;
  if (client) {
    client.stopClient();
    client.removeAllListeners();
  }
  client = null;
  views.clear();
  roomVersions.clear();
  loadingOlder.clear();
  noOlder.clear();
}

/** Connects to the chat server as the signed-in account. Does nothing while already connected or connecting. */
export function startChat(freshSession = false): void {
  if (client || (state.status === "connecting" && !freshSession)) return;
  const run = ++generation;
  setState({ status: "connecting", error: "", online: true });

  (async () => {
    try {
      const api = sdk ?? (sdk = await import("matrix-js-sdk"));
      const session = await accountSession(freshSession);
      if (run !== generation) return;

      const matrix = api.createClient({
        baseUrl: session.homeserver,
        accessToken: session.access_token,
        userId: session.user_id,
        deviceId: session.device_id,
      });
      client = matrix;
      listen(matrix, api);
      setState({ userId: session.user_id });
      await matrix.startClient({ initialSyncLimit: INITIAL_SYNC_LIMIT, lazyLoadMembers: true });
    } catch (error: any) {
      if (run !== generation) return;
      stopClient();
      const status = error?.status;
      setState({
        status: "error",
        error:
          status === 403
            ? messageOf(error, "Chat opens once the Dungeon Master approves you.")
            : status === 404
              ? "Chat isn't switched on for this site."
              : messageOf(error, "The chat server is not answering. Try again in a little while."),
      });
    }
  })();
}

/** Disconnects, keeping the session for next time. */
export function stopChat(): void {
  stopClient();
  setState({ status: "idle", error: "", userId: "", online: true, rooms: [] });
}

// ---------------------------------------------------------------------------
// What the pages do
// ---------------------------------------------------------------------------

/** Loads the room's members, so their names and "… is typing" show. Rooms are small. */
export function openRoom(roomId: string): void {
  client
    ?.getRoom(roomId)
    ?.loadMembersIfNeeded()
    .then(() => changed(roomId))
    .catch(() => {
      // Names fall back to chat IDs.
    });
}

export async function loadOlder(roomId: string): Promise<void> {
  const matrix = client;
  const room = matrix?.getRoom(roomId);
  if (!matrix || !room || loadingOlder.has(roomId) || !mayLoadOlder(room, matrix.getUserId() ?? "")) return;

  loadingOlder.add(roomId);
  changed(roomId);
  const before = room.getLiveTimeline().getEvents().length;
  try {
    const more = await matrix.paginateEventTimeline(room.getLiveTimeline(), { backwards: true, limit: PAGE_SIZE });
    // Nothing more, or nothing the viewer may see: stop asking.
    if (!more || room.getLiveTimeline().getEvents().length === before) noOlder.add(roomId);
  } catch (error) {
    console.error("Error loading older messages:", error);
  } finally {
    loadingOlder.delete(roomId);
    changed(roomId);
  }
}

export async function sendText(roomId: string, text: string): Promise<void> {
  const body = text.trim();
  if (!client || !sdk || !body) return;
  setTyping(roomId, false);
  const content = { msgtype: sdk.MsgType.Text, body } as RoomMessageEventContent;
  try {
    await client.sendMessage(roomId, content);
  } catch (error) {
    // It stays in the conversation, marked as not sent, with a retry.
    console.error("Error sending a message:", error);
  }
}

/** Sends a message that failed again. */
export function resend(roomId: string, messageId: string): void {
  const room = client?.getRoom(roomId);
  const event = room?.getLiveTimeline().getEvents().find((e) => (e.getId() ?? e.getTxnId()) === messageId);
  if (client && room && event) client.resendEvent(event, room).catch((error) => console.error("Error resending:", error));
}

let typingRoom = "";
let typingSentAt = 0;

/** Tells the room you're typing, at most every few seconds, or that you've stopped. */
export function setTyping(roomId: string, typing: boolean): void {
  if (!client) return;
  const now = Date.now();
  if (typing) {
    if (typingRoom === roomId && now - typingSentAt < TYPING_RENEW_MS) return;
    typingRoom = roomId;
    typingSentAt = now;
    client.sendTyping(roomId, true, TYPING_TIMEOUT_MS).catch(() => {});
  } else if (typingRoom === roomId) {
    typingRoom = "";
    typingSentAt = 0;
    client.sendTyping(roomId, false, 0).catch(() => {});
  }
}

let receiptFor = "";

/** Marks the room read up to its newest message, which clears its unread badge. */
export function markRead(roomId: string): void {
  const matrix = client;
  const room = matrix?.getRoom(roomId);
  const me = matrix?.getUserId();
  if (!matrix || !sdk || !room || !me) return;

  const events = room.getLiveTimeline().getEvents();
  for (let i = events.length - 1; i >= 0; i--) {
    const id = events[i].getId();
    // Skip messages still being sent: a receipt needs the server's ID.
    if (events[i].status || !id?.startsWith("$")) continue;
    if (id === receiptFor || room.hasUserReadEvent(me, id)) return;
    receiptFor = id;
    matrix
      .sendReadReceipt(events[i], sdk.ReceiptType.Read, true)
      .catch((error) => console.error("Error marking the room read:", error))
      .finally(() => {
        if (receiptFor === id) receiptFor = "";
      });
    return;
  }
}
