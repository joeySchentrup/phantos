import type { LoreSummary } from "~/types/lore";
import LoreCard from "./LoreCard";

const GRID = "grid grid-cols-1 gap-x-6 gap-y-8 min-[460px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4";

export function CardGrid({ items }: { items: LoreSummary[] }) {
  return (
    <ul className={GRID}>
      {items.map((lore) => (
        <li key={lore.id} className="mx-auto w-full max-w-[22rem]">
          <LoreCard lore={lore} to={`/lore/${lore.slug}`} />
        </li>
      ))}
    </ul>
  );
}

export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className={GRID} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="mx-auto w-full max-w-[22rem]">
          <div className="skeleton aspect-[59/86] w-full rounded-[1rem]" />
        </li>
      ))}
    </ul>
  );
}
