import { join } from "path"
import { readFileSync, readdirSync, statSync, existsSync, lstatSync } from "fs"
import yaml from "yaml"
import { ALL_BUCKETS } from "../../registry/local"
import { readProtectedCoreAssets } from "../../registry/core"

export function validateRegistryIntegrity(chainHome: string, errors: string[]) {
  const registryPath = join(chainHome, "skills-registry.yaml")
  const skillsDir = join(chainHome, "skills")
  const protectedCoreSkillSet = new Set(readProtectedCoreAssets(chainHome).skills)

  if (!existsSync(registryPath)) {
    errors.push(
      "Missing skills-registry.yaml — CHAIN_HOME is not initialized. Run `chain init` first (then `chain validate` again).",
    )
    return
  }

  try {
    const registryContent = readFileSync(registryPath, "utf-8")
    const registry = yaml.parse(registryContent)

    const registeredSlugs = ALL_BUCKETS.flatMap((key) => (registry[key] || []).map((s: unknown) => String(s)))

    const seen = new Set<string>()
    for (const slug of registeredSlugs) {
      if (seen.has(slug)) {
        errors.push("Duplicate registry slug '" + slug + "' in skills-registry.yaml (each skill must appear in one bucket only)")
      }
      seen.add(slug)
    }

    const selfSlugs: string[] = (registry.authorship?.self || []).map((s: unknown) => String(s))
    for (const slug of selfSlugs) {
      if (!registeredSlugs.includes(slug)) {
        errors.push(
          "authorship.self slug '" + slug + "' is not listed in chain_hub, personal, packs, community, or cli_packages",
        )
      }
    }

    const githubBundled = new Set<string>()
    for (const bundle of registry.github_sources || []) {
      if (!bundle.github || typeof bundle.github !== "string" || !bundle.github.startsWith("github:")) {
        errors.push("github_sources entry must have a 'github' string starting with github:")
        continue
      }
      if (!bundle.credits || typeof bundle.credits !== "string" || bundle.credits.trim().length === 0) {
        errors.push("github_sources entry for '" + bundle.github + "' must have non-empty 'credits'")
      }
      const skills = Array.isArray(bundle.skills) ? bundle.skills.map((s: unknown) => String(s)) : []
      for (const slug of skills) {
        if (!registeredSlugs.includes(slug)) {
          errors.push(
            "github_sources skill '" + slug + "' is not in chain_hub, personal, packs, community, or cli_packages",
          )
        }
        if (githubBundled.has(slug)) {
          errors.push("Skill '" + slug + "' appears in more than one github_sources bundle (use a single repo per skill)")
        }
        githubBundled.add(slug)
      }
    }

    // Check for registered slugs without a directory
    for (const slug of registeredSlugs) {
      const path = join(skillsDir, slug)
      if (!existsSync(path)) {
        errors.push("Registry slug '" + slug + "' has no directory under skills/")
      }
    }

    // Check for directories without a registration
    if (existsSync(skillsDir)) {
      const actualDirs = readdirSync(skillsDir).filter(d => {
        const p = join(skillsDir, d)
        if (!existsSync(p)) return false
        return !d.startsWith("_") && (statSync(p).isDirectory() || lstatSync(p).isSymbolicLink())
      })

      for (const dir of actualDirs) {
        if (!registeredSlugs.includes(dir) && !protectedCoreSkillSet.has(dir)) {
          errors.push("Directory '" + dir + "' in skills/ is not in registry")
        }
      }
    }
  } catch (e) {
    errors.push("Invalid YAML in skills-registry.yaml: " + (e instanceof Error ? e.message : String(e)))
  }
}
