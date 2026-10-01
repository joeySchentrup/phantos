import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router";
import { SECTIONS } from "~/lib/sections";
import { useDungeonMaster } from "~/lib/useDungeonMaster";

/** Six points around a circle — one for each Primal Dragon. */
function SixfoldMark({ className = "" }: { className?: string }) {
  const colors = ["#f1cf4a", "#8a4fb8", "#e2441f", "#4aa7e0", "#a2703c", "#2fb397"];
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="17" fill="none" stroke="#f2c14e" strokeWidth="1.5" />
      <path d="M24 9l13 22.5H11z M24 39L11 16.5h26z" fill="none" stroke="#f2c14e" strokeWidth="1.2" opacity="0.8" />
      {colors.map((color, i) => {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        return (
          <circle
            key={color}
            cx={24 + 17 * Math.cos(angle)}
            cy={24 + 17 * Math.sin(angle)}
            r="4"
            fill={color}
            stroke="#1a0d05"
            strokeWidth="1.2"
          />
        );
      })}
      <circle cx="24" cy="24" r="4.5" fill="#f0a93a" stroke="#1a0d05" strokeWidth="1.2" />
    </svg>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

export default function SiteHeader() {
  const navigate = useNavigate();
  const isDm = useDungeonMaster();
  const [query, setQuery] = useState("");

  const onSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    navigate(q ? `/lore?q=${encodeURIComponent(q)}` : "/lore");
  };

  return (
    <header className="relative z-10 border-b border-[#f2c14e]/20 bg-gradient-to-b from-black/60 to-black/20 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 pt-4 pb-3 sm:px-6">
        <Link to="/" className="group flex items-center gap-3" aria-label="Phantos — home">
          <SixfoldMark className="h-11 w-11 shrink-0 transition-transform duration-500 group-hover:rotate-[60deg]" />
          <span className="flex flex-col leading-none">
            <span className="wordmark text-[1.9rem] sm:text-[2.2rem]">PHANTOS</span>
            <span className="eyebrow mt-1 !text-[0.62rem] !tracking-[0.3em] text-[#c9b78f]">
              Archive of the Six Dragons
            </span>
          </span>
        </Link>

        <form onSubmit={onSearch} role="search" className="ml-auto flex min-w-0 flex-1 basis-56 justify-end sm:max-w-sm">
          <label htmlFor="site-search" className="sr-only">
            Search the lore
          </label>
          <div className="relative w-full">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c9b78f]" />
            <input
              id="site-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the lore…"
              className="field !rounded-full !py-2 pl-9 text-[0.95rem]"
            />
          </div>
        </form>

        {isDm && (
          <div className="flex items-center gap-2">
            <Link to="/dm/lore/new" className="btn btn-gold !px-3 !py-2 !text-[0.72rem]">
              + New Lore
            </Link>
            <Link to="/dm" className="btn btn-ghost !px-3 !py-2 !text-[0.72rem]" title="Dungeon Master's desk">
              DM
            </Link>
          </div>
        )}
      </div>

      <nav aria-label="Sections" className="mx-auto max-w-7xl px-2 sm:px-4">
        {/* Scrolls sideways on phones; the fade hints there's more. */}
        <ul className="-mb-px flex gap-1 overflow-x-auto pb-px [scrollbar-width:none] max-md:[mask-image:linear-gradient(to_right,black_82%,transparent)]">
          {SECTIONS.map((section) => (
            <li key={section.path} className="shrink-0">
              <NavLink
                to={section.path}
                className={({ isActive }) =>
                  `font-heading flex items-center gap-2 border-b-2 px-3 py-2.5 text-[0.78rem] font-bold uppercase tracking-[0.16em] transition-colors ${
                    isActive
                      ? "border-[#f2c14e] text-[#fff2b0]"
                      : "border-transparent text-[#c9b78f] hover:border-[#f2c14e]/50 hover:text-[#f4e6c3]"
                  }`
                }
              >
                {section.label}
                {!section.live && (
                  <span className="rounded-sm border border-[#d9541e]/60 bg-[#7d150c]/50 px-1.5 py-px text-[0.58rem] tracking-[0.12em] text-[#ffcfb8]">
                    Soon
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
