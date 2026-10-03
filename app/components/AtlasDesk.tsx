import { useEffect, useRef, useState } from "react";
import { errorMessage } from "~/backend/api";
import {
  DEFAULT_SPREAD,
  FEATURE_KINDS,
  PLACE_KINDS,
  SPREAD_MAX,
  SPREAD_MIN,
  TINTS,
  clampSpread,
  isRound,
  placeRealm,
  reshape,
  type AtlasEdit,
  type AtlasSelection,
} from "~/lib/atlas";
import type { Feature, FeatureKind, Place, PlaceKind, Realm } from "~/types/atlas";
import type { LoreSummary } from "~/types/lore";

interface AtlasDeskProps {
  places: Place[];
  realms: Realm[];
  features: Feature[];
  /** Every lore entry, drafts included: the cards a place can draw. */
  lore: LoreSummary[];
  selection: AtlasSelection | null;
  onSelect: (selection: AtlasSelection | null) => void;
  /** Saves a record as its form has it, and redraws the chart. */
  onSave: (edit: AtlasEdit) => Promise<void>;
  /** Removes the record from the chart. */
  onDelete: (selection: AtlasSelection) => Promise<void>;
}

interface PanelProps<T> {
  /** The record of this panel's kind that is selected on the chart, if one is. */
  selected: T | undefined;
  onSelect: AtlasDeskProps["onSelect"];
  onSave: AtlasDeskProps["onSave"];
  onDelete: AtlasDeskProps["onDelete"];
  /** Says what just happened, under the desk. */
  onNotice: (notice: string) => void;
}

function Message({ error }: { error: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-sm text-[#ffb3a1]">
      {error}
    </p>
  );
}

function DraftTag() {
  return (
    <span className="font-heading flex-none rounded-sm border border-[#d9541e]/60 bg-[#7d150c]/50 px-1.5 py-px text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#ffcfb8]">
      Draft
    </span>
  );
}

function PublishedBox({ checked, disabled, onChange, what }: { checked: boolean; disabled: boolean; onChange: (checked: boolean) => void; what: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-[#c9b78f]">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#f2c14e]" />
      Published <span className="opacity-70">(unpublished {what} only to Dungeon Masters)</span>
    </label>
  );
}

function EditButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="btn btn-ghost flex-none !px-2.5 !py-1 !text-[0.65rem]" aria-label={label}>
      Edit
    </button>
  );
}

/** The buttons under every form: Save, and for a selected record Done and Delete. */
function FormActions({ editing, busy, onDone, onDelete }: { editing: boolean; busy: boolean; onDone: () => void; onDelete: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="submit" disabled={!editing || busy} className="btn btn-gold">
        {busy && <span className="spinner" aria-hidden="true" />}
        Save
      </button>
      {editing && (
        <>
          <button type="button" onClick={onDone} disabled={busy} className="btn btn-ghost">
            Done
          </button>
          <button type="button" onClick={onDelete} disabled={busy} className="btn btn-danger ml-auto">
            Delete
          </button>
        </>
      )}
    </div>
  );
}

