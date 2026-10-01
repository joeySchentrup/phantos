/// <reference types="vitest/config" />
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const silenceChromeDevtoolsProbe = {
  name: "silence-chrome-devtools-probe",
  configureServer(server: import("vite").ViteDevServer) {
    server.middlewares.use((req, res, next) => {
      if (req.url === "/.well-known/appspecific/com.chrome.devtools.json") {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end("{}");
        return;
      }
      next();
    });
  },
};

export default defineConfig({
  // The React Router plugin can't run under vitest, which only needs the path aliases.
  plugins: [silenceChromeDevtoolsProbe, !process.env.VITEST && reactRouter(), tsconfigPaths()],
  css: {
    postcss: "./postcss.config.mjs"
  },
  test: {
    include: ["testing/**/*.test.ts"],
  },
});
