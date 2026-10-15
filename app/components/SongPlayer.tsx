import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { songAudioUrl } from "~/backend/api";
import { formatDuration, nextIndex, orderQueue, previousIndex, shuffleQueue } from "~/lib/songs";
import type { Song } from "~/types/song";

type Mode = "order" | "shuffle";

/** What plays: song ids in the order they'll play, and which one is up. */
interface Queue {
  ids: string[];
  index: number;
  mode: Mode;
}

export interface SongPlayer {
  /** Every song, in posting order. */
  songs: Song[];
  status: "loading" | "ready" | "error";
  current: Song | null;
  mode: Mode;
  playing: boolean;
  time: number;
  duration: number;
  /** Where the current song sits in what's playing ("3 of 12"). */
  position: { index: number; length: number } | null;
  upNext: Song | null;
  /** A song from the list, then the ones posted after it. */
  playSong: (id: string) => void;
  /** Every song from the first posted. */
  playAll: () => void;
  /** Every song once, in a random order. */
  shuffleAll: () => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  /** Shuffles what's left (or puts it back in order) without stopping the song that's playing. */
  setShuffle: (on: boolean) => void;
}

const SongPlayerContext = createContext<SongPlayer | null>(null);

export function useSongPlayer(): SongPlayer {
  const player = useContext(SongPlayerContext);
  if (!player) throw new Error("useSongPlayer needs a SongPlayerProvider (routes/songsLayout.tsx).");
  return player;
}

/**
 * The one <audio> element for the Songs section and the queue that drives it.
 * It lives in the section's layout, so a song plays on from the list into its
 * own page; leaving the section takes it, and the music, away.
 */
