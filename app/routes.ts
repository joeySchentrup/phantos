import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/lore", "routes/lore.tsx"),
  route("/lore/:slug", "routes/loreEntry.tsx"),
  route("/chronicle", "routes/chronicle.tsx"),
  route("/pantheon", "routes/pantheon.tsx"),
  route("/pantheon/:slug", "routes/pantheonEntry.tsx"),
  route("/heroes", "routes/heroes.tsx"),
  route("/heroes/:slug", "routes/heroEntry.tsx"),

  // Sections that haven't been built yet share one face-down page.
  route("/atlas", "routes/comingSoon.tsx", { id: "atlas" }),

  route("/dm", "routes/dm.tsx"),
  route("/dm/lore/new", "routes/dmEditor.tsx", { id: "dm-lore-new" }),
  route("/dm/lore/:id", "routes/dmEditor.tsx", { id: "dm-lore-edit" }),
  route("/dm/pantheon/new", "routes/dmPantheonEditor.tsx", { id: "dm-pantheon-new" }),
  route("/dm/pantheon/:id", "routes/dmPantheonEditor.tsx", { id: "dm-pantheon-edit" }),
  route("/dm/heroes/new", "routes/dmHeroEditor.tsx", { id: "dm-hero-new" }),
  route("/dm/heroes/:id", "routes/dmHeroEditor.tsx", { id: "dm-hero-edit" }),
] satisfies RouteConfig;
