import { defineConfig } from "vitest/config";

import { baseCoverage } from "../../vitest.shared";

export default defineConfig({
  test: {
    coverage: {
      ...baseCoverage,
      include: ["src/**/*.ts"],
      thresholds: {
        statements: 42,
        branches: 70,
        functions: 46,
        lines: 42
      }
    }
  }
});
