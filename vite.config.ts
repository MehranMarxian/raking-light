import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  // GitHub Pages serves the site from /raking-light/. Build and preview use that path;
  // the dev server and tests stay at the root.
  base: mode === "production" ? "/raking-light/" : "/",
  plugins: [react()],
  worker: {
    format: "es",
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
}));
