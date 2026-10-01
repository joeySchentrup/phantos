import type { HeroSummary } from "~/types/hero";
import HeroCard from "./HeroCard";

const GRID = "grid grid-cols-1 gap-x-6 gap-y-8 min-[460px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4";
const SIZES = "(min-width: 1280px) 290px, (min-width: 768px) 33vw, (min-width: 460px) 50vw, 100vw";

/** The party as cards, laid out like the lore archive and the pantheon. */
export default function HeroGrid({ items, updateCounts }: { items: HeroSummary[]; updateCounts?: Record<string, number> }) {
  return (
    <ul className={GRID}>
      {items.map((hero) => (
        <li key={hero.id} className="mx-auto w-full max-w-[22rem]">
          <HeroCard hero={hero} to={`/heroes/${hero.slug}`} imageSizes={SIZES} updateCount={updateCounts?.[hero.id]} />
        </li>
      ))}
    </ul>
  );
}
