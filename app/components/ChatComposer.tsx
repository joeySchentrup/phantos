import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { sendPicture, sendText, setTyping } from "~/backend/chat";
import { downloadGif } from "~/backend/gifs";
import { megabytes, PICTURE_TYPES } from "~/lib/chatImages";
import { PictureRefused, preparePicture } from "~/lib/chatPicture";
import type { GifResult, GifSettings, PreparedPicture } from "~/types/chat";
import ChatGifPicker from "./ChatGifPicker";

interface Props {
  roomId: string;
  title: string;
  ready: boolean;
  /** GIF search, when PocketBase has a GIPHY key; null hides the GIF button. */
  gifs: GifSettings | null;
  /** Filled with a way to attach a file, so the conversation can take one dropped on it. */
  attachRef: React.MutableRefObject<((file: File) => void) | null>;
  /** Called as something is sent, so the conversation follows it to the bottom. */
  onSend: () => void;
}

const MESSAGE_MAX = 4000;
const COMPOSER_MAX_PX = 160;

function PictureIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="M4 18l5.5-5.5 4 4 2.5-2.5L20 18" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The box to write in. A picture comes in by the picture button, by pasting,
 * or by dropping it on the conversation (or from GIF search); it waits in a
 * preview with an optional caption until Enter sends it or Esc puts it away.
 */
export default function ChatComposer({ roomId, title, ready, gifs, attachRef, onSend }: Props) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<{ picture: PreparedPicture; url: string } | null>(null);
  const [preparing, setPreparing] = useState(false);
  /** How much of the picture has gone up, 0–1, while it's being sent. */
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [gifOpen, setGifOpen] = useState(false);

  // Leaving the room stops saying you're typing in it.
  useEffect(() => () => setTyping(roomId, false), [roomId]);

  // The preview's blob URL goes with the preview, and with the box.
  useEffect(() => {
    return () => {
      if (attachment) URL.revokeObjectURL(attachment.url);
    };
  }, [attachment]);

  const attach = async (file: Blob, name: string) => {
    setError("");
    setPreparing(true);
    try {
      const picture = await preparePicture(file, name);
      setAttachment({ picture, url: URL.createObjectURL(picture.blob) });
      inputRef.current?.focus();
    } catch (err) {
      setError(err instanceof PictureRefused ? err.message : "That picture couldn't be read.");
    } finally {
      setPreparing(false);
    }
  };

  useEffect(() => {
    attachRef.current = (file) => void attach(file, file.name);
    return () => {
      attachRef.current = null;
    };
  });

  // The box grows with what's written, up to a few lines.
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, COMPOSER_MAX_PX)}px`;
  }, [draft]);

  const sending = progress !== null;

  const send = async () => {
    if (!ready || sending || preparing) return;
    if (!attachment) {
      if (!draft.trim()) return;
      onSend();
      void sendText(roomId, draft);
      setDraft("");
      return;
    }
    setError("");
    setProgress(0);
    try {
      await sendPicture(roomId, attachment.picture, draft, setProgress);
      onSend();
      setAttachment(null);
      setDraft("");
    } catch (err: any) {
      setError(`The picture couldn't be sent${err?.message ? `: ${err.message}` : "."}`);
    } finally {
      setProgress(null);
    }
  };

  const pickGif = async (gif: GifResult) => {
    setGifOpen(false);
    setError("");
    setPreparing(true);
    try {
      const blob = await downloadGif(gif.send.url);
      await attach(blob, gif.title.replace(/[^\w -]+/g, "").trim().slice(0, 60) || "GIF");
    } catch (err: any) {
      setError(err?.message || "That GIF couldn't be downloaded.");
      setPreparing(false);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter starts a new line. Not while an input method is composing a character.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    } else if (event.key === "Escape" && attachment && !sending) {
      event.preventDefault();
      setAttachment(null);
    }
  };

  const onPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const file = Array.from(event.clipboardData.files).find((f) => f.type.startsWith("image/"));
    if (!file) return;
    event.preventDefault();
    void attach(file, file.name || "pasted picture");
  };

  return (
    <div className="chat-composer-wrap">
      {gifOpen && gifs && <ChatGifPicker gifs={gifs} onPick={(gif) => void pickGif(gif)} onClose={() => setGifOpen(false)} />}

      {(attachment || preparing) && (
        <div className="chat-attachment-preview">
          {attachment ? (
            <>
              <img src={attachment.url} alt="" className="chat-attachment-preview__thumb" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-[#f4e6c3]">{attachment.picture.name}</span>
                <span className="block text-xs text-[#c9b78f]">
                  {sending
                    ? `Sending… ${Math.round((progress ?? 0) * 100)}%`
                    : `${attachment.picture.width} × ${attachment.picture.height} · ${
                        attachment.picture.blob.size < 1024 * 1024
                          ? `${Math.max(1, Math.round(attachment.picture.blob.size / 1024))} KB`
                          : megabytes(attachment.picture.blob.size)
                      } · Enter sends, Esc cancels`}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setAttachment(null)}
                disabled={sending}
                className="chat-tool"
                aria-label="Don't send the picture"
              >
                ×
              </button>
            </>
          ) : (
            <span className="inline-flex items-center gap-2 text-sm text-[#c9b78f]">
              <span className="spinner" aria-hidden="true" /> Getting the picture ready…
            </span>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="chat-composer-error">
          {error}
        </p>
      )}

      <form
        className="chat-composer"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept={PICTURE_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void attach(file, file.name);
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={!ready || sending}
          className="chat-tool"
          aria-label="Send a picture"
          title="Send a picture"
        >
          <PictureIcon />
        </button>
        {gifs && (
          <button
            type="button"
            onClick={() => setGifOpen((open) => !open)}
            disabled={!ready || sending}
            aria-expanded={gifOpen}
            className="chat-tool chat-tool--gif"
            title="Send a GIF"
          >
            GIF
          </button>
        )}
        <label htmlFor="chat-message" className="sr-only">
          {attachment ? "Caption" : `Message ${title}`}
        </label>
        <textarea
          id="chat-message"
          ref={inputRef}
          rows={1}
          maxLength={MESSAGE_MAX}
          value={draft}
          disabled={!ready || sending}
          onChange={(event) => {
            setDraft(event.target.value);
            setTyping(roomId, event.target.value.trim() !== "");
          }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={() => setTyping(roomId, false)}
          placeholder={attachment ? "Add a caption (optional)" : `Message ${title}`}
          className="chat-input"
        />
        <button
          type="submit"
          disabled={!ready || sending || preparing || (!attachment && !draft.trim())}
          className="btn btn-gold !px-4 !py-2"
        >
          Send
        </button>
      </form>
    </div>
  );
}
