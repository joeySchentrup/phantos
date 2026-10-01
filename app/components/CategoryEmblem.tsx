import type { LoreCategory } from "~/types/lore";

/** Line-art emblems drawn in the middle of a card that has no illustration. */
const PATHS: Record<LoreCategory, React.ReactNode> = {
  // An open book.
  tale: (
    <>
      <path d="M32 18c-7-5-15-6-24-4v34c9-2 17-1 24 4 7-5 15-6 24-4V14c-9-2-17-1-24 4z" />
      <path d="M32 18v34" />
      <path d="M14 22c5-1 9 0 13 2M14 29c5-1 9 0 13 2M14 36c5-1 9 0 13 2M37 24c4-2 8-3 13-2M37 31c4-2 8-3 13-2M37 38c4-2 8-3 13-2" strokeWidth="2" />
    </>
  ),
  // An hourglass — the passing of ages.
  chronicle: (
    <>
      <path d="M16 8h32M16 56h32" />
      <path d="M20 8c0 14 10 18 12 24 2-6 12-10 12-24M20 56c0-14 10-18 12-24 2 6 12 10 12 24" />
      <path d="M25 52l7-9 7 9z" fill="currentColor" stroke="none" />
    </>
  ),
  // Sun and moon — Quint and Erosia, the Twins.
  myth: (
    <>
      <circle cx="32" cy="32" r="14" />
      <path d="M32 18a14 14 0 0 1 0 28 9 14 0 0 0 0-28z" fill="currentColor" stroke="none" />
      <path d="M32 6v6M32 52v6M6 32h6M52 32h6M13.6 13.6l4.3 4.3M46.1 46.1l4.3 4.3M13.6 50.4l4.3-4.3M46.1 17.9l4.3-4.3" />
    </>
  ),
  // A sealed letter.
  dispatch: (
    <>
      <rect x="8" y="16" width="48" height="32" rx="2" />
      <path d="M8 18l24 18 24-18" />
      <circle cx="32" cy="38" r="7" fill="currentColor" stroke="none" />
    </>
  ),
  // A clasped tome with a star on its cover.
  codex: (
    <>
      <path d="M18 8h30a4 4 0 0 1 4 4v42H22a4 4 0 0 1-4-4z" />
      <path d="M18 50a4 4 0 0 1 4-4h30" />
      <path d="M35 18l2.6 6.4L44 27l-6.4 2.6L35 36l-2.6-6.4L26 27l6.4-2.6z" fill="currentColor" stroke="none" />
    </>
  ),
  // A dragon's eye.
  dragon: (
    <>
      <path d="M4 32C14 16 50 16 60 32 50 48 14 48 4 32z" />
      <circle cx="32" cy="32" r="11" />
      <path d="M32 21c-3.5 5-3.5 17 0 22 3.5-5 3.5-17 0-22z" fill="currentColor" stroke="none" />
    </>
  ),
  // A compass rose.
  map: (
    <>
      <circle cx="32" cy="32" r="22" />
      <path d="M32 6l5 21 21 5-21 5-5 21-5-21-21-5 21-5z" fill="currentColor" stroke="none" />
    </>
  ),
};

export default function CategoryEmblem({ category, className = "" }: { category: LoreCategory; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[category] ?? PATHS.tale}
    </svg>
  );
}
