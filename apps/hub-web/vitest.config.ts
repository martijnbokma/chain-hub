import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

import { baseCoverage } from "../../vitest.shared";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src")
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      ...baseCoverage,
      include: ["src/**/*.{ts,tsx}"],
      // Pure type re-exports and app bootstrap have no executable logic to cover.
      exclude: ["src/types/**", "src/main.tsx", "src/app.tsx", "src/**/*.test.{ts,tsx}", "src/test/**"],
      thresholds: {
        statements: 50,
        branches: 70,
        functions: 40,
        lines: 50
      }
    }
  }
});
