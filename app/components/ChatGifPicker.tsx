import { useCallback, useEffect, useRef, useState } from "react";
import { searchGifs } from "~/backend/gifs";
import type { GifResult, GifSettings } from "~/types/chat";

interface Props {
  gifs: GifSettings;
  onPick: (gif: GifResult) => void;
  onClose: () => void;
}

/** A search waits for typing to pause, so a word is one search: a beta key allows 100 an hour. */
const TYPING_PAUSE_MS = 450;

/**
 * GIPHY's attribution, which its terms ask for wherever its search is used:
 * its official mark, put in public/ as powered-by-giphy.png (deploy/matrix/README.md).
 * Plain text stands in until it's there, which GIPHY doesn't accept for a production key.
 */
function GiphyMark() {
  const [missing, setMissing] = useState(false);
  return (
    <p className="chat-gifs__credit">
      {missing ? (
        "Powered by GIPHY"
      ) : (
        <img src="/powered-by-giphy.png" alt="Powered by GIPHY" className="chat-gifs__mark" onError={() => setMissing(true)} />
      )}
    </p>
  );
}

/** GIF search above the message box: what's trending while the search is empty, then results as you type. */
export default function ChatGifPicker({ gifs, onPick, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GifResult[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const asking = useRef<AbortController | null>(null);

  const load = useCallback(
    async (search: string, offset: number) => {
      asking.current?.abort();
      const controller = new AbortController();
      asking.current = controller;
      setBusy(true);
      setError("");
      try {
        const page = await searchGifs(gifs, search, offset, controller.signal);
        setResults((shown) => (offset ? [...shown, ...page.gifs.filter((g) => !shown.some((s) => s.id === g.id))] : page.gifs));
        setNext(page.next);
      } catch (err: any) {
        if (err?.name !== "AbortError") setError(err?.message || "GIF search isn't answering.");
      } finally {
        if (asking.current === controller) setBusy(false);
      }
    },
    [gifs]
  );

  useEffect(() => {
    const timer = setTimeout(() => void load(query, 0), query.trim() ? TYPING_PAUSE_MS : 0);
    return () => clearTimeout(timer);
  }, [query, load]);

  useEffect(() => () => asking.current?.abort(), []);

  return (
    <div
      className="chat-gifs"
      role="dialog"
      aria-label="Choose a GIF"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="chat-gifs__head">
        <label htmlFor="gif-search" className="sr-only">
          Search for a GIF
        </label>
        <input
          id="gif-search"
          type="search"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search GIPHY"
          maxLength={50}
          className="field !py-1.5 text-[0.95rem]"
        />
        <button type="button" onClick={onClose} className="chat-tool" aria-label="Close GIF search">
          ×
        </button>
      </div>

      <div className="chat-gifs__grid">
        {results.map((gif) => (
          <button key={gif.id} type="button" onClick={() => onPick(gif)} className="chat-gif" title={gif.title}>
            <img
              src={gif.preview.url}
              width={gif.preview.width}
              height={gif.preview.height}
              alt={gif.title}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </button>
        ))}
      </div>

      <div className="chat-gifs__foot">
        {busy ? (
          <span className="spinner" aria-label="Searching" />
        ) : error ? (
          <p role="alert" className="text-sm text-[#ffcfb8]">
            {error}
          </p>
        ) : !results.length ? (
          <p className="text-sm text-[#c9b78f]">No GIFs found.</p>
        ) : next !== null ? (
          <button type="button" onClick={() => void load(query, next)} className="chat-link text-sm">
            More
          </button>
        ) : null}
        <GiphyMark />
      </div>
    </div>
  );
}
