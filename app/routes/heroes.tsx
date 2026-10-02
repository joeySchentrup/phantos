import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/heroes";
import { countUpdatesByHero, electrumByHero, listHeroes } from "../backend/api";
import { CardGridSkeleton } from "../components/CardGrid";
import HeroGrid from "../components/HeroGrid";
import { sortHeroes } from "../lib/heroes";
import { useDungeonMaster } from "../lib/useDungeonMaster";
import type { HeroSummary } from "../types/hero";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Heroes — Phantos" },
    { name: "description", content: "The party: who they are, where they came from, and what has become of them." },
  ];
}

export default function Heroes() {
  const isDm = useDungeonMaster();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";

  const [draft, setDraft] = useState(query);
  const [heroes, setHeroes] = useState<HeroSummary[]>([]);
  const [updateCounts, setUpdateCounts] = useState<Record<string, number>>({});
  const [electrum, setElectrum] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Keep the box in step with back/forward navigation.
  useEffect(() => {
    setDraft(query);
  }, [query]);

  const search = (value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set("q", value);
    else next.delete("q");
    setParams(next, { replace: true, preventScrollReset: true });
  };

  const onDraftChange = (value: string) => {
    setDraft(value);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(value.trim()), 300);
  };

  useEffect(() => () => clearTimeout(debounce.current), []);

  // Drafts appear for the DM, so reload when they sign in or out.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");

    listHeroes(query)
      .then((items) => !cancelled && setHeroes(sortHeroes(items)))
      .catch((err) => {
        if (!cancelled && !err?.isAbort) setError("The heroes could not be reached. Please try again.");
      })
      .finally(() => !cancelled && setIsLoading(false));

    return () => {
      cancelled = true;
    };
  }, [query, isDm]);

  // The UPDATES/n printed on each card. The cards are fine without it.
  useEffect(() => {
    countUpdatesByHero()
      .then(setUpdateCounts)
      .catch(() => setUpdateCounts({}));
  }, [isDm]);

  // The stars on each card. Without them a card reads [HERO CARD].
  useEffect(() => {
    electrumByHero()
      .then(setElectrum)
      .catch(() => setElectrum({}));
  }, [isDm]);

  const searching = query.trim().length > 0;
  const total = heroes.length;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
      <div className="mx-auto mt-10 max-w-3xl text-center">
        <p className="eyebrow">The Party</p>
        <h1 className="font-heading mt-2 text-4xl font-bold text-[#f4e6c3] sm:text-5xl">Heroes</h1>
        <p className="mt-3 text-lg text-[#c9b78f]">
          Who they are, where they came from, and what has become of them since.
        </p>

        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            clearTimeout(debounce.current);
            search(draft.trim());
          }}
          className="name-plate mt-8 flex items-center gap-3 p-2 pl-4"
        >
          <label htmlFor="hero-search" className="sr-only">
            Search the heroes
          </label>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 shrink-0 text-[#f2c14e]" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            id="hero-search"
            type="search"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder="A name, a player, Aasimar, bard…"
            autoComplete="off"
            className="font-card min-w-0 flex-1 bg-transparent py-2 text-lg text-[#fff2d2] placeholder:text-[#c9b78f]/50 focus:outline-none sm:text-xl"
          />
          <button type="submit" className="btn btn-gold !px-4">
            Search
          </button>
        </form>
      </div>

      {isDm && (
        <div className="mt-6 flex justify-center">
          <Link to="/dm/heroes/new" className="btn btn-gold">
            + New Hero
          </Link>
        </div>
      )}

      <div className="mt-8" aria-live="polite">
        {!isLoading && !error && (
          <p className="mb-5 text-center text-sm text-[#c9b78f]">
            {searching
              ? `${total} ${total === 1 ? "hero matches" : "heroes match"} “${query.trim()}”`
              : `${total} ${total === 1 ? "hero" : "heroes"} · A to Z`}
          </p>
        )}

        {error ? (
          <p className="panel mx-auto max-w-xl p-6 text-center text-[#c9b78f]">{error}</p>
        ) : isLoading ? (
          <CardGridSkeleton count={4} />
        ) : heroes.length ? (
          <HeroGrid items={heroes} updateCounts={updateCounts} electrum={electrum} />
        ) : searching ? (
          <div className="panel mx-auto max-w-xl p-8 text-center">
            <p className="font-heading text-xl font-bold text-[#f4e6c3]">No heroes match.</p>
            <p className="mt-2 text-[#c9b78f]">Try a single name, species or class.</p>
          </div>
        ) : (
          <div className="panel mx-auto max-w-xl p-8 text-center">
            <p className="font-heading text-xl font-bold text-[#f4e6c3]">The party has yet to gather.</p>
            <p className="mt-2 text-[#c9b78f]">No heroes have been added yet.</p>
          </div>
        )}
      </div>
    </main>
  );
}
