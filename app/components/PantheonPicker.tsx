import { useState } from "react";
import { RANK_ORDER, RANKS, sortPantheon } from "~/lib/pantheon";
import type { PantheonSummary } from "~/types/pantheon";

interface PantheonPickerProps {
  members: PantheonSummary[];
  /** Ids of the members that are picked. */
  selected: string[];
  onChange: (selected: string[]) => void;
}

/** Chooses which pantheon members a lore entry refers to: one toggle each, grouped by rank. */
export default function PantheonPicker({ members, selected, onChange }: PantheonPickerProps) {
  const [filter, setFilter] = useState("");
  const needle = filter.trim().toLowerCase();
  const shown = sortPantheon(members).filter(
    (member) => !needle || `${member.name} ${member.domain}`.toLowerCase().includes(needle)
  );

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((other) => other !== id) : [...selected, id]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter the pantheon…"
          aria-label="Filter the pantheon"
          className="field !w-full !py-1.5 sm:!w-64"
        />
        <span className="text-sm text-[#c9b78f]">{selected.length} linked</span>
        {selected.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="text-sm text-[#c9b78f] underline underline-offset-2 hover:text-[#f4e6c3]">
            Clear
          </button>
        )}
      </div>

      <div className="mt-3 space-y-3">
        {RANK_ORDER.map((rank) => {
          const inRank = shown.filter((member) => member.rank === rank);
          if (!inRank.length) return null;
          return (
            <div key={rank} role="group" aria-label={RANKS[rank].plural}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[#c9b78f]">{RANKS[rank].plural}</p>
              <div className="flex flex-wrap gap-2">
                {inRank.map((member) => {
                  const picked = selected.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggle(member.id)}
                      aria-pressed={picked}
                      className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors ${
                        picked
                          ? "border-[#f2c14e] bg-[#f2c14e]/15 text-[#fff2b0]"
                          : "border-[#f2c14e]/25 bg-black/30 text-[#c9b78f] hover:border-[#f2c14e]/60 hover:text-[#f4e6c3]"
                      }`}
                    >
                      <span className="frame-swatch" data-frame={member.rank} aria-hidden="true" />
                      {member.name}
                      {!member.published && <span className="text-xs text-[#ffb3a1]">Draft</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {!shown.length && (
          <p className="text-sm text-[#c9b78f]">{members.length ? "No members match." : "The pantheon is empty."}</p>
        )}
      </div>
    </div>
  );
}
