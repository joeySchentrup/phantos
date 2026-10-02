import type { HeroSummary } from "~/types/hero";
import HeroCard from "./HeroCard";

const GRID = "grid grid-cols-1 gap-x-6 gap-y-8 min-[460px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4";

interface HeroGridProps {
  items: HeroSummary[];
  updateCounts?: Record<string, number>;
  /** The electrum each hero holds, by hero id. */
  electrum?: Record<string, number>;
}

/** The party as cards, laid out like the lore archive and the pantheon. */
export default function HeroGrid({ items, updateCounts, electrum }: HeroGridProps) {
  return (
    <ul className={GRID}>
      {items.map((hero) => (
        <li key={hero.id} className="mx-auto w-full max-w-[22rem]">
          <HeroCard hero={hero} to={`/heroes/${hero.slug}`} updateCount={updateCounts?.[hero.id]} electrum={electrum?.[hero.id]} />
        </li>
      ))}
    </ul>
  );
}
