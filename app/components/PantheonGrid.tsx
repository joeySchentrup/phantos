import type { PantheonSummary } from "~/types/pantheon";
import PantheonCard from "./PantheonCard";

const GRID = "grid grid-cols-1 gap-x-6 gap-y-8 min-[460px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4";
const SIZES = "(min-width: 1280px) 290px, (min-width: 768px) 33vw, (min-width: 460px) 50vw, 100vw";

/** The pantheon as cards, laid out like the lore archive. */
export default function PantheonGrid({ items, loreCounts }: { items: PantheonSummary[]; loreCounts?: Record<string, number> }) {
  return (
    <ul className={GRID}>
      {items.map((member) => (
        <li key={member.id} className="mx-auto w-full max-w-[22rem]">
          <PantheonCard member={member} to={`/pantheon/${member.slug}`} imageSizes={SIZES} loreCount={loreCounts?.[member.id]} />
        </li>
      ))}
    </ul>
  );
}
