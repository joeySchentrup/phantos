import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { loadOlder, markRead, resend } from "~/backend/chat";
import { groupMessages, linkify, timeLabel, typingLine } from "~/lib/chat";
import { useChatRoom } from "~/lib/useChat";
import type { ChatMessage, ChatPicture as Picture, ChatRoomSummary, GifSettings } from "~/types/chat";
import ChatComposer from "./ChatComposer";
import ChatPicture from "./ChatPicture";
import ChatPictureViewer from "./ChatPictureViewer";

interface Props {
  room: ChatRoomSummary;
  title: string;
  /** Whether chat is connected. */
  ready: boolean;
  /** GIF search, when PocketBase has a GIPHY key. */
  gifs: GifSettings | null;
  /** For DMs: why the chat server isn't in step with this chat yet. */
  syncError?: string;
  /** Back to the room list, at phone width. */
  onBack: () => void;
  /** Opens the group editor; DMs, for groups. */
  onEdit?: () => void;
}

/** Within this of the bottom, the conversation follows new messages; within this of the top, it loads older ones. */
const NEAR_BOTTOM_PX = 80;
const NEAR_TOP_PX = 120;

/** Plain text with its web addresses as links. Never HTML: nothing in a message can run. */
function MessageText({ text }: { text: string }) {
  return (
    <>
      {linkify(text).map((piece, i) =>
        piece.href ? (
          <a key={i} href={piece.href} target="_blank" rel="noopener noreferrer nofollow" className="chat-link">
            {piece.text}
          </a>
        ) : (
          <span key={i}>{piece.text}</span>
        )
      )}
    </>
  );
}

function Message({ message, roomId, onOpen }: { message: ChatMessage; roomId: string; onOpen: (message: ChatMessage) => void }) {
  const className =
    message.status === "failed"
      ? "chat-message chat-message--failed"
      : message.status === "sending"
        ? "chat-message chat-message--sending"
        : "chat-message";
  return (
    <div className={className} title={timeLabel(message.ts)}>
      {message.picture ? (
        <>
          <ChatPicture picture={message.picture} alt={message.body || message.picture.filename} onOpen={() => onOpen(message)} />
          {message.body && (
            <span className="chat-caption">
              <MessageText text={message.body} />
            </span>
          )}
        </>
      ) : message.body === null ? (
        <em className="chat-attachment">Attachment not shown</em>
      ) : (
        <MessageText text={message.body} />
      )}
      {message.status === "failed" && (
        <button type="button" onClick={() => resend(roomId, message.id)} className="chat-retry">
          Not sent · Retry
        </button>
      )}
    </div>
  );
}

