/**
 * Fails when user-facing surfaces changed without docs updates.
 *
 * Run in CI with the push range, or locally against HEAD^..HEAD:
 *   bun scripts/check-docs-drift.ts [base] [head]
 */

import { execSync } from "node:child_process";

const base = process.argv[2] ?? "HEAD^";
const head = process.argv[3] ?? "HEAD";

const changed = execSync(`git diff --name-only ${base}..${head}`, { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

// Surfaces users read about in the docs: CLI commands, HTTP routes, schemas.
const USER_FACING = [
  "packages/cli/src/",
  "packages/server/src/routes/",
  "packages/contracts/src/",
  "packages/storage/src/adapters/"
];

const userFacing = changed.filter(
  (file) => USER_FACING.some((dir) => file.startsWith(dir)) && !file.includes(".test.")
);
const docsTouched = changed.some((file) => file.startsWith("apps/docs/"));

if (userFacing.length > 0 && !docsTouched) {
  console.error(
    [
      "User-facing code changed but apps/docs was not touched:",
      ...userFacing.map((file) => `  - ${file}`),
      "",
      "Update the docs in the same change (cli-reference, api-routes,",
      "editor-setup, …) or split this commit if the change is internal-only."
    ].join("\n")
  );
  process.exit(1);
}

console.log(
  docsTouched
    ? `Docs check OK — docs updated alongside ${userFacing.length} user-facing file(s).`
    : "Docs check OK — no user-facing surfaces changed."
);
