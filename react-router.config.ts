import type { Config } from "@react-router/dev/config";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { withContentSecurityPolicy } from "./csp";

export default {
  // SPA mode: the client build is served by PocketBase from pb_public.
  ssr: false,
  // Writes the Content-Security-Policy into index.html, the page for every route (see csp.ts).
  async buildEnd({ reactRouterConfig, viteConfig }) {
    const index = path.join(reactRouterConfig.buildDirectory, "client", "index.html");
    const html = await readFile(index, "utf8");
    await writeFile(index, withContentSecurityPolicy(html, viteConfig.env.VITE_POCKETBASE_URL));
  },
} satisfies Config;
