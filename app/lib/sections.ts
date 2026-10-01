/** Top-level sections. Only the archive is open; the rest are face-down for now. */
export interface Section {
  path: string;
  label: string;
  live: boolean;
  blurb: string;
  teaser?: string[];
}

export const SECTIONS: Section[] = [
  {
    path: "/lore",
    label: "Lore Archive",
    live: true,
    blurb: "Every tale, chronicle, myth and dispatch, searchable.",
  },
  {
    path: "/atlas",
    label: "Atlas",
    live: false,
    blurb: "Interactive maps of the known world.",
    teaser: ["Hurly", "Korre", "Neua", "Nova Roma", "The Twilight"],
  },
  {
    path: "/pantheon",
    label: "Pantheon",
    live: false,
    blurb: "The Six Primal Dragons, the fifteen Greater Dragons, and the Twins.",
    teaser: ["Ouro’ras", "Golestandt", "Vlaurunga", "Yvander", "Quintara Lotus", "Rokesh"],
  },
  {
    path: "/chronicle",
    label: "Chronicle",
    live: false,
    blurb: "A timeline of the ages, from the Erosian Wars to the Tri-War.",
    teaser: ["c. 10000 BC", "Drynell", "The Great Hurlen War", "The Tri-War", "307 AC"],
  },
  {
    path: "/heroes",
    label: "Heroes",
    live: false,
    blurb: "The party, their deeds, and their electrum.",
    teaser: ["Character sheets", "Electrum ledger", "Deeds"],
  },
  {
    path: "/sessions",
    label: "Session Log",
    live: false,
    blurb: "Recaps of every session at the table.",
    teaser: ["Recaps", "Quotes", "Loot"],
  },
];

export function sectionFor(pathname: string): Section | undefined {
  return SECTIONS.find((s) => s.path === pathname.replace(/\/+$/, ""));
}
