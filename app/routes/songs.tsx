import { Link } from "react-router";
import type { Route } from "./+types/songs";
import { Equalizer, PauseIcon, PlayIcon, ShuffleIcon, SongPanel, useSongPlayer } from "../components/SongPlayer";
import { formatDuration } from "../lib/songs";
import { useDungeonMaster } from "../lib/useDungeonMaster";
import type { Song } from "../types/song";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Songs — Phantos" },
    { name: "description", content: "The campaign's songs: play them all in order or shuffled, or one at a time with their lyrics." },
  ];
}

/** One song in the list: its play button, its number in posting order, and a link to its lyrics. */
function TrackRow({ song, number, isDm }: { song: Song; number: number; isDm: boolean }) {
  const player = useSongPlayer();
  const isCurrent = player.current?.id === song.id;
  const isPlaying = isCurrent && player.playing;

  return (
    <li
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors sm:gap-4 sm:px-4 ${
        isCurrent ? "border-[#f2c14e]/70 bg-[#f2c14e]/10" : "border-[#f2c14e]/15 bg-black/25 hover:border-[#f2c14e]/40"
      }`}
      aria-current={isCurrent ? "true" : undefined}
    >
      <button
        type="button"
        onClick={() => (isCurrent ? player.toggle() : player.playSong(song.id))}
        aria-label={isPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
        className="play-orb play-orb--small"
      >
        {isPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="ml-0.5 h-4 w-4" />}
      </button>
      <span className="grid w-7 shrink-0 justify-items-end font-card text-sm tabular-nums text-[#c9b78f]" aria-hidden="true">
        {isPlaying ? <Equalizer /> : number}
      </span>
      <div className="min-w-0 flex-1">
        <Link
          to={`/songs/${song.slug}`}
          className={`block truncate font-card text-lg font-bold leading-snug hover:underline ${isCurrent ? "text-[#fff2b0]" : "text-[#f4e6c3]"}`}
        >
          {song.title}
        </Link>
        {song.credit && <p className="truncate text-sm italic text-[#c9b78f]">{song.credit}</p>}
      </div>
      {!song.published && (
        <span className="shrink-0 rounded-sm bg-[#7d150c]/60 px-1.5 py-px text-[0.65rem] font-bold uppercase tracking-wider text-[#ffcfb8]">
          Draft
        </span>
      )}
      <span className="shrink-0 font-card text-sm tabular-nums text-[#c9b78f]">{formatDuration(song.duration)}</span>
      {isDm && (
        <Link to={`/dm/songs/${song.id}`} className="btn btn-ghost !px-2.5 !py-1 !text-[0.65rem] max-sm:hidden">
          Edit
        </Link>
      )}
    </li>
  );
}

export default function Songs() {
  const isDm = useDungeonMaster();
  const player = useSongPlayer();
  const { songs, status } = player;

  return (
    <main className="mx-auto max-w-4xl px-4 pb-10 sm:px-6">
      <header className="mx-auto mt-10 max-w-3xl text-center">
        <p className="eyebrow">Songs of Phanatos</p>
        <h1 className="font-heading mt-2 text-4xl font-bold text-[#f4e6c3] sm:text-5xl">Songs</h1>
        <p className="mt-3 text-lg text-[#c9b78f]">
          The campaign's music. Play one and the songs posted after it follow; shuffle to hear them all in any order.
          Open a song for its lyrics.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={player.shuffleAll} disabled={!songs.length} className="btn btn-gold">
          <ShuffleIcon className="h-4 w-4" />
          Shuffle all
        </button>
        <button type="button" onClick={player.playAll} disabled={!songs.length} className="btn btn-ghost">
          <PlayIcon className="h-4 w-4" />
          Play in order
        </button>
        {isDm && (
          <Link to="/dm/songs/new" className="btn btn-ghost">
            + New Song
          </Link>
        )}
      </div>

      <div className="mt-8">
        <SongPanel />
      </div>

      <section aria-labelledby="songs-heading" className="mt-10">
        <div className="flex items-baseline justify-between gap-3 border-b border-[#f2c14e]/20 pb-3">
          <h2 id="songs-heading" className="font-heading text-2xl font-bold text-[#f4e6c3]">
            Every song
          </h2>
          {status === "ready" && (
            <p className="text-sm text-[#c9b78f]">
              {songs.length} {songs.length === 1 ? "song" : "songs"} · in the order they were posted
            </p>
          )}
        </div>

        <div className="mt-5" aria-live="polite">
          {status === "error" ? (
            <p className="panel p-6 text-center text-[#c9b78f]">The songs could not be reached. Please try again.</p>
          ) : status === "loading" ? (
            <ul className="space-y-2" aria-hidden="true">
              {Array.from({ length: 4 }, (_, i) => (
                <li key={i} className="skeleton h-16 rounded-lg" />
              ))}
            </ul>
          ) : songs.length ? (
            <ol className="space-y-2">
              {songs.map((song, i) => (
                <TrackRow key={song.id} song={song} number={i + 1} isDm={isDm} />
              ))}
            </ol>
          ) : (
            <div className="panel p-8 text-center">
              <p className="font-heading text-xl font-bold text-[#f4e6c3]">No songs yet.</p>
              <p className="mt-2 text-[#c9b78f]">
                {isDm ? "Add the first one with its lyrics and MP3." : "The bards are still tuning up."}
              </p>
              {isDm && (
                <Link to="/dm/songs/new" className="btn btn-gold mt-5">
                  + New Song
                </Link>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