export function SongPlayerProvider({
  songs,
  status,
  children,
}: {
  songs: Song[];
  status: SongPlayer["status"];
  children: React.ReactNode;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [queue, setQueue] = useState<Queue>({ ids: [], index: -1, mode: "order" });
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  /** Set when the queue moves to another song, which should start once it is loaded. */
  const autoplay = useRef(false);

  const byId = useMemo(() => new Map(songs.map((song) => [song.id, song])), [songs]);
  const current = byId.get(queue.ids[queue.index] ?? "") ?? null;

  // The actions read the latest state through refs, so they never change and
  // the media keys can hold on to them.
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const idsRef = useRef<string[]>([]);
  idsRef.current = songs.map((song) => song.id);

  // A song deleted or unpublished in the meantime drops out of the queue.
  useEffect(() => {
    setQueue((q) => {
      const kept = q.ids.filter((id) => byId.has(id));
      if (kept.length === q.ids.length) return q;
      const playingId = q.ids[q.index];
      return { ...q, ids: kept, index: playingId ? kept.indexOf(playingId) : -1 };
    });
  }, [byId]);

  // Load whatever is current into the element, and start it if it was asked for.
  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    if (!current) {
      if (el.dataset.song) {
        el.pause();
        delete el.dataset.song;
        el.removeAttribute("src");
        el.load();
      }
      setTime(0);
      setDuration(0);
      return;
    }
    if (el.dataset.song !== current.id) {
      el.dataset.song = current.id;
      el.src = songAudioUrl(current);
      setTime(0);
      setDuration(current.duration);
    }
    if (autoplay.current) {
      autoplay.current = false;
      el.play().catch(() => setPlaying(false));
    }
  }, [current]);

  // Leaving the section stops the music.
  useEffect(() => () => audio.current?.pause(), []);

  /** Moves the queue and plays whatever is now up. */
  const go = useCallback((next: Queue) => {
    const el = audio.current;
    const nextId = next.ids[next.index];
    setQueue(next);
    if (el && nextId && nextId === el.dataset.song) {
      // The same song again: it's already loaded, so just play it.
      if (el.ended) el.currentTime = 0;
      el.play().catch(() => setPlaying(false));
    } else {
      autoplay.current = true;
    }
  }, []);

  const playSong = useCallback((id: string) => {
    const { queue: ids, index } = orderQueue(idsRef.current, id);
    if (index >= 0) go({ ids, index, mode: "order" });
  }, [go]);

  const playAll = useCallback(() => {
    const { queue: ids, index } = orderQueue(idsRef.current);
    if (index >= 0) go({ ids, index, mode: "order" });
  }, [go]);

  const shuffleAll = useCallback(() => {
    const ids = shuffleQueue(idsRef.current);
    if (ids.length) go({ ids, index: 0, mode: "shuffle" });
  }, [go]);

  const toggle = useCallback(() => {
    const el = audio.current;
    const q = queueRef.current;
    if (!el || q.index < 0) {
      if (q.mode === "shuffle") shuffleAll();
      else playAll();
      return;
    }
    if (el.paused) {
      if (el.ended) el.currentTime = 0;
      el.play().catch(() => setPlaying(false));
    } else {
      el.pause();
    }
  }, [playAll, shuffleAll]);

  const next = useCallback(() => {
    const q = queueRef.current;
    const n = nextIndex(q.ids, q.index);
    if (n !== null) go({ ...q, index: n });
  }, [go]);

  const previous = useCallback(() => {
    const q = queueRef.current;
    const el = audio.current;
    if (q.index < 0 || !el) return;
    const back = previousIndex(q.index, el.currentTime);
    if (back.restart) {
      el.currentTime = 0;
      setTime(0);
    } else {
      go({ ...q, index: back.index });
    }
  }, [go]);

  const seek = useCallback((seconds: number) => {
    const el = audio.current;
    if (!el || !Number.isFinite(seconds)) return;
    el.currentTime = seconds;
    setTime(seconds);
  }, []);

  const setShuffle = useCallback((on: boolean) => {
    const q = queueRef.current;
    const id = q.ids[q.index];
    if (on) {
      setQueue({ ids: shuffleQueue(idsRef.current, id), index: id ? 0 : -1, mode: "shuffle" });
    } else {
      const order = orderQueue(idsRef.current, id);
      setQueue({ ids: order.queue, index: id ? order.index : -1, mode: "order" });
    }
  }, []);

  /** At the end of a song, the next one in the queue; after the last, silence. */
  const onEnded = () => {
    const q = queueRef.current;
    const n = nextIndex(q.ids, q.index);
    if (n === null) setPlaying(false);
    else go({ ...q, index: n });
  };

  // The phone's lock screen and the keyboard's media keys.
  useEffect(() => {
    if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
    navigator.mediaSession.metadata = current
      ? new MediaMetadata({ title: current.title, artist: current.credit || "Phantos", album: "Songs of Phanatos" })
      : null;
  }, [current]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => toggle()],
      ["pause", () => audio.current?.pause()],
      ["nexttrack", () => next()],
      ["previoustrack", () => previous()],
    ];
    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Not every browser knows every action.
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // as above
        }
      }
    };
  }, [toggle, next, previous]);

  const upNextIndex = nextIndex(queue.ids, queue.index);
  const value = useMemo<SongPlayer>(
    () => ({
      songs,
      status,
      current,
      mode: queue.mode,
      playing,
      time,
      duration,
      position: current ? { index: queue.index, length: queue.ids.length } : null,
      upNext: current && upNextIndex !== null ? byId.get(queue.ids[upNextIndex]) ?? null : null,
      playSong,
      playAll,
      shuffleAll,
      toggle,
      next,
      previous,
      seek,
      setShuffle,
    }),
    [songs, status, current, queue, playing, time, duration, upNextIndex, byId, playSong, playAll, shuffleAll, toggle, next, previous, seek, setShuffle]
  );

  return (
    <SongPlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audio}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={onEnded}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onDurationChange={(e) => {
          const seconds = e.currentTarget.duration;
          if (Number.isFinite(seconds) && seconds > 0) setDuration(seconds);
        }}
        onError={() => setPlaying(false)}
      />
    </SongPlayerContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

function Icon({ children, className = "h-5 w-5" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

export function PlayIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
    </Icon>
  );
}

export function PauseIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x="6.5" y="5" width="4" height="14" rx="1" />
      <rect x="13.5" y="5" width="4" height="14" rx="1" />
    </Icon>
  );
}

function PreviousIcon() {
  return (
    <Icon>
      <rect x="5" y="5" width="2.5" height="14" rx="1" />
      <path d="M19 6.2v11.6a1 1 0 0 1-1.55.83L9.2 12.83a1 1 0 0 1 0-1.66l8.25-5.8A1 1 0 0 1 19 6.2z" />
    </Icon>
  );
}

function NextIcon() {
  return (
    <Icon>
      <rect x="16.5" y="5" width="2.5" height="14" rx="1" />
      <path d="M5 6.2v11.6a1 1 0 0 0 1.55.83l8.25-5.8a1 1 0 0 0 0-1.66L6.55 5.37A1 1 0 0 0 5 6.2z" />
    </Icon>
  );
}

export function ShuffleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
    </svg>
  );
}