/** One room: its messages, who's typing, and the box to write in. A picture can be dropped anywhere on it. */
export default function ChatConversation({ room, title, ready, gifs, syncError, onBack, onEdit }: Props) {
  const view = useChatRoom(room.id, ready);
  const logRef = useRef<HTMLDivElement>(null);
  /** Whether the reader is at the bottom, so new messages scroll into view and count as read. */
  const atBottom = useRef(true);
  /** What was on screen last render, to keep the reader's place as messages come in above or below. */
  const seen = useRef({ room: "", first: "", last: "", fromBottom: 0 });
  /** The composer's way in for a dropped file. */
  const attachRef = useRef<((file: File) => void) | null>(null);
  const [dragging, setDragging] = useState(false);
  const [viewing, setViewing] = useState<{ picture: Picture; caption: string } | null>(null);

  const blocks = groupMessages(view.messages);
  const firstId = view.messages[0]?.id ?? "";
  const lastId = view.messages[view.messages.length - 1]?.id ?? "";

  useEffect(() => {
    atBottom.current = true;
  }, [room.id]);

  useLayoutEffect(() => {
    const log = logRef.current;
    if (!log) return;
    const before = seen.current;
    if (before.room !== room.id) {
      log.scrollTop = log.scrollHeight;
    } else if (before.first !== firstId && before.last === lastId) {
      // Older messages came in above: what was on screen stays put.
      log.scrollTop = log.scrollHeight - log.clientHeight - before.fromBottom;
    } else if (atBottom.current) {
      log.scrollTop = log.scrollHeight;
    }
    seen.current = { room: room.id, first: firstId, last: lastId, fromBottom: log.scrollHeight - log.clientHeight - log.scrollTop };
  });

  // A short conversation that doesn't fill the box loads more until it does, or there's no more.
  useEffect(() => {
    const log = logRef.current;
    if (log && view.canLoadOlder && !view.loadingOlder && log.scrollHeight <= log.clientHeight + NEAR_TOP_PX) {
      void loadOlder(room.id);
    }
  }, [room.id, view]);

  // Read while you're looking: at the bottom, with the page in front of you.
  useEffect(() => {
    if (!ready) return;
    const read = () => {
      if (atBottom.current && document.visibilityState === "visible" && document.hasFocus()) markRead(room.id);
    };
    read();
    window.addEventListener("focus", read);
    document.addEventListener("visibilitychange", read);
    return () => {
      window.removeEventListener("focus", read);
      document.removeEventListener("visibilitychange", read);
    };
  }, [room.id, lastId, ready]);

  const onScroll = () => {
    const log = logRef.current;
    if (!log) return;
    const fromBottom = log.scrollHeight - log.clientHeight - log.scrollTop;
    const wasAtBottom = atBottom.current;
    atBottom.current = fromBottom < NEAR_BOTTOM_PX;
    seen.current = { ...seen.current, fromBottom };
    if (atBottom.current && !wasAtBottom) markRead(room.id);
    if (log.scrollTop < NEAR_TOP_PX && view.canLoadOlder && !view.loadingOlder) void loadOlder(room.id);
  };

  const carriesFiles = (event: React.DragEvent) => Array.from(event.dataTransfer.types).includes("Files");

  const typing = typingLine(view.typing);

  return (
    <section
      className={dragging ? "chat-pane chat-pane--dropping" : "chat-pane"}
      aria-label={title}
      onDragOver={(event) => {
        if (!ready || !carriesFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(event) => {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) attachRef.current?.(file);
      }}
    >
      <header className="chat-header">
        <button type="button" onClick={onBack} className="chat-back md:hidden" aria-label="Back to your chats">
          ‹
        </button>
        <h2 className="chat-header__title">{title}</h2>
        {onEdit && (
          <button type="button" onClick={onEdit} className="btn btn-ghost !px-3 !py-1.5 !text-[0.68rem]">
            Edit group
          </button>
        )}
      </header>

      {syncError && (
        <p role="status" className="chat-notice">
          Waiting for the chat server: {syncError}
        </p>
      )}

      <div ref={logRef} onScroll={onScroll} className="chat-log" role="log" aria-live="polite" aria-relevant="additions">
        <div className="chat-log__start">
          {view.loadingOlder ? (
            <span className="inline-flex items-center gap-2">
              <span className="spinner" aria-hidden="true" /> Loading older messages…
            </span>
          ) : view.canLoadOlder ? (
            <button type="button" onClick={() => void loadOlder(room.id)} className="chat-link">
              Load older messages
            </button>
          ) : view.messages.length ? (
            "The start of the conversation"
          ) : null}
        </div>

        {!view.messages.length && !view.loadingOlder && <p className="chat-log__empty">No messages yet. Say hello.</p>}

        {blocks.map((block) =>
          block.type === "day" ? (
            <p key={block.key} className="chat-day">
              <span>{block.label}</span>
            </p>
          ) : (
            <div key={block.key} className={block.mine ? "chat-group chat-group--mine" : "chat-group"}>
              <p className="chat-group__head">
                <span className="chat-sender">{block.mine ? "You" : block.senderName}</span>
                <time className="chat-time" dateTime={new Date(block.messages[0].ts).toISOString()}>
                  {timeLabel(block.messages[0].ts)}
                </time>
              </p>
              {block.messages.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                  roomId={room.id}
                  onOpen={(m) => m.picture && setViewing({ picture: m.picture, caption: m.body ?? "" })}
                />
              ))}
            </div>
          )
        )}
      </div>

      <p className="chat-typing" aria-live="polite">
        {typing}
      </p>

      <ChatComposer
        roomId={room.id}
        title={title}
        ready={ready}
        gifs={gifs}
        attachRef={attachRef}
        onSend={() => {
          atBottom.current = true;
        }}
      />

      {dragging && (
        <div className="chat-drop" aria-hidden="true">
          Drop the picture to send it
        </div>
      )}

      {viewing && <ChatPictureViewer picture={viewing.picture} caption={viewing.caption} onClose={() => setViewing(null)} />}
    </section>
  );
}
