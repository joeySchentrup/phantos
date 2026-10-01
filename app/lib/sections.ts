/** Top-level sections. The atlas and the heroes are still face-down. */
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
    live: true,
    blurb: "The Six Primal Dragons, the fifteen Greater Dragons, and the Twins.",
  },
  {
    path: "/chronicle",
    label: "Chronicle",
    live: true,
    blurb: "A timeline of the ages, from the Erosian Wars to the Tri-War.",
  },
  {
    path: "/heroes",
    label: "Heroes",
    live: false,
    blurb: "The party, their deeds, and their electrum.",
    teaser: ["Character sheets", "Electrum ledger", "Deeds"],
  },
];

export function sectionFor(pathname: string): Section | undefined {
  return SECTIONS.find((s) => s.path === pathname.replace(/\/+$/, ""));
}
