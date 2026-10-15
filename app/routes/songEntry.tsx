import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import type { Route } from "./+types/songEntry";
import { getSongBySlug } from "../backend/api";
import { SongPanel, useSongPlayer } from "../components/SongPlayer";
import { formatDate } from "../lib/lore";
import { songNumber } from "../lib/songs";
import { useDungeonMaster } from "../lib/useDungeonMaster";
import type { SongEntry as SongRecord } from "../types/song";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Songs — Phantos" }];
}

/** A song's page: its player and its lyrics. */
export default function SongEntry() {
  const { slug = "" } = useParams();
  const isDm = useDungeonMaster();
  const player = useSongPlayer();
  const [song, setSong] = useState<SongRecord | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    getSongBySlug(slug)
      .then((record) => {
        if (cancelled) return;
        setSong(record);
        setStatus("ready");
        document.title = `${record.title} — Phantos`;
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus(error?.status === 404 ? "missing" : "error");
      });
    return () => {
      cancelled = true;
    };
  }, [slug, isDm]);

  if (status === "missing" || status === "error") {
    return (
      <main className="mx-auto max-w-2xl px-4 pt-24 text-center">
        <p className="eyebrow">Songs of Phanatos</p>
        <h1 className="font-heading mt-3 text-4xl font-bold gold-text">
          {status === "missing" ? "No such song" : "The songs are unreachable"}
        </h1>
        <p className="mt-4 text-lg text-[#c9b78f]">
          {status === "missing" ? "This song isn't here — it may have been renamed or withdrawn." : "Please try again in a moment."}
        </p>
        <Link to="/songs" className="btn btn-gold mt-8">
          Every song
        </Link>
      </main>
    );
  }

  if (status === "loading" || !song) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 px-4 pt-10 sm:px-6" aria-hidden="true">
        <div className="skeleton h-5 w-40 rounded" />
        <div className="skeleton h-12 w-3/4 rounded" />
        <div className="skeleton h-36 rounded-xl" />
        <div className="skeleton h-[24rem] rounded-xl" />
      </main>
    );
  }

  const ids = player.songs.map((s) => s.id);
  const number = songNumber(ids, song.id);
  const earlier = number > 1 ? player.songs[number - 2] : undefined;
  const later = number > 0 ? player.songs[number] : undefined;

  return (
    <main className="mx-auto max-w-3xl px-4 pb-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="mt-6 text-sm text-[#c9b78f]">
        <Link to="/songs" className="hover:text-[#f4e6c3]">
          Songs
        </Link>
        <span className="mx-2 opacity-50">/</span>
        <span>{song.title}</span>
      </nav>

      <header className="mt-6">
        <p className="eyebrow">
          {number > 0 ? `Song ${number}` : "Song"}
          {song.published ? "" : " · Draft"}
        </p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <h1 className="font-heading min-w-0 text-[clamp(2rem,4.5vw,3.25rem)] font-bold leading-[1.1] gold-text">{song.title}</h1>
          {isDm && (
            <Link to={`/dm/songs/${song.id}`} className="btn btn-gold">
              Edit
            </Link>
          )}
        </div>
        <p className="mt-3 text-[#c9b78f]">
          {song.credit && <span className="italic">{song.credit} · </span>}
          Posted {formatDate(song.created)}
        </p>
      </header>

      <div className="mt-8">
        <SongPanel focus={song} />
      </div>

      <section aria-labelledby="lyrics-heading" className="mt-12">
        <h2 id="lyrics-heading" className="font-heading text-2xl font-bold text-[#f4e6c3] sm:text-3xl">
          Lyrics
        </h2>
        <div className="scroll mt-5 px-6 py-8 sm:px-12 sm:py-12">
          {song.lyrics.trim() ? (
            <div className="lyrics mx-auto max-w-[36rem]">{song.lyrics}</div>
          ) : (
            <p className="text-center italic text-[#5b4527]">No lyrics have been written down for this song.</p>
          )}
        </div>
      </section>

      {(earlier || later) && (
        <nav aria-label="Other songs" className="mt-10 flex flex-wrap justify-between gap-4 border-t border-[#f2c14e]/15 pt-6 text-sm">
          {earlier ? (
            <Link to={`/songs/${earlier.slug}`} className="group text-[#c9b78f] hover:text-[#f4e6c3]">
              <span className="block text-xs uppercase tracking-[0.16em]">← Posted before</span>
              <span className="font-card text-lg text-[#f4e6c3] group-hover:underline">{earlier.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {later && (
            <Link to={`/songs/${later.slug}`} className="group text-right text-[#c9b78f] hover:text-[#f4e6c3]">
              <span className="block text-xs uppercase tracking-[0.16em]">Posted after →</span>
              <span className="font-card text-lg text-[#f4e6c3] group-hover:underline">{later.title}</span>
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
