import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import { listSongs } from "../backend/api";
import { SongPlayerProvider } from "../components/SongPlayer";
import { useDungeonMaster } from "../lib/useDungeonMaster";
import type { Song } from "../types/song";

/**
 * Wraps the song list and every song's page in one player, so a song keeps
 * playing from the list into its lyrics and on to the next. Leaving the
 * section unmounts the player, and the music stops.
 */
export default function SongsLayout() {
  const isDm = useDungeonMaster();
  const [songs, setSongs] = useState<Song[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  // Drafts appear for the DM, so read the list again when they sign in or out.
  useEffect(() => {
    let cancelled = false;
    listSongs()
      .then((items) => {
        if (cancelled) return;
        setSongs(items);
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, [isDm]);

  return (
    <SongPlayerProvider songs={songs} status={status}>
      <Outlet />
    </SongPlayerProvider>
  );
}