/** Busy and error state for a panel, and a wrapper that keeps them in step with its saves and deletes. */
function useDeskWork(onNotice: (notice: string) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (work: () => Promise<void>, done: string, failure: string) => {
    setBusy(true);
    setError("");
    onNotice("");
    try {
      await work();
      onNotice(done);
    } catch (err) {
      setError(errorMessage(err, failure));
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, setError, run };
}

const ROW = "flex items-center gap-2.5 border-b border-[#f2c14e]/10 py-2";

// ---------------------------------------------------------------------------
// Places
// ---------------------------------------------------------------------------

const EMPTY_PLACE = { name: "", kind: "city" as PlaceKind, lore: "", published: false };

function PlacesPanel({ places, realms, lore, selected, onSelect, onSave, onDelete, onNotice }: PanelProps<Place> & Pick<AtlasDeskProps, "places" | "realms" | "lore">) {
  const [draft, setDraft] = useState(EMPTY_PLACE);
  const { busy, error, setError, run } = useDeskWork(onNotice);
  const name = useRef<HTMLInputElement>(null);
  const realmOf = (place: Place) => placeRealm(place, realms);

  // The form follows the selection, not every drag of the pin.
  useEffect(() => {
    setDraft(selected ? { name: selected.name, kind: selected.kind, lore: selected.lore, published: selected.published } : EMPTY_PLACE);
    setError("");
  }, [selected?.id]);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    run(
      () => onSave({ type: "place", record: { ...selected, ...draft, name: draft.name.trim() || selected.name } }),
      "The place was saved.",
      "The place could not be saved."
    );
  };

  const remove = () => {
    if (!selected || !window.confirm(`Remove “${selected.name}” from the chart?`)) return;
    run(() => onDelete({ type: "place", id: selected.id }), "Removed from the chart.", "The place could not be removed.");
  };

  return (
    <section aria-labelledby="places-heading" className="panel min-w-0 p-5 sm:p-6">
      <h3 id="places-heading" className="font-heading text-xl font-bold text-[#f4e6c3]">
        Places
        <span className="ml-2 font-serif text-sm font-normal text-[#c9b78f]">{places.length} on the chart</span>
      </h3>
      <p className="mt-1 text-sm text-[#c9b78f]">
        A point on the chart that draws a lore card. Choose “Add a place” and click the chart to add one.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="place-name" className="field-label">
            {selected ? `Edit ${selected.name}` : "New place"}
          </label>
          <input
            id="place-name"
            ref={name}
            required
            maxLength={120}
            disabled={!selected}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="e.g. Heraklion, Keralu"
            className="field font-card !text-xl"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="place-kind" className="field-label">
              Kind
            </label>
            <select
              id="place-kind"
              disabled={!selected}
              value={draft.kind}
              onChange={(e) => setDraft({ ...draft, kind: e.target.value as PlaceKind })}
              className="field"
            >
              {(Object.keys(PLACE_KINDS) as PlaceKind[]).map((kind) => (
                <option key={kind} value={kind}>
                  {PLACE_KINDS[kind].label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="place-position" className="field-label">
              On the chart
            </label>
            <input
              id="place-position"
              readOnly
              disabled={!selected}
              value={
                selected
                  ? [`x ${selected.x}`, `y ${selected.y}`, realmOf(selected)].filter(Boolean).join(" · ")
                  : "Add a place, then click the chart"
              }
              className="field"
            />
          </div>
        </div>
        <div>
          <label htmlFor="place-lore" className="field-label">
            Lore card <span className="normal-case tracking-normal opacity-70">(the card this place draws)</span>
          </label>
          <select
            id="place-lore"
            disabled={!selected}
            value={draft.lore}
            onChange={(e) => setDraft({ ...draft, lore: e.target.value })}
            className="field"
          >
            <option value="">— No card yet —</option>
            {lore.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.title}
                {!entry.published && " (draft)"}
              </option>
            ))}
          </select>
        </div>
        <PublishedBox checked={draft.published} disabled={!selected} onChange={(published) => setDraft({ ...draft, published })} what="places show" />
        <Message error={error} />
        <FormActions editing={!!selected} busy={busy} onDone={() => onSelect(null)} onDelete={remove} />
      </form>

      <ul className="mt-5 border-t border-[#f2c14e]/15">
        {places.map((place) => (
          <li key={place.id} className={`${ROW} ${selected?.id === place.id ? "bg-[#f2c14e]/5" : ""}`}>
            <span className="w-[18px] flex-none text-center text-[#e9dbb8]" aria-hidden="true">
              {PLACE_KINDS[place.kind]?.glyph}
            </span>
            <button type="button" className="atlas-row" onClick={() => onSelect({ type: "place", id: place.id })}>
              {place.name}{" "}
              <span className="text-xs text-[#c9b78f]">
                · {[PLACE_KINDS[place.kind]?.label, realmOf(place)].filter(Boolean).join(", ")}
              </span>
            </button>
            {!place.published && <DraftTag />}
            <EditButton
              label={`Edit ${place.name}`}
              onClick={() => {
                onSelect({ type: "place", id: place.id });
                name.current?.focus();
              }}
            />
          </li>
        ))}
        {!places.length && <li className="py-6 text-center text-[#c9b78f]">No places yet.</li>}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Realms
// ---------------------------------------------------------------------------

const EMPTY_REALM = { name: "", standing: "", tone: 0, published: false };

function RealmsPanel({ realms, selected, onSelect, onSave, onDelete, onNotice }: PanelProps<Realm> & Pick<AtlasDeskProps, "realms">) {
  const [draft, setDraft] = useState(EMPTY_REALM);
  const { busy, error, setError, run } = useDeskWork(onNotice);
  const name = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(selected ? { name: selected.name, standing: selected.standing, tone: selected.tone, published: selected.published } : EMPTY_REALM);
    setError("");
  }, [selected?.id]);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    run(
      () => onSave({ type: "realm", record: { ...selected, ...draft, name: draft.name.trim() || selected.name, standing: draft.standing.trim() } }),
      "The realm was saved.",
      "The realm could not be saved."
    );
  };

  const remove = () => {
    if (!selected || !window.confirm(`Remove the realm “${selected.name}” from the chart?`)) return;
    run(() => onDelete({ type: "realm", id: selected.id }), "Removed from the chart.", "The realm could not be removed.");
  };

  return (
    <section aria-labelledby="realms-heading" className="panel min-w-0 p-5 sm:p-6">
      <h3 id="realms-heading" className="font-heading text-xl font-bold text-[#f4e6c3]">
        Realms
        <span className="ml-2 font-serif text-sm font-normal text-[#c9b78f]">{realms.length} on the chart</span>
      </h3>
      <p className="mt-1 text-sm text-[#c9b78f]">
        The political chart. Choose “Draw a realm” and click its corners. On the chart, drag a corner to move a border,
        drag a + between two corners to add one, and double-click a corner to remove it. Drag the name to move it;
        double-click it to centre it again.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="realm-name" className="field-label">
            {selected ? `Edit ${selected.name}` : "New realm"}
          </label>
          <input
            id="realm-name"
            ref={name}
            required
            maxLength={120}
            disabled={!selected}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="e.g. Hossari"
            className="field font-card !text-xl"
          />
        </div>
        <div>
          <label htmlFor="realm-standing" className="field-label">
            Standing <span className="normal-case tracking-normal opacity-70">(shown when a reader selects the realm)</span>
          </label>
          <input
            id="realm-standing"
            maxLength={160}
            disabled={!selected}
            value={draft.standing}
            onChange={(e) => setDraft({ ...draft, standing: e.target.value })}
            placeholder="e.g. Queendom of Hossari, Twilight Stewardship Zone"
            className="field"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="realm-tone" className="field-label">
              Tint
            </label>
            <select
              id="realm-tone"
              disabled={!selected}
              value={draft.tone}
              onChange={(e) => setDraft({ ...draft, tone: Number(e.target.value) })}
              className="field"
            >
              {TINTS.map((tint, tone) => (
                <option key={tint} value={tone}>
                  {tint}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="realm-corners" className="field-label">
              Corners
            </label>
            <input
              id="realm-corners"
              readOnly
              disabled={!selected}
              value={selected ? `${selected.points.length} corners · drag them on the chart` : "Draw a realm, then click the chart"}
              className="field"
            />
          </div>
        </div>
        <PublishedBox checked={draft.published} disabled={!selected} onChange={(published) => setDraft({ ...draft, published })} what="realms show" />
        <Message error={error} />
        <FormActions editing={!!selected} busy={busy} onDone={() => onSelect(null)} onDelete={remove} />
      </form>

      <ul className="mt-5 max-h-[300px] overflow-y-auto border-t border-[#f2c14e]/15 pr-1">
        {realms.map((realm) => (
          <li key={realm.id} className={`${ROW} ${selected?.id === realm.id ? "bg-[#f2c14e]/5" : ""}`}>
            <span className="atlas-swatch" data-tone={realm.tone} />
            <button type="button" className="atlas-row truncate" onClick={() => onSelect({ type: "realm", id: realm.id })}>
              {realm.name} <span className="text-xs text-[#c9b78f]">· {realm.standing || "No standing recorded"}</span>
            </button>
            {!realm.published && <DraftTag />}
            <EditButton
              label={`Edit ${realm.name}`}
              onClick={() => {
                onSelect({ type: "realm", id: realm.id });
                name.current?.focus();
              }}
            />
          </li>
        ))}
        {!realms.length && <li className="py-6 text-center text-[#c9b78f]">No realms yet.</li>}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Terrain
// ---------------------------------------------------------------------------

const EMPTY_FEATURE = { name: "", kind: "forest" as FeatureKind, spread: DEFAULT_SPREAD, published: false };

function TerrainPanel({ features, selected, onSelect, onSave, onDelete, onNotice }: PanelProps<Feature> & Pick<AtlasDeskProps, "features">) {
  const [draft, setDraft] = useState(EMPTY_FEATURE);
  const { busy, error, setError, run } = useDeskWork(onNotice);
  const name = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(
      selected
        ? { name: selected.name, kind: selected.kind, spread: selected.spread || DEFAULT_SPREAD, published: selected.published }
        : EMPTY_FEATURE
    );
    setError("");
  }, [selected?.id]);

  // The spread follows the edge handle while it is dragged on the chart.
  useEffect(() => {
    if (selected?.spread) setDraft((last) => ({ ...last, spread: selected.spread }));
  }, [selected?.spread]);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    // Turning a range into a forest, say, changes what its points mean.
    const shape = reshape({ ...selected, spread: clampSpread(draft.spread) }, draft.kind);
    run(
      () => onSave({ type: "feature", record: { ...selected, ...shape, name: draft.name.trim() || selected.name, kind: draft.kind, published: draft.published } }),
      "The terrain was saved.",
      "The terrain could not be saved."
    );
  };

  const remove = () => {
    if (!selected || !window.confirm(`Remove “${selected.name}” from the chart?`)) return;
    run(() => onDelete({ type: "feature", id: selected.id }), "Removed from the chart.", "The terrain could not be removed.");
  };

  return (
    <section aria-labelledby="terrain-heading" className="panel min-w-0 p-5 sm:p-6">
      <h3 id="terrain-heading" className="font-heading text-xl font-bold text-[#f4e6c3]">
        Terrain
        <span className="ml-2 font-serif text-sm font-normal text-[#c9b78f]">{features.length} on the chart</span>
      </h3>
      <p className="mt-1 text-sm text-[#c9b78f]">
        Ranges, forests, rivers and lakes. Select one on the chart, then drag its handles: a forest or lake moves by its
        heart and resizes by its edge. Draw a new range or river along its line, or plant a forest at its heart.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="feature-name" className="field-label">
            {selected ? `Edit ${selected.name}` : "New terrain"}
          </label>
          <input
            id="feature-name"
            ref={name}
            required
            maxLength={120}
            disabled={!selected}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="e.g. Ashmire Forest, River of Fate"
            className="field font-card !text-xl"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="feature-kind" className="field-label">
              Kind
            </label>
            <select
              id="feature-kind"
              disabled={!selected}
              value={draft.kind}
              onChange={(e) => setDraft({ ...draft, kind: e.target.value as FeatureKind })}
              className="field"
            >
              {(Object.keys(FEATURE_KINDS) as FeatureKind[]).map((kind) => (
                <option key={kind} value={kind}>
                  {FEATURE_KINDS[kind].label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="feature-spread" className="field-label">
              Spread <span className="normal-case tracking-normal opacity-70">(forests and lakes)</span>
            </label>
            <input
              id="feature-spread"
              type="number"
              min={SPREAD_MIN}
              max={SPREAD_MAX}
              disabled={!selected || !isRound(draft.kind)}
              // A range or river has no spread to show.
              value={isRound(draft.kind) ? draft.spread : ""}
              onChange={(e) => setDraft({ ...draft, spread: Number(e.target.value) })}
              className="field"
            />
          </div>
        </div>
        <PublishedBox checked={draft.published} disabled={!selected} onChange={(published) => setDraft({ ...draft, published })} what="terrain shows" />
        <Message error={error} />
        <FormActions editing={!!selected} busy={busy} onDone={() => onSelect(null)} onDelete={remove} />
      </form>

      <ul className="mt-5 border-t border-[#f2c14e]/15">
        {features.map((feature) => (
          <li key={feature.id} className={`${ROW} ${selected?.id === feature.id ? "bg-[#f2c14e]/5" : ""}`}>
            <span className="w-[18px] flex-none text-center text-[#e9dbb8]" aria-hidden="true">
              {FEATURE_KINDS[feature.kind]?.glyph}
            </span>
            <button type="button" className="atlas-row" onClick={() => onSelect({ type: "feature", id: feature.id })}>
              {feature.name} <span className="text-xs text-[#c9b78f]">· {FEATURE_KINDS[feature.kind]?.label}</span>
            </button>
            {!feature.published && <DraftTag />}
            <EditButton
              label={`Edit ${feature.name}`}
              onClick={() => {
                onSelect({ type: "feature", id: feature.id });
                name.current?.focus();
              }}
            />
          </li>
        ))}
        {!features.length && <li className="py-6 text-center text-[#c9b78f]">No terrain yet.</li>}
      </ul>
    </section>
  );
}

/** The Dungeon Master's tools under the chart: a form and a list each for places, realms and terrain. */
export default function AtlasDesk({ places, realms, features, lore, selection, onSelect, onSave, onDelete }: AtlasDeskProps) {
  const [notice, setNotice] = useState("");
  const picked = (type: AtlasSelection["type"]) => (selection?.type === type ? selection.id : "");

  // What was said about the last thing doesn't apply to the next.
  useEffect(() => {
    if (selection) setNotice("");
  }, [selection?.type, selection?.id]);

  const shared = { onSelect, onSave, onDelete, onNotice: setNotice };

  return (
    <>
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <PlacesPanel places={places} realms={realms} lore={lore} selected={places.find((p) => p.id === picked("place"))} {...shared} />
        <RealmsPanel realms={realms} selected={realms.find((r) => r.id === picked("realm"))} {...shared} />
        <TerrainPanel features={features} selected={features.find((f) => f.id === picked("feature"))} {...shared} />
      </div>
      <p role="status" className="mt-4 min-h-5 text-sm text-[#a8e6c8]">
        {notice}
      </p>
    </>
  );
}
