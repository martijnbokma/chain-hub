import { defineConfig } from "vitest/config";

import { baseCoverage } from "../../vitest.shared";

export default defineConfig({
  test: {
    coverage: {
      ...baseCoverage,
      include: ["src/**/*.ts"],
      thresholds: {
        statements: 74,
        branches: 58,
        functions: 75,
        lines: 75
      }
    }
  }
});
