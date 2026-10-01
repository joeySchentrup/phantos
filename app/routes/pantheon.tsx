import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/pantheon";
import { countLoreByPantheon, listPantheon } from "../backend/api";
import { CardGridSkeleton } from "../components/CardGrid";
import PantheonGrid from "../components/PantheonGrid";
import { RANK_ORDER, RANKS, sortPantheon } from "../lib/pantheon";
import { useDungeonMaster } from "../lib/useDungeonMaster";
import type { PantheonRank, PantheonSummary } from "../types/pantheon";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Pantheon — Phantos" },
    { name: "description", content: "Kalistos, the Six Primal Dragons, the Twins and the fifteen Greater Dragons of Phanatos." },
  ];
}

function isRank(value: string | null): value is PantheonRank {
  return !!value && (RANK_ORDER as string[]).includes(value);
}

export default function Pantheon() {
  const isDm = useDungeonMaster();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const rankParam = params.get("rank");
  const rank: PantheonRank | "" = isRank(rankParam) ? rankParam : "";

  const [draft, setDraft] = useState(query);
  const [members, setMembers] = useState<PantheonSummary[]>([]);
  const [loreCounts, setLoreCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Keep the box in step with back/forward navigation.
  useEffect(() => {
    setDraft(query);
  }, [query]);

  const updateParams = (next: { q?: string; rank?: string }) => {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, value);
      else merged.delete(key);
    }
    setParams(merged, { replace: true, preventScrollReset: true });
  };

  const onDraftChange = (value: string) => {
    setDraft(value);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => updateParams({ q: value.trim() }), 300);
  };

  useEffect(() => () => clearTimeout(debounce.current), []);

  // Drafts appear for the DM, so reload when they sign in or out.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");

    listPantheon(query, rank)
      .then((items) => !cancelled && setMembers(sortPantheon(items)))
      .catch((err) => {
        if (!cancelled && !err?.isAbort) setError("The pantheon could not be reached. Please try again.");
      })
      .finally(() => !cancelled && setIsLoading(false));

    return () => {
      cancelled = true;
    };
  }, [query, rank, isDm]);

  // The LORE/n printed on each card. The cards are fine without it.
  useEffect(() => {
    countLoreByPantheon()
      .then(setLoreCounts)
      .catch(() => setLoreCounts({}));
  }, [isDm]);

  const searching = query.trim().length > 0;
  const total = members.length;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
      <div className="mx-auto mt-10 max-w-3xl text-center">
        <p className="eyebrow">The Powers of Phanatos</p>
        <h1 className="font-heading mt-2 text-4xl font-bold text-[#f4e6c3] sm:text-5xl">Pantheon</h1>
        <p className="mt-3 text-lg text-[#c9b78f]">
          Kalistos who made the world, the Six Primal Dragons he gave it to, the Twins of day and night, and the
          fifteen Greater Dragons.
        </p>

        <form role="search" onSubmit={(e) => { e.preventDefault(); clearTimeout(debounce.current); updateParams({ q: draft.trim() }); }} className="name-plate mt-8 flex items-center gap-3 p-2 pl-4">
          <label htmlFor="pantheon-search" className="sr-only">
            Search the pantheon
          </label>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 shrink-0 text-[#f2c14e]" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            id="pantheon-search"
            type="search"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder="Rokesh, lightning, Twili…"
            autoComplete="off"
            className="font-card min-w-0 flex-1 bg-transparent py-2 text-lg text-[#fff2d2] placeholder:text-[#c9b78f]/50 focus:outline-none sm:text-xl"
          />
          <button type="submit" className="btn btn-gold !px-4">
            Search
          </button>
        </form>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2" role="group" aria-label="Filter by rank">
        {(["", ...RANK_ORDER] as const).map((value) => {
          const active = rank === value;
          return (
            <button
              key={value || "all"}
              type="button"
              onClick={() => updateParams({ rank: value })}
              aria-pressed={active}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                active
                  ? "border-[#f2c14e] bg-[#f2c14e]/15 text-[#fff2b0]"
                  : "border-[#f2c14e]/25 bg-black/30 text-[#c9b78f] hover:border-[#f2c14e]/60 hover:text-[#f4e6c3]"
              }`}
              title={value ? RANKS[value].description : "Every power"}
            >
              {value && <span className="frame-swatch" data-frame={value} />}
              {value ? RANKS[value].plural : "All"}
            </button>
          );
        })}
      </div>

      {isDm && (
        <div className="mt-6 flex justify-center">
          <Link to="/dm/pantheon/new" className="btn btn-gold">
            + New Member
          </Link>
        </div>
      )}

      <div className="mt-8" aria-live="polite">
        {!isLoading && !error && (
          <p className="mb-5 text-center text-sm text-[#c9b78f]">
            {searching
              ? `${total} ${total === 1 ? "card matches" : "cards match"} “${query.trim()}”${rank ? ` in ${RANKS[rank].plural}` : ""}`
              : `${total} ${total === 1 ? "card" : "cards"}${rank ? ` · ${RANKS[rank].plural}` : ""} · highest first`}
          </p>
        )}

        {error ? (
          <p className="panel mx-auto max-w-xl p-6 text-center text-[#c9b78f]">{error}</p>
        ) : isLoading ? (
          <CardGridSkeleton />
        ) : members.length ? (
          <PantheonGrid items={members} loreCounts={loreCounts} />
        ) : (
          <div className="panel mx-auto max-w-xl p-8 text-center">
            <p className="font-heading text-xl font-bold text-[#f4e6c3]">No cards in the deck match.</p>
            <p className="mt-2 text-[#c9b78f]">Try a single name or domain, or clear the rank filter.</p>
          </div>
        )}
      </div>
    </main>
  );
}
