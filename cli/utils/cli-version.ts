import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * Reads version from the sibling package.json (works for `bun run chain.ts` and bundled `dist/chain.js`).
 */
export function readCliVersion(): string {
  const dir = dirname(fileURLToPath(import.meta.url))
  const pkgPath = join(dir, "..", "package.json")
  const raw = readFileSync(pkgPath, "utf8")
  const pkg = JSON.parse(raw) as { version?: string }
  if (typeof pkg.version !== "string" || !pkg.version.length) {
    throw new Error("package.json is missing a valid version field")
  }
  return pkg.version
}
