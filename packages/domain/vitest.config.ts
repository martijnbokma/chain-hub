import { defineConfig } from "vitest/config";

import { baseCoverage } from "../../vitest.shared";

export default defineConfig({
  test: {
    coverage: {
      ...baseCoverage,
      include: ["src/**/*.ts"],
      thresholds: {
        statements: 71,
        branches: 63,
        functions: 64,
        lines: 71
      }
    }
  }
});
