import { useEffect, useRef } from "react";
import { useChatMedia } from "~/lib/useChat";
import type { ChatPicture } from "~/types/chat";

interface Props {
  picture: ChatPicture;
  caption: string;
  onClose: () => void;
}

/**
 * A picture at full size, with a link to download it. Esc, Close, or a click
 * outside the picture closes it. The thumbnail shows while the whole file
 * loads; both are let go of when it closes.
 */
export default function ChatPictureViewer({ picture, caption, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const thumbnail = useChatMedia(picture.mxc, "thumbnail", true);
  const full = useChatMedia(picture.mxc, "download", true);
  const shown = full.url ?? thumbnail.url;
  const label = caption || picture.filename;

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      className="chat-viewer"
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // The dialog fills the screen; a click on it, not on what it holds, is a click outside the picture.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {shown ? (
        <img src={shown} alt={label} className="chat-viewer__img" />
      ) : full.failed ? (
        <p className="chat-viewer__note">The picture couldn't be loaded.</p>
      ) : (
        <span className="spinner" aria-label="Loading the picture" />
      )}
      <div className="chat-viewer__bar">
        <p className="chat-viewer__caption">{label}</p>
        {full.url && (
          <a href={full.url} download={picture.filename} className="btn btn-ghost !px-3 !py-2 !text-[0.72rem]">
            Download
          </a>
        )}
        <button type="button" onClick={onClose} className="btn btn-gold !px-3 !py-2 !text-[0.72rem]" autoFocus>
          Close
        </button>
      </div>
    </dialog>
  );
}
