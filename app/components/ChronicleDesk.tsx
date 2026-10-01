import { useEffect, useRef, useState } from "react";
import { deleteEra, deleteTimelinePoint, errorMessage, saveEra, saveTimelinePoint } from "~/backend/api";
import { formatEraRange, formatYear, POINT_MAX_LENGTH } from "~/lib/chronicle";
import type { Era, EraInput, TimelinePoint, TimelinePointInput } from "~/types/chronicle";
import YearField from "./YearField";

interface ChronicleDeskProps {
  eras: Era[];
  points: TimelinePoint[];
  /** A point picked on the timeline; it opens in the form. */
  picked: TimelinePoint | null;
  /** Called after anything is saved or deleted, to redraw the timeline. */
  onChanged: () => Promise<void>;
}

const EMPTY_POINT: TimelinePointInput = { text: "", year: 0, circa: false };
const EMPTY_ERA: EraInput = { name: "", start_year: 0, end_year: 0, circa: false, description: "" };

function Message({ error }: { error: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded border border-[#d9541e]/50 bg-[#7d150c]/30 px-3 py-2 text-sm text-[#ffcfb8]">
      {error}
    </p>
  );
}

function CircaBox({ checked, onChange, children }: { checked: boolean; onChange: (checked: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-[#c9b78f]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#f2c14e]" />
      {children}
    </label>
  );
}

function RowActions({ onEdit, onDelete, busy, deleteLabel }: { onEdit: () => void; onDelete: () => void; busy: boolean; deleteLabel: string }) {
  return (
    <span className="flex shrink-0 gap-2">
      <button type="button" onClick={onEdit} className="btn btn-ghost !px-2.5 !py-1 !text-[0.65rem]">
        Edit
      </button>
      <button type="button" onClick={onDelete} disabled={busy} className="btn btn-ghost !px-2.5 !py-1 !text-[0.65rem] !text-[#ffb3a1]" aria-label={deleteLabel}>
        Delete
      </button>
    </span>
  );
}

function PointsPanel({ points, picked, onChanged }: Pick<ChronicleDeskProps, "points" | "picked" | "onChanged">) {
  const [draft, setDraft] = useState<TimelinePointInput>(EMPTY_POINT);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const form = useRef<HTMLFormElement>(null);

  const edit = (point: TimelinePoint) => {
    setEditing(point.id);
    setDraft({ text: point.text, year: point.year, circa: point.circa });
    setError("");
  };
  const reset = () => {
    setEditing(null);
    setDraft(EMPTY_POINT);
    setError("");
  };

  useEffect(() => {
    if (!picked) return;
    edit(picked);
    form.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    form.current?.querySelector("textarea")?.focus({ preventScroll: true });
  }, [picked]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await saveTimelinePoint({ ...draft, text: draft.text.trim() }, editing ?? undefined);
      await onChanged();
      reset();
    } catch (err) {
      setError(errorMessage(err, "The point could not be saved."));
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (point: TimelinePoint) => {
    if (!window.confirm(`Remove “${point.text}” from the timeline?`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteTimelinePoint(point.id);
      await onChanged();
      if (editing === point.id) reset();
    } catch (err) {
      setError(errorMessage(err, "The point could not be removed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="points-heading" className="panel min-w-0 p-5 sm:p-6">
      <h3 id="points-heading" className="font-heading text-xl font-bold text-[#f4e6c3]">
        Points
        <span className="ml-2 text-sm font-normal text-[#c9b78f]">{points.length} on the timeline</span>
      </h3>
      <p className="mt-1 text-sm text-[#c9b78f]">
        A line or two pinned to a year. Anything longer than {POINT_MAX_LENGTH} characters belongs in lore.
      </p>

      <form ref={form} onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="point-text" className="field-label">
              {editing ? "Edit point" : "New point"}
            </label>
            <span className="text-xs text-[#c9b78f]" aria-hidden="true">
              {draft.text.length}/{POINT_MAX_LENGTH}
            </span>
          </div>
          <textarea
            id="point-text"
            rows={3}
            required
            maxLength={POINT_MAX_LENGTH}
            value={draft.text}
            onChange={(e) => setDraft({ ...draft, text: e.target.value })}
            placeholder="What happened?"
            className="field text-[0.95rem] leading-relaxed"
          />
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-44">
            <YearField id="point-year" label="Year" year={draft.year} onChange={(year) => setDraft({ ...draft, year })} required />
          </div>
          <div className="pb-2.5">
            <CircaBox checked={draft.circa} onChange={(circa) => setDraft({ ...draft, circa })}>
              Circa
            </CircaBox>
          </div>
        </div>
        <Message error={error} />
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className="btn btn-gold">
            {busy && <span className="spinner" aria-hidden="true" />}
            {editing ? "Save point" : "Add point"}
          </button>
          {editing && (
            <button type="button" onClick={reset} disabled={busy} className="btn btn-ghost">
              Cancel
            </button>
          )}
        </div>
      </form>

      <ul className="mt-5 max-h-80 divide-y divide-[#f2c14e]/10 overflow-y-auto border-t border-[#f2c14e]/15 pr-1">
        {points.map((point) => (
          <li key={point.id} className={`flex flex-wrap items-start justify-end gap-x-3 gap-y-2 py-2.5 ${editing === point.id ? "bg-[#f2c14e]/5" : ""}`}>
            <span className="w-24 shrink-0 pt-0.5 text-xs font-semibold text-[#f2c14e]">{formatYear(point.year, point.circa)}</span>
            <span className="min-w-0 flex-1 basis-40 text-[0.95rem] leading-snug text-[#e9dbb8]">{point.text}</span>
            <RowActions onEdit={() => edit(point)} onDelete={() => onDelete(point)} busy={busy} deleteLabel={`Delete: ${point.text}`} />
          </li>
        ))}
        {!points.length && <li className="py-6 text-center text-[#c9b78f]">No points yet.</li>}
      </ul>
    </section>
  );
}

function ErasPanel({ eras, onChanged }: Pick<ChronicleDeskProps, "eras" | "onChanged">) {
  const [draft, setDraft] = useState<EraInput>(EMPTY_ERA);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const edit = (era: Era) => {
    setEditing(era.id);
    setDraft({ name: era.name, start_year: era.start_year, end_year: era.end_year, circa: era.circa, description: era.description });
    setError("");
  };
  const reset = () => {
    setEditing(null);
    setDraft(EMPTY_ERA);
    setError("");
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (draft.start_year && draft.end_year && draft.end_year <= draft.start_year) {
      setError("An era has to end after it begins.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await saveEra({ ...draft, name: draft.name.trim(), description: draft.description.trim() }, editing ?? undefined);
      await onChanged();
      reset();
    } catch (err) {
      setError(errorMessage(err, "The era could not be saved."));
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (era: Era) => {
    if (!window.confirm(`Remove the era “${era.name}” from the timeline?`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteEra(era.id);
      await onChanged();
      if (editing === era.id) reset();
    } catch (err) {
      setError(errorMessage(err, "The era could not be removed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="eras-heading" className="panel min-w-0 p-5 sm:p-6">
      <h3 id="eras-heading" className="font-heading text-xl font-bold text-[#f4e6c3]">
        Eras
        <span className="ml-2 text-sm font-normal text-[#c9b78f]">{eras.length} on the timeline</span>
      </h3>
      <p className="mt-1 text-sm text-[#c9b78f]">Named spans drawn as bands across the top. Eras may overlap.</p>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="era-name" className="field-label">
            {editing ? "Edit era" : "New era"}
          </label>
          <input
            id="era-name"
            required
            maxLength={80}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="e.g. Age of Concord"
            className="field"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <YearField
            id="era-start"
            label={<>Begins <span className="normal-case tracking-normal opacity-70">(blank: the beginning)</span></>}
            year={draft.start_year}
            onChange={(start_year) => setDraft({ ...draft, start_year })}
          />
          <YearField
            id="era-end"
            label={<>Ends <span className="normal-case tracking-normal opacity-70">(blank: still going)</span></>}
            year={draft.end_year}
            onChange={(end_year) => setDraft({ ...draft, end_year })}
          />
        </div>
        <CircaBox checked={draft.circa} onChange={(circa) => setDraft({ ...draft, circa })}>
          Circa: the years are approximate
        </CircaBox>
        <div>
          <label htmlFor="era-description" className="field-label">
            Description <span className="normal-case tracking-normal opacity-70">(optional)</span>
          </label>
          <textarea
            id="era-description"
            rows={2}
            maxLength={255}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className="field text-[0.95rem] leading-relaxed"
          />
        </div>
        <Message error={error} />
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className="btn btn-gold">
            {busy && <span className="spinner" aria-hidden="true" />}
            {editing ? "Save era" : "Add era"}
          </button>
          {editing && (
            <button type="button" onClick={reset} disabled={busy} className="btn btn-ghost">
              Cancel
            </button>
          )}
        </div>
      </form>

      <ul className="mt-5 max-h-80 divide-y divide-[#f2c14e]/10 overflow-y-auto border-t border-[#f2c14e]/15 pr-1">
        {eras.map((era) => (
          <li key={era.id} className={`flex flex-wrap items-start justify-end gap-x-3 gap-y-2 py-2.5 ${editing === era.id ? "bg-[#f2c14e]/5" : ""}`}>
            <span className="min-w-0 flex-1 basis-40">
              <span className="block font-semibold text-[#f4e6c3]">{era.name}</span>
              <span className="block text-xs font-semibold text-[#f2c14e]">{formatEraRange(era)}</span>
            </span>
            <RowActions onEdit={() => edit(era)} onDelete={() => onDelete(era)} busy={busy} deleteLabel={`Delete the era ${era.name}`} />
          </li>
        ))}
        {!eras.length && <li className="py-6 text-center text-[#c9b78f]">No eras yet.</li>}
      </ul>
    </section>
  );
}

/** The Dungeon Master's tools under the timeline: add and edit eras and points. */
export default function ChronicleDesk({ eras, points, picked, onChanged }: ChronicleDeskProps) {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <PointsPanel points={points} picked={picked} onChanged={onChanged} />
      <ErasPanel eras={eras} onChanged={onChanged} />
    </div>
  );
}
