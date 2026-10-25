import { defineConfig } from "vitest/config";

import { baseCoverage } from "../../vitest.shared";

export default defineConfig({
  test: {
    // Git-heavy integration tests (bare remotes, multi-clone syncs) exceed the
    // 5s default on slower CI runners.
    testTimeout: 30_000,
    coverage: {
      ...baseCoverage,
      include: ["src/**/*.ts"],
      thresholds: {
        statements: 83,
        branches: 71,
        functions: 92,
        lines: 83
      }
    }
  }
});
