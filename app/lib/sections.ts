/** Top-level sections. One that isn't `live` yet is linked as a face-down card. */
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
    live: true,
    blurb: "Charts of the known world: every realm, range, river and city.",
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
    live: true,
    blurb: "The party: who they are, where they came from, and what has become of them.",
  },
  {
    path: "/songs",
    label: "Songs",
    live: true,
    blurb: "The campaign's songs, to play straight through, shuffled, or one at a time with their lyrics.",
  },
];

/**
 * Chat, which the top bar shows only to approved players and DMs, and only
 * when PocketBase says chat is on (useChatEnabled). Not one of the SECTIONS:
 * guests never see it, in the top bar or the footer.
 */
export const CHAT_SECTION: Section = {
  path: "/chat",
  label: "Chat",
  live: true,
  blurb: "Your channel with the Dungeon Masters, and the groups they've made.",
};

export function sectionFor(pathname: string): Section | undefined {
  return SECTIONS.find((s) => s.path === pathname.replace(/\/+$/, ""));
}
