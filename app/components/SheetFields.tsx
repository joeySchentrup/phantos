import { useEffect, useState } from "react";

/** A whole number with − and + either side; typing commits when the field is left. */
export function Stepper({
  value,
  min = 0,
  max = 999,
  label,
  disabled,
  onCommit,
}: {
  value: number;
  min?: number;
  max?: number;
  label: string;
  disabled?: boolean;
  onCommit: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n)));
  const commit = () => {
    const n = Number(text);
    if (!Number.isFinite(n) || text.trim() === "") return setText(String(value));
    const next = clamp(n);
    setText(String(next));
    if (next !== value) onCommit(next);
  };
  return (
    <span className="sheet-stepper">
      <button type="button" aria-label={`${label}: one less`} disabled={disabled || value <= min} onClick={() => onCommit(clamp(value - 1))}>
        −
      </button>
      <input
        aria-label={label}
        inputMode="numeric"
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value.replace(/[^\d-]/g, ""))}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      />
      <button type="button" aria-label={`${label}: one more`} disabled={disabled || value >= max} onClick={() => onCommit(clamp(value + 1))}>
        +
      </button>
    </span>
  );
}

/**
 * A row of pips, `used` of them filled. Pressing a pip fills up to it, or
 * empties back to it if it was already filled. Read-only without `onSet`.
 */
export function Pips({
  total,
  used,
  label,
  failure,
  onSet,
}: {
  total: number;
  used: number;
  label: string;
  failure?: boolean;
  onSet?: (used: number) => void;
}) {
  if (total <= 0) return null;
  return (
    <span className="inline-flex flex-wrap gap-1" role="group" aria-label={`${label}: ${used} of ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const filled = i < used;
        const className = failure
          ? filled
            ? "sheet-pip sheet-pip--failure sheet-pip--used"
            : "sheet-pip sheet-pip--failure"
          : filled
            ? "sheet-pip sheet-pip--used"
            : "sheet-pip";
        return onSet ? (
          <button
            key={i}
            type="button"
            className={className}
            aria-pressed={filled}
            aria-label={`${label} ${i + 1}`}
            onClick={() => onSet(filled ? i : i + 1)}
          />
        ) : (
          <span key={i} className={className} aria-hidden="true" />
        );
      })}
    </span>
  );
}

/** Text shown as it is, with an Edit button that swaps in a textarea. */
export function TextBlock({
  value,
  label,
  canEdit,
  placeholder,
  rows = 6,
  onSave,
}: {
  value: string;
  label: string;
  canEdit: boolean;
  placeholder: string;
  rows?: number;
  onSave: (value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await onSave(draft);
      setEditing(false);
    } catch {
      // The page shows what went wrong; the draft stays open to try again.
    } finally {
      setBusy(false);
    }
  };
  if (editing) {
    return (
      <div className="space-y-2">
        <textarea aria-label={label} rows={rows} value={draft} onChange={(e) => setDraft(e.target.value)} className="sheet-input" />
        <div className="flex gap-2">
          <button type="button" className="sheet-button" onClick={save} disabled={busy || draft === value}>
            {busy ? "Saving…" : "Save"}
          </button>
          <button type="button" className="sheet-button" onClick={() => setEditing(false)} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    );
  }
  return (
    <div>
      {value.trim() ? (
        <p className="whitespace-pre-line text-[0.95rem] leading-relaxed">{value}</p>
      ) : (
        <p className="text-sm italic text-[#5b4527]">{placeholder}</p>
      )}
      {canEdit && (
        <button
          type="button"
          className="sheet-button no-print mt-2"
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
        >
          Edit
        </button>
      )}
    </div>
  );
}

/** A labelled value in the sheet's small capitals. */
export function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="sheet__fact">
      <div className="min-h-[1.4em]">{children}</div>
      <div className="sheet-label">{label}</div>
    </div>
  );
}
