import { existsSync, readFileSync, rmSync, writeFileSync } from "fs"
import { join } from "path"
import { parse, stringify } from "yaml"

export function normalizeSlugList(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value.map((item) => String(item)).filter((slug) => slug.length > 0)
}

// One-time registry migration (schema v3 → v4)
// One-time migration: drop the legacy `core:` bucket that was removed in schema_version 4.
// Skill directories that were only registered under `core:` and are no longer protected are
// deleted from skills/ to avoid false "not in registry" validator errors.
export function migrateLegacyCoreField(registryPath: string, skillsDir: string): void {
  let raw: Record<string, unknown>
  try {
    raw = (parse(readFileSync(registryPath, "utf8")) as Record<string, unknown>) ?? {}
  } catch {
    return
  }

  if (!Array.isArray(raw.core)) return

  const coreSlugs = (raw.core as unknown[]).map((s) => String(s))
  delete raw.core

  for (const slug of coreSlugs) {
    const dir = join(skillsDir, slug)
    if (existsSync(dir)) {
      try { rmSync(dir, { recursive: true, force: true }) } catch { /* best-effort */ }
    }
  }

  writeFileSync(registryPath, stringify(raw), "utf8")
}
