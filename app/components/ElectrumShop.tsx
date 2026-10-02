import { useRef, useState } from "react";
import { deleteShopItem, errorMessage, saveShopItem } from "~/backend/api";
import { parseElectrum } from "~/lib/electrum";
import { formatNumber } from "~/lib/lore";
import type { LevelCost, ShopItem } from "~/types/electrum";
import ElectrumCoin from "./ElectrumCoin";

interface ElectrumShopProps {
  items: ShopItem[];
  /** The level up costs: the one thing in the shop without a flat price. */
  levels: LevelCost[];
  isDm: boolean;
  /** Called after an item is saved or deleted, to read the shop again. */
  onChanged: () => Promise<void>;
}

const EMPTY = { name: "", price: "", description: "" };

function Price({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-card lining-nums tabular-nums text-xl font-bold text-[#a9dcff]">
      <ElectrumCoin className="h-4 w-4" />
      {children}
    </span>
  );
}

/** What electrum buys. DMs add, edit and remove the items with a flat price. */
export default function ElectrumShop({ items, levels, isDm, onChanged }: ElectrumShopProps) {
  const [draft, setDraft] = useState(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const form = useRef<HTMLFormElement>(null);

  const edit = (item: ShopItem) => {
    setEditing(item.id);
    setDraft({ name: item.name, price: String(item.price), description: item.description });
    setError("");
    form.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  };
  const reset = () => {
    setEditing(null);
    setDraft(EMPTY);
    setError("");
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const price = /^\d+$/.test(draft.price.trim()) ? parseElectrum(draft.price) : 0;
    if (!price) {
      setError("A price is a flat, whole number of electrum.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await saveShopItem({ name: draft.name.trim(), price, description: draft.description.trim() }, editing ?? undefined);
      await onChanged();
      reset();
    } catch (err) {
      setError(errorMessage(err, "The item could not be saved."));
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (item: ShopItem) => {
    if (!window.confirm(`Take “${item.name}” out of the shop?`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteShopItem(item.id);
      await onChanged();
      if (editing === item.id) reset();
    } catch (err) {
      setError(errorMessage(err, "The item could not be removed."));
    } finally {
      setBusy(false);
    }
  };

  // The level up stands among the flat prices where its cheapest level falls.
  const cheapestLevel = levels.length ? Math.min(...levels.map((l) => l.cost)) : 0;
  const dearestLevel = levels.length ? Math.max(...levels.map((l) => l.cost)) : 0;
  const before = levels.length ? items.filter((item) => item.price <= cheapestLevel) : items;
  const after = levels.length ? items.filter((item) => item.price > cheapestLevel) : [];

  const row = (item: ShopItem) => (
    <li key={item.id} className={`flex flex-wrap items-start justify-end gap-x-4 gap-y-2 py-3 ${editing === item.id ? "bg-[#f2c14e]/5" : ""}`}>
      <span className="min-w-0 flex-1 basis-48">
        <span className="block font-semibold text-[#f4e6c3]">{item.name}</span>
        {item.description && <span className="block text-[0.95rem] leading-snug text-[#c9b78f]">{item.description}</span>}
      </span>
      <Price>{formatNumber(item.price)}</Price>
      {isDm && (
        <span className="flex shrink-0 basis-full justify-end gap-2 sm:basis-auto">
          <button type="button" onClick={() => edit(item)} className="btn btn-ghost !px-2.5 !py-1 !text-[0.65rem]">
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(item)}
            disabled={busy}
            className="btn btn-ghost !px-2.5 !py-1 !text-[0.65rem] !text-[#ffb3a1]"
            aria-label={`Delete ${item.name}`}
          >
            Delete
          </button>
        </span>
      )}
    </li>
  );

  return (
    <section aria-labelledby="shop-heading" className="panel min-w-0 p-5 sm:p-6">
      <h2 id="shop-heading" className="font-heading text-xl font-bold text-[#f4e6c3] sm:text-2xl">
        The Electrum Shop
      </h2>
      <p className="mt-1 text-sm text-[#c9b78f]">What electrum buys, cheapest first.</p>

      <ul className="mt-4 divide-y divide-[#f2c14e]/10 border-y border-[#f2c14e]/15">
        {before.map(row)}
        {levels.length > 0 && (
          <li className="flex flex-wrap items-start justify-end gap-x-4 gap-y-2 py-3">
            <span className="min-w-0 flex-1 basis-48">
              <span className="block font-semibold text-[#f4e6c3]">Free level up</span>
              <span className="block text-[0.95rem] leading-snug text-[#c9b78f]">
                Level up your character one level. The price depends on the level you are levelling up to:{" "}
                <a href="#level-up" className="text-[#a9dcff] underline underline-offset-2 hover:text-white">
                  work it out
                </a>
                .
              </span>
            </span>
            <Price>
              {formatNumber(cheapestLevel)} – {formatNumber(dearestLevel)}
            </Price>
          </li>
        )}
        {after.map(row)}
        {!items.length && !levels.length && <li className="py-6 text-center text-[#c9b78f]">The shop is empty.</li>}
      </ul>

      {isDm && (
        <form ref={form} onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
            <div>
              <label htmlFor="shop-name" className="field-label">
                {editing ? "Edit item" : "New item"}
              </label>
              <input
                id="shop-name"
                required
                maxLength={120}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g. Learn a language"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="shop-price" className="field-label">
                Price
              </label>
              <input
                id="shop-price"
                type="number"
                inputMode="numeric"
                required
                min={1}
                step={1}
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                className="field"
              />
            </div>
          </div>
          <div>
            <label htmlFor="shop-description" className="field-label">
              Description <span className="normal-case tracking-normal opacity-70">(optional)</span>
            </label>
            <textarea
              id="shop-description"
              rows={2}
              maxLength={400}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              className="field text-[0.95rem] leading-relaxed"
            />
          </div>
          <p className="text-sm text-[#c9b78f]">A price is a flat, whole number of electrum. Only a level up changes with the level.</p>
          {error && (
            <p role="alert" className="rounded border border-[#d9541e]/50 bg-[#7d150c]/30 px-3 py-2 text-sm text-[#ffcfb8]">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="btn btn-gold">
              {busy && <span className="spinner" aria-hidden="true" />}
              {editing ? "Save item" : "Add item"}
            </button>
            {editing && (
              <button type="button" onClick={reset} disabled={busy} className="btn btn-ghost">
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
