import { useEffect, useRef, useState } from "react";
import { fitWithin, SHOWN_MAX } from "~/lib/chatImages";
import { useChatMedia } from "~/lib/useChat";
import type { ChatPicture as Picture } from "~/types/chat";

/** How far ahead of the conversation's view a picture starts loading. */
const LOAD_AHEAD = "600px";

interface Props {
  picture: Picture;
  /** Its caption, or its file name. */
  alt: string;
  onOpen: () => void;
}

/**
 * A picture in a message, at a capped size with its space kept from the
 * start, so the conversation doesn't jump as it loads. It loads as it comes
 * near the view: the conversation's thumbnail, which moves for a GIF.
 */
export default function ChatPicture({ picture, alt, onOpen }: Props) {
  const box = useRef<HTMLButtonElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const element = box.current;
    if (!element || near) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), {
      root: element.closest(".chat-log"),
      rootMargin: LOAD_AHEAD,
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [near]);

  const { url, failed } = useChatMedia(picture.mxc, "thumbnail", near);
  const size = fitWithin(picture.width, picture.height, SHOWN_MAX.width, SHOWN_MAX.height);

  return (
    <button
      ref={box}
      type="button"
      onClick={onOpen}
      className="chat-picture"
      style={{ width: size.width, aspectRatio: `${size.width} / ${size.height}` }}
      aria-label={`Open the picture: ${alt}`}
    >
      {url ? (
        <img src={url} alt={alt} className="chat-picture__img" />
      ) : failed ? (
        <span className="chat-picture__failed">The picture couldn't be loaded</span>
      ) : (
        <span className="chat-picture__loading skeleton" />
      )}
    </button>
  );
}
