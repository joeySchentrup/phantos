import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/lore", "routes/lore.tsx"),
  route("/lore/:slug", "routes/loreEntry.tsx"),
  route("/chronicle", "routes/chronicle.tsx"),

  // Sections that haven't been built yet share one face-down page.
  route("/atlas", "routes/comingSoon.tsx", { id: "atlas" }),
  route("/pantheon", "routes/comingSoon.tsx", { id: "pantheon" }),
  route("/heroes", "routes/comingSoon.tsx", { id: "heroes" }),

  route("/dm", "routes/dm.tsx"),
  route("/dm/lore/new", "routes/dmEditor.tsx", { id: "dm-lore-new" }),
  route("/dm/lore/:id", "routes/dmEditor.tsx", { id: "dm-lore-edit" }),
] satisfies RouteConfig;
