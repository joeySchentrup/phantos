import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/chat";
import {
  currentPlayer,
  isDungeonMaster,
  listChats,
  listHeroes,
  listPlayers,
  onAccountChange,
  refreshPlayer,
} from "../backend/api";
import { startChat } from "../backend/chat";
import AttributeOrb from "../components/AttributeOrb";
import ChatConversation from "../components/ChatConversation";
import ChatGroupEditor from "../components/ChatGroupEditor";
import ChatRooms from "../components/ChatRooms";
import { roomTitle } from "../lib/chat";
import { useChat, useChatConfig } from "../lib/useChat";
import type { ChatRecord } from "../types/chat";
import type { Player } from "../types/player";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Chat — Phantos" }, { name: "robots", content: "noindex" }];
}

type Visitor = "unknown" | "guest" | "pending" | "player" | "dm";

/** Who is looking, kept in step as they sign in and out and as a DM approves or revokes them. */
function useVisitor(): Visitor {
  const [visitor, setVisitor] = useState<Visitor>("unknown");
  useEffect(() => {
    const sync = () => {
      const player = currentPlayer();
      setVisitor(player ? (player.approved ? "player" : "pending") : isDungeonMaster() ? "dm" : "guest");
    };
    sync();
    refreshPlayer();
    return onAccountChange(sync);
  }, []);
  return visitor;
}

/** The page's frame for everything but the chat itself: why there's no chat here, or that it's connecting. */
function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-md px-4 pt-16">
      <div className="panel p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <AttributeOrb attribute="arcane" size="3rem" />
          <div className="min-w-0">
            <p className="eyebrow">Chat</p>
            <h1 className="font-heading text-2xl font-bold text-[#f4e6c3]">{title}</h1>
          </div>
        </div>
        <div className="mt-4 space-y-4 text-[#c9b78f]">{children}</div>
      </div>
    </main>
  );
}

type Editing = { kind: "new" } | { kind: "edit"; chatId: string } | null;