/** Three bars that rise and fall while a song plays. */
export function Equalizer() {
  return (
    <span className="eq" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function ControlButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid h-10 w-10 place-items-center rounded-full border border-[#f2c14e]/35 bg-black/40 text-[#f2c14e] transition-colors hover:border-[#f2c14e] hover:text-[#fff2b0] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/**
 * The player. On the song list it follows whatever is playing; on a song's
 * page (`focus`) it plays that song, and says so if another one is playing.
 */
export function SongPanel({ focus }: { focus?: Song }) {
  const player = useSongPlayer();
  const song = focus ?? player.current;
  const live = !!song && player.current?.id === song.id;
  const isPlaying = live && player.playing;
  const length = (live && player.duration) || song?.duration || 0;
  const time = live ? Math.min(player.time, length || player.time) : 0;
  const fill = length ? Math.min(100, (time / length) * 100) : 0;

  const onPlay = () => {
    if (live) player.toggle();
    else if (song) player.playSong(song.id);
    else player.toggle();
  };

  let status = "Nothing playing";
  if (live && player.position) {
    const where = `${player.position.index + 1} of ${player.position.length}`;
    status = `${isPlaying ? (player.mode === "shuffle" ? "Shuffling" : "Playing") : "Paused"} · ${where}`;
  } else if (focus) {
    status = "Ready to play";
  }

  const title = song?.title ?? "";
  const titleClass = "block truncate font-card text-xl font-bold leading-tight text-[#fff2b0] sm:text-2xl";

  return (
    <section aria-label="Song player" className="song-panel">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onPlay}
          disabled={!song && !player.songs.length}
          aria-label={isPlaying ? `Pause ${title}` : song ? `Play ${title}` : "Play every song"}
          className="play-orb"
        >
          {isPlaying ? <PauseIcon className="h-7 w-7" /> : <PlayIcon className="ml-0.5 h-7 w-7" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="eyebrow" aria-live="polite">
            {status}
          </p>
          {song ? (
            focus ? (
              <p className={titleClass}>{song.title}</p>
            ) : (
              <Link to={`/songs/${song.slug}`} className={`${titleClass} hover:underline`}>
                {song.title}
              </Link>
            )
          ) : (
            <p className="text-lg text-[#e9dbb8]">Press play for every song in order, or pick one below.</p>
          )}
          {song?.credit && <p className="truncate text-sm italic text-[#c9b78f]">{song.credit}</p>}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="w-12 text-right font-card text-sm tabular-nums text-[#c9b78f]">{formatDuration(time) || "0:00"}</span>
        <input
          type="range"
          className="song-progress min-w-0 flex-1"
          style={{ "--fill": `${fill}%` } as React.CSSProperties}
          min={0}
          max={Math.max(length, 1)}
          step={1}
          value={time}
          disabled={!live || !length}
          onChange={(e) => player.seek(Number(e.target.value))}
          aria-label={`Seek in ${title || "the song"}`}
          aria-valuetext={`${formatDuration(time) || "0:00"} of ${formatDuration(length) || "unknown"}`}
        />
        {/* Rounded like the stored lengths in the list: a 3.99s song is 0:04 everywhere. */}
        <span className="w-12 font-card text-sm tabular-nums text-[#c9b78f]">{formatDuration(Math.round(length)) || "–:––"}</span>
      </div>

      {(!focus || live) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ControlButton label="Previous song" onClick={player.previous} disabled={!live}>
            <PreviousIcon />
          </ControlButton>
          <ControlButton label="Next song" onClick={player.next} disabled={!live || !player.upNext}>
            <NextIcon />
          </ControlButton>
          <button
            type="button"
            onClick={() => player.setShuffle(player.mode !== "shuffle")}
            aria-pressed={player.mode === "shuffle"}
            className={`flex h-10 items-center gap-2 rounded-full border px-3.5 text-sm transition-colors ${
              player.mode === "shuffle"
                ? "border-[#f2c14e] bg-[#f2c14e]/15 text-[#fff2b0]"
                : "border-[#f2c14e]/35 bg-black/40 text-[#c9b78f] hover:border-[#f2c14e] hover:text-[#f4e6c3]"
            }`}
          >
            <ShuffleIcon className="h-4 w-4" />
            Shuffle
          </button>
          {live && (
            <p className="min-w-0 flex-1 truncate text-right text-sm text-[#c9b78f] max-sm:basis-full max-sm:text-left">
              {player.upNext ? (
                <>
                  Up next:{" "}
                  <Link to={`/songs/${player.upNext.slug}`} className="text-[#f4e6c3] hover:underline">
                    {player.upNext.title}
                  </Link>
                </>
              ) : (
                "The last song"
              )}
            </p>
          )}
        </div>
      )}

      {focus && player.current && !live && (
        <p className="mt-3 text-sm text-[#c9b78f]">
          Now {player.playing ? "playing" : "paused"}:{" "}
          <Link to={`/songs/${player.current.slug}`} className="text-[#f4e6c3] hover:underline">
            {player.current.title}
          </Link>
        </p>
      )}
    </section>
  );
}
