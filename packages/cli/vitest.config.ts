import { defineConfig } from "vitest/config";

import { baseCoverage } from "../../vitest.shared";

export default defineConfig({
  test: {
    coverage: {
      ...baseCoverage,
      include: ["src/**/*.ts"],
      thresholds: {
        statements: 65,
        branches: 52,
        functions: 59,
        lines: 67
      }
    }
  }
});
