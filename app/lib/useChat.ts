import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { getChatConfig } from "~/backend/api";
import { getChatState, getRoomView, openRoom, startChat, stopChat, subscribeChat } from "~/backend/chat";
import type { ChatRoomView, ChatState } from "~/types/chat";

/**
 * Whether chat is on, asked of PocketBase once `ask` is true: only approved
 * players and DMs need to know. Null while asking, or when not asked.
 */
export function useChatEnabled(ask: boolean): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!ask) return;
    let current = true;
    getChatConfig().then((config) => {
      if (current) setEnabled(config.enabled);
    });
    return () => {
      current = false;
    };
  }, [ask]);

  return ask ? enabled : null;
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
