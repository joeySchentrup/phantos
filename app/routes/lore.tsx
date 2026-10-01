import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/lore";
import { listLore, searchLore } from "../backend/api";
import AttributeOrb from "../components/AttributeOrb";
import { CardGrid, CardGridSkeleton } from "../components/CardGrid";
import { CATEGORIES, CATEGORY_ORDER, highlightParts, searchTerms, typeLine } from "../lib/lore";
import { useDungeonMaster } from "../lib/useDungeonMaster";
import type { LoreCategory, LoreSummary, SearchHit } from "../types/lore";

const PAGE_SIZE = 16;

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Lore Archive — Phantos" },
    { name: "description", content: "Search every tale, chronicle, myth and dispatch of Phanatos." },
  ];
}

function isCategory(value: string | null): value is LoreCategory {
  return !!value && (CATEGORY_ORDER as string[]).includes(value);
}

function Highlighted({ text, terms }: { text: string; terms: string[] }) {
  return (
    <>
      {highlightParts(text, terms).map((part, i) =>
        part.match ? (
          <mark key={i} className="hit">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  );
}

function SearchResult({ hit, terms }: { hit: SearchHit; terms: string[] }) {
  return (
    <li>
      <Link
        to={`/lore/${hit.slug}`}
        className="panel group flex gap-4 p-4 transition-colors hover:border-[#f2c14e]/60 sm:p-5"
      >
        <span className="frame-swatch !h-auto !w-2 self-stretch" data-frame={hit.category} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-3">
            <span className="font-card text-xl font-bold leading-snug text-[#f4e6c3] group-hover:text-[#fff2b0] sm:text-[1.35rem]">
              <Highlighted text={hit.title} terms={terms} />
            </span>
            <AttributeOrb attribute={hit.attribute} size="2.1rem" className="mt-0.5" />
          </span>
          <span className="mt-0.5 block text-sm font-semibold text-[#c9b78f]">
            {typeLine(hit.category, hit.attribute, hit.author)}
            {!hit.published && <span className="ml-2 text-[#ffb3a1]">· Draft</span>}
          </span>
          <span className="mt-2 block text-[0.98rem] leading-relaxed text-[#e9dbb8]">
            <Highlighted text={hit.snippet || hit.summary} terms={terms} />
          </span>
        </span>
      </Link>
    </li>
  );
}

export default function LoreArchive() {
  const isDm = useDungeonMaster();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const categoryParam = params.get("category");
  const category: LoreCategory | "" = isCategory(categoryParam) ? categoryParam : "";

  const [draft, setDraft] = useState(query);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [total, setTotal] = useState(0);
  const [cards, setCards] = useState<LoreSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Keep the box in step with back/forward navigation.
  useEffect(() => {
    setDraft(query);
  }, [query]);

  const updateParams = (next: { q?: string; category?: string }) => {
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

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");

    const load = query.trim()
      ? searchLore(query, category).then((result) => {
          if (cancelled) return;
          setHits(result.items);
          setTotal(result.total);
        })
      : listLore(1, PAGE_SIZE, category).then((result) => {
          if (cancelled) return;
          setCards(result.items);
          setPage(1);
          setTotalPages(result.totalPages);
          setTotal(result.totalItems);
        });

    load
      .catch((err) => {
        if (!cancelled && !err?.isAbort) setError("The archive could not be searched. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query, category, isDm]);

  const drawMore = async () => {
    setIsLoadingMore(true);
    try {
      const next = await listLore(page + 1, PAGE_SIZE, category);
      setCards((current) => [...current, ...next.items.filter((n) => !current.some((c) => c.id === n.id))]);
      setPage(page + 1);
      setTotalPages(next.totalPages);
    } catch {
      setError("More cards could not be drawn. Please try again.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const terms = searchTerms(query);
  const searching = terms.length > 0;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
      <div className="mx-auto mt-10 max-w-3xl text-center">
        <p className="eyebrow">The Archive</p>
        <h1 className="font-heading mt-2 text-4xl font-bold text-[#f4e6c3] sm:text-5xl">Lore Archive</h1>
        <p className="mt-3 text-lg text-[#c9b78f]">
          Search every tale, chronicle, myth and dispatch: a name, a place, a dragon, a turn of phrase.
        </p>

        <form role="search" onSubmit={(e) => { e.preventDefault(); clearTimeout(debounce.current); updateParams({ q: draft.trim() }); }} className="name-plate mt-8 flex items-center gap-3 p-2 pl-4">
          <label htmlFor="archive-search" className="sr-only">
            Search the lore
          </label>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 shrink-0 text-[#f2c14e]" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            id="archive-search"
            type="search"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder="Erosia, snawk venom, Nabatea…"
            autoComplete="off"
            className="font-card min-w-0 flex-1 bg-transparent py-2 text-lg text-[#fff2d2] placeholder:text-[#c9b78f]/50 focus:outline-none sm:text-xl"
          />
          <button type="submit" className="btn btn-gold !px-4">
            Search
          </button>
        </form>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2" role="group" aria-label="Filter by card frame">
        {(["", ...CATEGORY_ORDER] as const).map((value) => {
          const active = category === value;
          return (
            <button
              key={value || "all"}
              type="button"
              onClick={() => updateParams({ category: value })}
              aria-pressed={active}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                active
                  ? "border-[#f2c14e] bg-[#f2c14e]/15 text-[#fff2b0]"
                  : "border-[#f2c14e]/25 bg-black/30 text-[#c9b78f] hover:border-[#f2c14e]/60 hover:text-[#f4e6c3]"
              }`}
              title={value ? CATEGORIES[value].description : "Every kind of card"}
            >
              {value && <span className="frame-swatch" data-frame={value} />}
              {value ? CATEGORIES[value].plural : "All"}
            </button>
          );
        })}
      </div>

      <div className="mt-8" aria-live="polite">
        {!isLoading && !error && (
          <p className="mb-5 text-center text-sm text-[#c9b78f]">
            {searching
              ? `${total} ${total === 1 ? "card matches" : "cards match"} “${query.trim()}”${category ? ` in ${CATEGORIES[category].plural}` : ""}`
              : `${total} ${total === 1 ? "card" : "cards"}${category ? ` · ${CATEGORIES[category].plural}` : ""} · newest first`}
          </p>
        )}

        {error ? (
          <p className="panel mx-auto max-w-xl p-6 text-center text-[#c9b78f]">{error}</p>
        ) : isLoading ? (
          searching ? (
            <ul className="mx-auto max-w-4xl space-y-4" aria-hidden="true">
              {Array.from({ length: 4 }, (_, i) => (
                <li key={i} className="skeleton h-32 rounded-xl" />
              ))}
            </ul>
          ) : (
            <CardGridSkeleton />
          )
        ) : searching ? (
          hits.length ? (
            <ul className="mx-auto max-w-4xl space-y-4">
              {hits.map((hit) => (
                <SearchResult key={hit.id} hit={hit} terms={terms} />
              ))}
            </ul>
          ) : (
            <div className="panel mx-auto max-w-xl p-8 text-center">
              <p className="font-heading text-xl font-bold text-[#f4e6c3]">No cards in the deck match.</p>
              <p className="mt-2 text-[#c9b78f]">Try a single name or place, or clear the frame filter.</p>
            </div>
          )
        ) : (
          <CardGrid items={cards} />
        )}

        {!searching && !isLoading && page < totalPages && (
          <div className="mt-12 flex justify-center">
            <button type="button" onClick={drawMore} disabled={isLoadingMore} className="btn btn-gold">
              {isLoadingMore ? <span className="spinner" aria-hidden="true" /> : null}
              {isLoadingMore ? "Drawing…" : "Draw more cards"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
