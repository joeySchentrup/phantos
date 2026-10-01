import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/home";
import { getArchiveStats, getFeaturedImage, listLore } from "../backend/api";
import { CardGrid, CardGridSkeleton } from "../components/CardGrid";
import FeaturedVision from "../components/FeaturedVision";
import { CATEGORIES, CATEGORY_ORDER } from "../lib/lore";
import { useDungeonMaster } from "../lib/useDungeonMaster";
import type { FeaturedImage, LoreSummary } from "../types/lore";

const PAGE_SIZE = 12;

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Phantos — Archive of the Six Dragons" },
    {
      name: "description",
      content:
        "The lore of Phanatos: tales, chronicles, myths and dispatches from the Phantos campaign, from the Six Primal Dragons to the Tri-War.",
    },
  ];
}

export default function Home() {
  const isDm = useDungeonMaster();
  const [featured, setFeatured] = useState<FeaturedImage | null>(null);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [stats, setStats] = useState<{ entries: number; words: number } | null>(null);
  const [items, setItems] = useState<LoreSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getFeaturedImage()
      .then(setFeatured)
      .finally(() => setFeaturedLoading(false));
    getArchiveStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  // Drafts appear for the DM, so reload the feed when they sign in or out.
  useEffect(() => {
    setIsLoading(true);
    listLore(1, PAGE_SIZE)
      .then((result) => {
        setItems(result.items);
        setPage(1);
        setTotalPages(result.totalPages);
        setError("");
      })
      .catch(() => setError("The archive could not be reached. Please try again in a moment."))
      .finally(() => setIsLoading(false));
  }, [isDm]);

  const drawMore = async () => {
    setIsLoadingMore(true);
    try {
      const next = await listLore(page + 1, PAGE_SIZE);
      setItems((current) => [...current, ...next.items.filter((n) => !current.some((c) => c.id === n.id))]);
      setPage(page + 1);
      setTotalPages(next.totalPages);
    } catch {
      setError("More cards could not be drawn. Please try again.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
      <div className="mx-auto mt-8 max-w-[70rem] sm:mt-10">
        <FeaturedVision image={featured} loading={featuredLoading} stats={stats} isDm={isDm} />
      </div>

      <section aria-labelledby="feed-title" className="mt-16 sm:mt-20">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#f2c14e]/20 pb-4">
          <div>
            <p className="eyebrow">The Archive</p>
            <h2 id="feed-title" className="font-heading mt-1 text-3xl font-bold text-[#f4e6c3] sm:text-4xl">
              Newest Lore
            </h2>
          </div>
          <Link to="/lore" className="btn btn-ghost">
            Search the archive
          </Link>
        </div>

        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2" aria-label="Card frames">
          {CATEGORY_ORDER.map((category) => (
            <li key={category}>
              <Link
                to={`/lore?category=${category}`}
                className="group flex items-center gap-2 text-sm text-[#c9b78f] hover:text-[#f4e6c3]"
                title={CATEGORIES[category].description}
              >
                <span className="frame-swatch" data-frame={category} />
                {CATEGORIES[category].plural}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          {error && !items.length ? (
            <p className="panel p-6 text-center text-[#c9b78f]">{error}</p>
          ) : isLoading ? (
            <CardGridSkeleton />
          ) : (
            <CardGrid items={items} />
          )}
        </div>

        {!isLoading && page < totalPages && (
          <div className="mt-12 flex justify-center">
            <button type="button" onClick={drawMore} disabled={isLoadingMore} className="btn btn-gold">
              {isLoadingMore ? <span className="spinner" aria-hidden="true" /> : null}
              {isLoadingMore ? "Drawing…" : "Draw more cards"}
            </button>
          </div>
        )}
        {error && items.length > 0 && <p className="mt-6 text-center text-[#ffb3a1]">{error}</p>}
      </section>
    </main>
  );
}
