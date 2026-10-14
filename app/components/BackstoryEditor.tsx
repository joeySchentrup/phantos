import { useEffect, useState } from "react";
import { errorMessage, saveBackstory } from "~/backend/api";
import type { Hero } from "~/types/hero";
import LoreMarkdown from "./LoreMarkdown";

interface BackstoryEditorProps {
  hero: Hero;
  /** Called with the saved hero, or with null when the edit is cancelled. */
  onDone: (saved: Hero | null) => void;
}

/**
 * A player's editor for their hero's backstory, in place of it on the hero's
 * page. The backstory is all a player can change; the rest is the DM's.
 */
export default function BackstoryEditor({ hero, onDone }: BackstoryEditorProps) {
  const [text, setText] = useState(hero.backstory);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = text !== hero.backstory;

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      onDone(await saveBackstory(hero.id, text));
    } catch (err) {
      setError(errorMessage(err, "The backstory could not be saved."));
      setBusy(false);
    }
  };

  const onCancel = () => {
    if (dirty && !window.confirm("Discard your changes to the backstory?")) return;
    onDone(null);
  };

  return (
    <form onSubmit={onSubmit} className="panel mt-5 space-y-3 p-4 sm:p-5" aria-label="Edit backstory">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <span className="field-label !mb-0">Backstory (Markdown)</span>
        <div role="tablist" aria-label="Editor mode" className="flex rounded-md border border-[#f2c14e]/30 p-0.5">
          {(["write", "preview"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={tab === mode}
              onClick={() => setTab(mode)}
              className={`rounded px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                tab === mode ? "bg-[#f2c14e] text-[#2a1404]" : "text-[#c9b78f] hover:text-[#f4e6c3]"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {tab === "write" ? (
        <textarea
          aria-label="Backstory"
          rows={18}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Where they came from and what set them on the road.\n\nLink to the lore with [Rokesh](/pantheon/rokesh)."}
          className="field font-mono !text-[0.9rem] leading-relaxed"
        />
      ) : (
        <div className="scroll max-h-[40rem] overflow-y-auto px-5 py-6 sm:px-8">
          {text.trim() ? (
            <LoreMarkdown content={text} title={hero.name} />
          ) : (
            <p className="italic text-[#5b4527]">Nothing to preview yet.</p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="rounded border border-[#d9541e]/50 bg-[#7d150c]/30 px-3 py-2 text-sm text-[#ffcfb8]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy || !dirty} className="btn btn-gold">
          {busy && <span className="spinner" aria-hidden="true" />}
          {busy ? "Saving…" : "Save backstory"}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="btn btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  );
}
