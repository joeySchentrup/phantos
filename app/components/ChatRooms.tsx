import { roomTitle } from "~/lib/chat";
import type { ChatRoomSummary } from "~/types/chat";

interface Props {
  rooms: ChatRoomSummary[];
  activeId: string;
  isDm: boolean;
  onSelect: (roomId: string) => void;
  /** Opens the group editor for a new group; DMs only. */
  onNewGroup?: () => void;
}

function RoomButton({ room, active, isDm, onSelect }: { room: ChatRoomSummary; active: boolean; isDm: boolean; onSelect: (id: string) => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(room.id)}
        aria-current={active ? "true" : undefined}
        className={active ? "chat-room chat-room--active" : "chat-room"}
      >
        <span className="min-w-0 flex-1">
          <span className="chat-room__title">{roomTitle(room, isDm)}</span>
          <span className="chat-room__preview">{room.preview || "No messages yet"}</span>
        </span>
        {room.unread > 0 && (
          <span className="chat-badge" aria-label={`${room.unread} unread`}>
            {room.unread > 99 ? "99+" : room.unread}
          </span>
        )}
      </button>
    </li>
  );
}

/** The room list: private channels, then groups, each by their latest message. */
export default function ChatRooms({ rooms, activeId, isDm, onSelect, onNewGroup }: Props) {
  const channels = rooms.filter((room) => room.kind === "private");
  const groups = rooms.filter((room) => room.kind === "group");

  return (
    <nav aria-label="Chats" className="chat-rooms">
      {channels.length > 0 && (
        <>
          {isDm && <p className="chat-rooms__heading">Players</p>}
          <ul>
            {channels.map((room) => (
              <RoomButton key={room.id} room={room} active={room.id === activeId} isDm={isDm} onSelect={onSelect} />
            ))}
          </ul>
        </>
      )}
      {(groups.length > 0 || onNewGroup) && <p className="chat-rooms__heading">Groups</p>}
      {groups.length > 0 && (
        <ul>
          {groups.map((room) => (
            <RoomButton key={room.id} room={room} active={room.id === activeId} isDm={isDm} onSelect={onSelect} />
          ))}
        </ul>
      )}
      {rooms.length === 0 && !onNewGroup && <p className="chat-rooms__empty">Your chats appear here.</p>}
      {onNewGroup && (
        <button type="button" onClick={onNewGroup} className="btn btn-ghost mx-3 mb-3 mt-2 !py-2 !text-[0.72rem]">
          + New group
        </button>
      )}
    </nav>
  );
}
