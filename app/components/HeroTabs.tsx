import { NavLink } from "react-router";

interface HeroTabsProps {
  slug: string;
  /** Levels the DM has called the hero to that they have yet to take. */
  levelsWaiting: number;
}

const TAB =
  "font-heading flex items-center gap-2 border-b-2 px-3 py-2.5 text-[0.78rem] font-bold uppercase tracking-[0.16em] transition-colors";
const ACTIVE = "border-[#f2c14e] text-[#fff2b0]";
const IDLE = "border-transparent text-[#c9b78f] hover:border-[#f2c14e]/50 hover:text-[#f4e6c3]";

/**
 * The hero's lore page and their character sheet. Only the DMs and the
 * hero's player see these tabs; everyone else sees only the lore page.
 */
export default function HeroTabs({ slug, levelsWaiting }: HeroTabsProps) {
  return (
    <nav aria-label="Hero pages" className="mt-4 border-b border-[#f2c14e]/15">
      <ul className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none]">
        <li className="shrink-0">
          <NavLink to={`/heroes/${slug}`} end className={({ isActive }) => `${TAB} ${isActive ? ACTIVE : IDLE}`}>
            Lore
          </NavLink>
        </li>
        <li className="shrink-0">
          <NavLink to={`/heroes/${slug}/sheet`} className={({ isActive }) => `${TAB} ${isActive ? ACTIVE : IDLE}`}>
            Character Sheet
            {levelsWaiting > 0 && (
              <span
                className="rounded-sm border border-[#f2c14e]/60 bg-[#7a4a06]/60 px-1.5 py-px text-[0.58rem] tracking-[0.12em] text-[#fff2b0]"
                title={`${levelsWaiting} level${levelsWaiting > 1 ? "s" : ""} to take`}
              >
                Level up
              </span>
            )}
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}
