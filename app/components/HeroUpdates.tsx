import { useRef, useState } from "react";
import { deleteHeroUpdate, errorMessage, saveHeroUpdate } from "~/backend/api";
import { UPDATE_MAX_LENGTH } from "~/lib/heroes";
import { formatDate } from "~/lib/lore";
import type { HeroUpdate } from "~/types/hero";
import LoreMarkdown from "./LoreMarkdown";

interface HeroUpdatesProps {
  heroId: string;
  heroName: string;
  /** null while loading. */
  updates: HeroUpdate[] | null;
  isDm: boolean;
  /** Called after an update is posted, edited or deleted. */
  onChanged: () => Promise<void>;
}

/** The DM's form for posting a new update, or editing one. */
function UpdateForm({
  heroId,
  editing,
  onDone,
}: {
  heroId: string;
  editing: HeroUpdate | null;
  onDone: (changed: boolean) => Promise<void>;
}) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [body, setBody] = useState(editing?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError("");
    try {
      await saveHeroUpdate({ hero: heroId, title: title.trim(), body: body.trim() }, editing?.id);
      setTitle("");
      setBody("");
      await onDone(true);
    } catch (err) {
      setError(errorMessage(err, "The update could not be saved."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="panel space-y-3 p-4 sm:p-5" aria-label={editing ? "Edit update" : "Post an update"}>
      <p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[#f2c14e]">
        {editing ? "Edit update" : "Post an update"}
      </p>
      <div>
        <label htmlFor="update-title" className="field-label">
          Heading <span className="normal-case tracking-normal opacity-70">(optional)</span>
        </label>
        <input
          id="update-title"
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Leaves the Sanctuary"
          className="field"
        />
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="update-body" className="field-label">
            Update
          </label>
          <span className="text-xs text-[#c9b78f]">
            {body.length} / {UPDATE_MAX_LENGTH}
          </span>
        </div>
        <textarea
          id="update-body"
          required
          rows={4}
          maxLength={UPDATE_MAX_LENGTH}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={"What happened? Markdown works: **bold**, [links](/pantheon/rokesh)."}
          className="field leading-relaxed"
        />
      </div>
      {error && (
        <p role="alert" className="rounded border border-[#d9541e]/50 bg-[#7d150c]/30 px-3 py-2 text-sm text-[#ffcfb8]">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy || !body.trim()} className="btn btn-gold">
          {busy && <span className="spinner" aria-hidden="true" />}
          {editing ? "Save changes" : "Post update"}
        </button>
        {editing && (
          <button type="button" onClick={() => onDone(false)} className="btn btn-ghost">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default function HeroUpdates({ heroId, heroName, updates, isDm, onChanged }: HeroUpdatesProps) {
  const [editing, setEditing] = useState<HeroUpdate | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const formSlot = useRef<HTMLDivElement>(null);

  const edit = (update: HeroUpdate) => {
    setEditing(update);
    setError("");
    requestAnimationFrame(() => formSlot.current?.scrollIntoView({ block: "center", behavior: "smooth" }));
  };

  const onDelete = async (update: HeroUpdate) => {
    if (!window.confirm("Delete this update? This can't be undone.")) return;
    setDeleting(update.id);
    setError("");
    try {
      await deleteHeroUpdate(update.id);
      if (editing?.id === update.id) setEditing(null);
      await onChanged();
    } catch (err) {
      setError(errorMessage(err, "The update could not be deleted."));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <section id="updates" aria-labelledby="updates-heading" className="scroll-mt-6">
      <h2 id="updates-heading" className="font-heading text-2xl font-bold text-[#f4e6c3] sm:text-3xl">
        Updates
      </h2>

      <div className="mt-5 space-y-6">
        {isDm && (
          <div ref={formSlot}>
            {/* Keyed so switching between "new" and an edit starts the form afresh. */}
            <UpdateForm
              key={editing?.id ?? "new"}
              heroId={heroId}
              editing={editing}
              onDone={async (changed) => {
                setEditing(null);
                if (changed) await onChanged();
              }}
            />
          </div>
        )}

        {error && (
          <p role="alert" className="rounded border border-[#d9541e]/50 bg-[#7d150c]/30 px-3 py-2 text-sm text-[#ffcfb8]">
            {error}
          </p>
        )}

        {!updates ? (
          <div className="skeleton h-32 rounded-xl" aria-hidden="true" />
        ) : updates.length ? (
          <ol className="space-y-6">
            {updates.map((update) => (
              <li key={update.id}>
                <article className="scroll px-5 py-6 sm:px-10 sm:py-8" aria-label={update.title || `Update of ${formatDate(update.created)}`}>
                  <header className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    {update.title ? (
                      <h3 className="font-heading text-xl font-bold text-[#5a1a0a]">{update.title}</h3>
                    ) : (
                      <span />
                    )}
                    <time dateTime={update.created.replace(" ", "T")} className="text-sm text-[#5b4527]">
                      {formatDate(update.created)}
                    </time>
                  </header>
                  <LoreMarkdown content={update.body} />
                  {isDm && (
                    <div className="mt-5 flex gap-2 border-t border-[#b59a64]/50 pt-3">
                      <button
                        type="button"
                        onClick={() => edit(update)}
                        className="rounded border border-[#8a6d3b] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#5a1a0a] hover:bg-[#8a6d3b]/15"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(update)}
                        disabled={deleting === update.id}
                        className="rounded border border-[#a3301c]/60 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#a3301c] hover:bg-[#a3301c]/10 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </article>
              </li>
            ))}
          </ol>
        ) : (
          <p className="panel p-6 text-center text-[#c9b78f]">
            No updates for {heroName} yet. The story continues at the table.
          </p>
        )}
      </div>
    </section>
  );
}
