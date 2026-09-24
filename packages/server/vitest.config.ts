import { defineConfig } from "vitest/config";

import { baseCoverage } from "../../vitest.shared";

export default defineConfig({
  test: {
    coverage: {
      ...baseCoverage,
      include: ["src/**/*.ts"],
      thresholds: {
        statements: 58,
        branches: 69,
        functions: 58,
        lines: 59
      }
    }
  }
});
