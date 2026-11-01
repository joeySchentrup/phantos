import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { getChatConfig } from "~/backend/api";
import {
  acquireMedia,
  getChatState,
  getRoomView,
  openRoom,
  startChat,
  stopChat,
  subscribeChat,
  type MediaKind,
} from "~/backend/chat";
import type { ChatConfig, ChatRoomView, ChatState } from "~/types/chat";

/**
 * Chat's settings from PocketBase, asked once `ask` is true: only approved
 * players and DMs need them. Null while asking, or when not asked.
 */
export function useChatConfig(ask: boolean): ChatConfig | null {
  const [config, setConfig] = useState<ChatConfig | null>(null);

  useEffect(() => {
    if (!ask) return;
    let current = true;
    getChatConfig().then((answer) => {
      if (current) setConfig(answer);
    });
    return () => {
      current = false;
    };
  }, [ask]);

  return ask ? config : null;
}

/** Whether chat is on (useChatConfig). Null while asking, or when not asked. */
export function useChatEnabled(ask: boolean): boolean | null {
  return useChatConfig(ask)?.enabled ?? null;
}

/**
 * A picture from the chat server as a `blob:` URL, once `load` is true. Let
 * go of when the component goes or the picture changes.
 */
export function useChatMedia(mxc: string, kind: MediaKind, load: boolean): { url: string | null; failed: boolean } {
  const key = kind + " " + mxc;
  const [state, setState] = useState({ key: "", url: null as string | null, failed: false });

  useEffect(() => {
    if (!load || !mxc) return;
    let current = true;
    const held = acquireMedia(mxc, kind);
    held.url.then(
      (url) => current && setState({ key, url, failed: false }),
      () => current && setState({ key, url: null, failed: true })
    );
    return () => {
      current = false;
      held.release();
    };
  }, [mxc, kind, load, key]);

  return state.key === key ? { url: state.url, failed: state.failed } : { url: null, failed: false };
}

/**
 * The chat connection, while `enabled`: connects when it turns on, and
 * disconnects when it turns off or the page goes (the session is kept).
 */
export function useChat(enabled: boolean): ChatState {
  useEffect(() => {
    if (!enabled) return;
    startChat();
    return () => stopChat();
  }, [enabled]);

  return useSyncExternalStore(subscribeChat, getChatState, getChatState);
}

/** One room's conversation. Loads its members once the room is there, so names and typing show. */
export function useChatRoom(roomId: string, ready: boolean): ChatRoomView {
  const get = useCallback(() => getRoomView(roomId), [roomId]);

  useEffect(() => {
    if (ready && roomId) openRoom(roomId);
  }, [roomId, ready]);

  return useSyncExternalStore(subscribeChat, get, get);
}
