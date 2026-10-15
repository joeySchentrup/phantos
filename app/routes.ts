import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/lore", "routes/lore.tsx"),
  route("/lore/:slug", "routes/loreEntry.tsx"),
  route("/atlas", "routes/atlas.tsx"),
  route("/chronicle", "routes/chronicle.tsx"),
  route("/pantheon", "routes/pantheon.tsx"),
  route("/pantheon/:slug", "routes/pantheonEntry.tsx"),
  route("/heroes", "routes/heroes.tsx"),
  // A hero's lore page and their private character sheet share the hero, and
  // the tabs between them.
  layout("routes/heroLayout.tsx", [
    route("/heroes/:slug", "routes/heroEntry.tsx"),
    route("/heroes/:slug/sheet", "routes/heroSheet.tsx"),
  ]),
  // One player for the list and every song's page, so a song keeps playing
  // from the list into its lyrics; leaving the section stops it.
  layout("routes/songsLayout.tsx", [
    route("/songs", "routes/songs.tsx"),
    route("/songs/:slug", "routes/songEntry.tsx"),
  ]),
  // Reached from a hero's page; deliberately not one of the SECTIONS in the top bar.
  route("/electrum", "routes/electrum.tsx"),
  // Players join and sign in here; linked from the footer, like the DM's desk.
  route("/players", "routes/players.tsx"),

  route("/dm", "routes/dm.tsx"),
  route("/dm/lore/new", "routes/dmEditor.tsx", { id: "dm-lore-new" }),
  route("/dm/lore/:id", "routes/dmEditor.tsx", { id: "dm-lore-edit" }),
  route("/dm/pantheon/new", "routes/dmPantheonEditor.tsx", { id: "dm-pantheon-new" }),
  route("/dm/pantheon/:id", "routes/dmPantheonEditor.tsx", { id: "dm-pantheon-edit" }),
  route("/dm/heroes/new", "routes/dmHeroEditor.tsx", { id: "dm-hero-new" }),
  route("/dm/heroes/:id", "routes/dmHeroEditor.tsx", { id: "dm-hero-edit" }),
  route("/dm/songs/new", "routes/dmSongEditor.tsx", { id: "dm-song-new" }),
  route("/dm/songs/:id", "routes/dmSongEditor.tsx", { id: "dm-song-edit" }),
] satisfies RouteConfig;
