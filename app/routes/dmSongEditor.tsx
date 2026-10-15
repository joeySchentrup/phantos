import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import type { Route } from "./+types/dmSongEditor";
import { createSong, deleteSong, errorMessage, getSongById, isDungeonMaster, songAudioUrl, updateSong } from "../backend/api";
import { audioDuration, formatDuration } from "../lib/songs";
import type { SongEntry } from "../types/song";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Edit Song — Phantos" }, { name: "robots", content: "noindex" }];
}

interface Draft {
  title: string;
  slug: string;
  credit: string;
  lyrics: string;
  published: boolean;
}

const EMPTY: Draft = { title: "", slug: "", credit: "", lyrics: "", published: true };

/** Matches the `audio` field's limit. */
const MAX_MB = 50;

/** "the-ember-ballad.mp3" → "The Ember Ballad", for a title the DM hasn't typed yet. */
function titleFromFilename(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function DmSongEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [record, setRecord] = useState<SongEntry | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">(isNew ? "ready" : "loading");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const lyricsImport = useRef<HTMLInputElement>(null);

  // Only DMs belong here.
  useEffect(() => {
    if (!isDungeonMaster()) navigate("/dm", { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (isNew) {
      setDraft(EMPTY);
      setRecord(null);
      setStatus("ready");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    getSongById(id)
      .then((song) => {
        if (cancelled) return;
        setRecord(song);
        setDraft({ title: song.title, slug: song.slug, credit: song.credit, lyrics: song.lyrics, published: song.published });
        setSeconds(song.duration);
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("missing"));
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const preview = useMemo(() => (audioFile ? URL.createObjectURL(audioFile) : ""), [audioFile]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  const onAudio = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setError("");
    if (!file) return;
    if (!/\.mp3$/i.test(file.name)) {
      setError(`${file.name} isn't an MP3.`);
      event.target.value = "";
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`${file.name} is ${Math.round(file.size / 1024 / 1024)} MB; a song can be ${MAX_MB} MB at most.`);
      event.target.value = "";
      return;
    }
    setAudioFile(file);
    setDraft((current) => (current.title.trim() ? current : { ...current, title: titleFromFilename(file.name) }));
    setDirty(true);
    setSeconds(await audioDuration(file));
  };

  const onLyricsFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    set("lyrics", await file.text());
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isNew && !audioFile) {
      setError("Choose the song's MP3.");
      return;
    }
    setSaving(true);
    setError("");

    const data = new FormData();
    data.append("title", draft.title.trim());
    data.append("slug", draft.slug.trim());
    data.append("credit", draft.credit.trim());
    data.append("lyrics", draft.lyrics);
    data.append("published", String(draft.published));
    if (audioFile) {
      data.append("audio", audioFile);
      data.append("duration", String(seconds));
    }

    try {
      const saved = isNew ? await createSong(data) : await updateSong(id!, data);
      setDirty(false);
      navigate(`/songs/${saved.slug}`);
    } catch (err) {
      setError(errorMessage(err, "The song could not be saved."));
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!record) return;
    if (!window.confirm(`Delete “${record.title}” and its MP3? This can't be undone.`)) return;
    setSaving(true);
    try {
      await deleteSong(record.id);
      setDirty(false);
      navigate("/songs");
    } catch (err) {
      setError(errorMessage(err, "The song could not be deleted."));
      setSaving(false);
    }
  };

  if (status === "missing") {
    return (
      <main className="mx-auto max-w-xl px-4 pt-24 text-center">
        <h1 className="font-heading text-3xl font-bold gold-text">No such song</h1>
        <Link to="/songs" className="btn btn-gold mt-8">
          Back to the songs
        </Link>
      </main>
    );
  }

  const listenTo = preview || (record ? songAudioUrl(record) : "");

  return (
    <main className="mx-auto max-w-4xl px-4 pb-10 sm:px-6">
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/songs" className="text-sm text-[#c9b78f] hover:text-[#f4e6c3]">
            ← The Songs
          </Link>
          <h1 className="font-heading mt-2 text-3xl font-bold text-[#f4e6c3] sm:text-4xl">{isNew ? "New Song" : "Edit Song"}</h1>
        </div>
        {record && (
          <Link to={`/songs/${record.slug}`} className="btn btn-ghost">
            View song
          </Link>
        )}
      </div>

      {status === "loading" ? (
        <div className="skeleton mt-8 h-[36rem] rounded-xl" />
      ) : (
        <form onSubmit={onSave} className="panel mt-8 space-y-5 p-5 sm:p-6">
          <div>
            <span className="field-label">MP3</span>
            <div className="flex flex-wrap items-center gap-3">
              <label className="btn btn-ghost !px-3 !py-1.5 !text-[0.7rem]">
                {audioFile || record ? "Replace MP3" : "Choose MP3"}
                <input type="file" accept=".mp3,audio/mpeg" className="sr-only" onChange={onAudio} />
              </label>
              <span className="min-w-0 truncate text-sm text-[#c9b78f]">
                {audioFile ? audioFile.name : record ? "The song's current MP3" : `Up to ${MAX_MB} MB`}
                {seconds > 0 && ` · ${formatDuration(seconds)}`}
              </span>
            </div>
            {listenTo && (
              <audio controls preload="metadata" src={listenTo} className="mt-3 w-full" aria-label="Listen to the MP3" />
            )}
          </div>

          <div>
            <label htmlFor="song-title" className="field-label">
              Title
            </label>
            <input
              id="song-title"
              required
              maxLength={200}
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              className="field font-card !text-xl"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="song-credit" className="field-label">
                Credit <span className="normal-case tracking-normal opacity-70">(optional)</span>
              </label>
              <input
                id="song-credit"
                maxLength={200}
                value={draft.credit}
                onChange={(e) => set("credit", e.target.value)}
                placeholder="e.g. Sung by Lisette"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="song-slug" className="field-label">
                URL name <span className="normal-case tracking-normal opacity-70">(optional)</span>
              </label>
              <input
                id="song-slug"
                maxLength={200}
                value={draft.slug}
                onChange={(e) => set("slug", e.target.value)}
                placeholder="made from the title"
                className="field"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
              <label htmlFor="song-lyrics" className="field-label !mb-0">
                Lyrics <span className="normal-case tracking-normal opacity-70">(line breaks are kept)</span>
              </label>
              <button type="button" onClick={() => lyricsImport.current?.click()} className="btn btn-ghost !px-3 !py-1 !text-[0.7rem]">
                Import lyrics file
              </button>
              <input ref={lyricsImport} type="file" accept=".txt,.md,text/plain,text/markdown" onChange={onLyricsFile} className="hidden" />
            </div>
            <textarea
              id="song-lyrics"
              rows={18}
              maxLength={100000}
              value={draft.lyrics}
              onChange={(e) => set("lyrics", e.target.value)}
              placeholder={"Verse one…\n\nChorus…"}
              className="field font-serif !text-[1rem] leading-relaxed"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={draft.published}
              onChange={(e) => set("published", e.target.checked)}
              className="h-5 w-5 accent-[#f2c14e]"
            />
            <span>
              <span className="font-semibold text-[#f4e6c3]">Published</span>
              <span className="block text-sm text-[#c9b78f]">Unpublished songs are drafts only Dungeon Masters can see or play.</span>
            </span>
          </label>

          {error && (
            <p role="alert" className="rounded border border-[#d9541e]/50 bg-[#7d150c]/30 px-3 py-2 text-sm text-[#ffcfb8]">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-[#f2c14e]/15 pt-5">
            <button type="submit" disabled={saving} className="btn btn-gold">
              {saving && <span className="spinner" aria-hidden="true" />}
              {saving ? (audioFile ? "Uploading…" : "Saving…") : isNew ? "Add the song" : "Save changes"}
            </button>
            <Link to={record ? `/songs/${record.slug}` : "/songs"} className="btn btn-ghost">
              Cancel
            </Link>
            {record && (
              <button type="button" onClick={onDelete} disabled={saving} className="btn btn-danger ml-auto">
                Delete
              </button>
            )}
          </div>
        </form>
      )}
    </main>
  );
}