export default function Chat() {
  const visitor = useVisitor();
  const isDm = visitor === "dm";
  const mayChat = visitor === "player" || isDm;
  const config = useChatConfig(mayChat);
  const chatOn = config ? config.enabled : null;
  const chat = useChat(mayChat && chatOn === true);
  const ready = chat.status === "ready";

  const [params, setParams] = useSearchParams();
  const selected = params.get("room") ?? "";
  const [editing, setEditing] = useState<Editing>(null);
  /** A group just made, to open once its room arrives. */
  const [awaiting, setAwaiting] = useState("");

  // DMs also see the `chats` records: which room is whose, and whether the chat server is in step.
  const [records, setRecords] = useState<ChatRecord[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [heroNames, setHeroNames] = useState<Record<string, string>>({});

  const reloadRecords = useCallback(() => {
    listChats()
      .then(setRecords)
      .catch(() => setRecords([]));
  }, []);

  useEffect(() => {
    if (!isDm) return;
    reloadRecords();
    listPlayers()
      .then((list) => setPlayers(list.filter((p) => p.approved)))
      .catch(() => setPlayers([]));
    listHeroes()
      .then((list) => setHeroNames(Object.fromEntries(list.map((h) => [h.id, h.name]))))
      .catch(() => setHeroNames({}));
  }, [isDm, reloadRecords]);

  const select = useCallback(
    (roomId: string) => {
      setEditing(null);
      setParams(roomId ? { room: roomId } : {});
    },
    [setParams]
  );

  useEffect(() => {
    if (!awaiting) return;
    const room = chat.rooms.find((r) => r.chatId === awaiting);
    if (room) {
      setAwaiting("");
      select(room.id);
    }
  }, [awaiting, chat.rooms, select]);

  if (visitor === "unknown") return <main className="min-h-[50vh]" />;

  if (visitor === "guest" || visitor === "pending") {
    return (
      <Notice title={visitor === "guest" ? "For the table" : "Waiting for approval"}>
        <p>
          {visitor === "guest"
            ? "Chat is where the players and the Dungeon Masters talk between sessions. Sign in as a player to join in."
            : "Chat opens once the Dungeon Master approves you as the player of your hero."}
        </p>
        <Link to="/players" className="btn btn-gold w-full">
          {visitor === "guest" ? "Sign in or join" : "Your player account"}
        </Link>
      </Notice>
    );
  }

  // Asking PocketBase whether chat is on.
  if (chatOn === null) return <main className="min-h-[50vh]" />;

  if (!chatOn) {
    return (
      <Notice title="Not here yet">
        <p>Chat isn't switched on for this site.</p>
      </Notice>
    );
  }

  if (chat.status === "error") {
    return (
      <Notice title="Chat couldn't start">
        <p role="alert">{chat.error}</p>
        <button type="button" onClick={() => startChat()} className="btn btn-gold w-full">
          Try again
        </button>
      </Notice>
    );
  }

  const room = chat.rooms.find((r) => r.id === selected);
  const record = room ? records.find((r) => r.id === room.chatId) : undefined;
  const editedGroup = editing?.kind === "edit" ? records.find((r) => r.id === editing.chatId) : undefined;
  const paneOpen = !!room || !!editing;

  // Chats the chat server hasn't caught up with, which aren't in the room list: so a DM sees why.
  const stuck = isDm ? records.filter((r) => r.sync_error && !chat.rooms.some((x) => x.chatId === r.id)) : [];
  const playerName = (id: string) => players.find((p) => p.id === id)?.name ?? "a player";

  const afterEdit = (chatId?: string) => {
    setEditing(null);
    reloadRecords();
    if (chatId) setAwaiting(chatId);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="eyebrow">The Table</p>
          <h1 className="font-heading text-3xl font-bold gold-text">Chat</h1>
        </div>
        {!chat.online && (
          <p role="status" className="chat-offline">
            <span className="spinner" aria-hidden="true" /> Reconnecting to the chat server…
          </p>
        )}
      </div>

      {!ready ? (
        <div className="chat-layout chat-layout--loading" role="status">
          <span className="spinner" aria-hidden="true" /> Connecting to the chat…
        </div>
      ) : (
        <div className="chat-layout">
          <div className={paneOpen ? "chat-layout__list max-md:hidden" : "chat-layout__list"}>
            <ChatRooms
              rooms={chat.rooms}
              activeId={room?.id ?? ""}
              isDm={isDm}
              onSelect={select}
              onNewGroup={isDm ? () => setEditing({ kind: "new" }) : undefined}
            />
            {stuck.length > 0 && (
              <div className="chat-stuck">
                <p className="chat-rooms__heading">Waiting for the chat server</p>
                <ul>
                  {stuck.map((r) => (
                    <li key={r.id}>
                      {r.kind === "group" ? (
                        <button type="button" className="chat-link" onClick={() => setEditing({ kind: "edit", chatId: r.id })}>
                          {r.name}
                        </button>
                      ) : (
                        <span>{playerName(r.player)}'s channel</span>
                      )}
                      <span className="block text-xs text-[#c9b78f]/80">{r.sync_error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className={paneOpen ? "chat-layout__pane" : "chat-layout__pane max-md:hidden"}>
            {editing ? (
              <ChatGroupEditor
                key={editing.kind === "edit" ? editing.chatId : "new"}
                group={editedGroup}
                players={players}
                heroNames={heroNames}
                onSaved={(group) => afterEdit(group.id)}
                onDeleted={() => {
                  afterEdit();
                  select("");
                }}
                onCancel={() => setEditing(null)}
              />
            ) : room ? (
              <ChatConversation
                key={room.id}
                room={room}
                title={roomTitle(room, isDm)}
                ready={ready}
                gifs={config?.gifs ?? null}
                syncError={record?.sync_error}
                onBack={() => select("")}
                onEdit={isDm && room.kind === "group" ? () => setEditing({ kind: "edit", chatId: room.chatId }) : undefined}
              />
            ) : (
              <p className="chat-placeholder">
                {chat.rooms.length ? "Choose a chat." : isDm ? "Approve a player, or make a group, to start a chat." : "Your chats appear here."}
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
