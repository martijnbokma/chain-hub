import { join } from "path"
import { existsSync, readFileSync, statSync, renameSync, rmSync } from "fs"
import { parse } from "yaml"
import { readRegistry, addSkill, removeSkill as registryRemoveSkill, writeRegistry, isProtectedCoreSkill } from "../registry/local"
import { ensureCoreAssets, ensureUserRegistry } from "../utils/core-assets"
import type { InstallBucket } from "../registry/local"
import {
  createContent,
  deleteContent,
  listContent,
  readContent,
  updateContent,
} from "./content-service"

function ensureInitialized(chainHome: string): void {
  ensureCoreAssets({ chainHome })
  ensureUserRegistry({ chainHome })
}

export interface SkillEntry {
  slug: string
  description: string
  bucket: InstallBucket | "core" | "unknown"
  isCore: boolean
  addedAt: number | null
  githubRef?: string
  githubOwner?: string
  credits?: string
  deactivated: boolean
}

export interface SkillsListPayload {
  skills: SkillEntry[]
  initialized: boolean
}

export function isHubInitialized(chainHome: string): boolean {
  return existsSync(join(chainHome, "skills-registry.yaml")) && existsSync(join(chainHome, "core", "registry.yaml"))
}

const SKILL_TEMPLATE = `---
name: SLUG
description: >-
  TODO: describe this skill in one sentence. Include trigger terms for discovery.
---

# SLUG

## When to Use

TODO

## NOT When to Use

TODO

## Process

TODO

## Verification Checklist

- [ ] TODO
`

function readSkillDescription(skillMdPath: string): string {
  if (!existsSync(skillMdPath)) return ""
  try {
    const content = readFileSync(skillMdPath, "utf8")
    const match = content.match(/^---\n([\s\S]*?)\n---/)
    if (!match) return ""
    const fm = parse(match[1]!) as Record<string, unknown>
    return typeof fm.description === "string" ? fm.description.trim() : ""
  } catch {
    return ""
  }
}

function readSkillAddedAt(skillMdPath: string): number | null {
  if (!existsSync(skillMdPath)) return null
  try {
    return statSync(skillMdPath).mtimeMs
  } catch {
    return null
  }
}

export function listSkills(chainHome: string): { coreSkills: SkillEntry[]; userSkills: SkillEntry[] } {
  const registry = readRegistry(chainHome)
  const githubRef = new Map<string, string>()
  const githubCredits = new Map<string, string>()

  for (const bundle of registry.github_sources ?? []) {
    for (const slug of bundle.skills ?? []) {
      githubRef.set(slug, bundle.github)
      githubCredits.set(slug, bundle.credits)
    }
  }

  // Auto-detect superpower skills from obra if not explicitly listed
  const allSkillsRaw = listContent(chainHome, "skills")
  for (const s of allSkillsRaw) {
    if (s.slug.includes("superpowers") && !githubRef.has(s.slug)) {
      githubRef.set(s.slug, "github:obra/superpowers")
      githubCredits.set(s.slug, "obra/superpowers — https://github.com/obra/superpowers")
    }
  }

  const bucketFor = (slug: string): InstallBucket | "unknown" => {
    const isSelf = (registry.authorship?.self ?? []).includes(slug)
    const hasGithub = githubRef.has(slug)

    if ((registry.chain_hub ?? []).includes(slug)) return "chain_hub"
    if ((registry.packs ?? []).includes(slug)) return "packs"
    if ((registry.community ?? []).includes(slug)) return "community"
    if ((registry.cli_packages ?? []).includes(slug)) return "cli_packages"
    
    // If it has a GitHub source and isn't authored by the user, it's a community skill
    if (hasGithub && !isSelf) return "community"
    
    if ((registry.personal ?? []).includes(slug)) return "personal"
    return "unknown"
  }

  const deactivatedSlugs = registry.deactivated_skills ?? []
  const allSkills = listContent(chainHome, "skills")
  
  const mapSkill = (s: any, isCore: boolean): SkillEntry => {
    const ref = githubRef.get(s.slug)
    let githubOwner: string | undefined = undefined
    let credits = githubCredits.get(s.slug)
    
    if (isCore) {
      githubOwner = "martijnbokma"
    } else if (ref && ref.startsWith("github:")) {
      const parts = ref.split("github:")[1]?.split("/")
      if (parts && parts[0]) {
        githubOwner = parts[0]
      }
    }

    return {
      slug: s.slug,
      description: readSkillDescription(s.path),
      bucket: isCore ? "core" : bucketFor(s.slug),
      isCore,
      addedAt: readSkillAddedAt(s.path),
      githubRef: ref,
      githubOwner,
      credits,
      deactivated: deactivatedSlugs.includes(s.slug),
    }
  }

  const coreSkills: SkillEntry[] = allSkills
    .filter((s) => s.isCore)
    .map((s) => mapSkill(s, true))

  const userSkills: SkillEntry[] = allSkills
    .filter((s) => !s.isCore)
    .map((s) => mapSkill(s, false))

  // Add deactivated user skills (that are hidden in the filesystem)
  for (const slug of deactivatedSlugs) {
    if (isProtectedCoreSkill(slug, chainHome)) continue
    
    const deactivatedPath = join(chainHome, "skills", `.deactivated-${slug}`)
    const skillMdPath = join(deactivatedPath, "SKILL.md")
    if (existsSync(skillMdPath)) {
      const ref = githubRef.get(slug)
      let githubOwner: string | undefined = undefined
      if (ref && ref.startsWith("github:")) {
        const parts = ref.split("github:")[1]?.split("/")
        if (parts && parts[0]) {
          githubOwner = parts[0]
        }
      }

      userSkills.push({
        slug,
        description: readSkillDescription(skillMdPath),
        bucket: bucketFor(slug),
        isCore: false,
        addedAt: readSkillAddedAt(skillMdPath),
        githubRef: ref,
        githubOwner,
        deactivated: true,
      })
    }
  }

  return { coreSkills, userSkills }
}

export function listSkillsPayload(chainHome: string): SkillsListPayload {
  ensureInitialized(chainHome)
  const initialized = isHubInitialized(chainHome)
  const { coreSkills, userSkills } = listSkills(chainHome)
  return { skills: [...coreSkills, ...userSkills], initialized }
}

export function readSkill(chainHome: string, slug: string): SkillEntry & { content: string } {
  const result = readContent(chainHome, "skills", slug)
  const { coreSkills, userSkills } = listSkills(chainHome)
  const all = [...coreSkills, ...userSkills]
  const entry = all.find(s => s.slug === slug)
  
  if (!entry) {
    return {
      slug,
      description: "",
      bucket: result.isCore ? "core" : "unknown",
      isCore: result.isCore,
      addedAt: null,
      githubOwner: result.isCore ? "martijnbokma" : undefined,
      deactivated: false,
      content: result.content
    }
  }

  return { ...entry, content: result.content }
}

export function writeSkill(chainHome: string, slug: string, content: string, newSlug?: string): void {
  updateContent(chainHome, { kind: "skills", slug, content, newSlug })
}

export function createSkill(chainHome: string, slug: string, description?: string): void {
  const normalizedDescription = typeof description === "string" ? description.trim() : ""
  const templateDescription =
    normalizedDescription || "TODO: describe this skill in one sentence. Include trigger terms for discovery."
  const skillContent = SKILL_TEMPLATE
    .replace(/SLUG/g, slug)
    .replace(
      "TODO: describe this skill in one sentence. Include trigger terms for discovery.",
      templateDescription,
    )

  createContent(chainHome, { kind: "skills", slug, content: skillContent })
  addSkill({ slug, bucket: "personal", chainHome })
}

export function removeSkill(chainHome: string, slug: string): void {
  const deactivatedPath = join(chainHome, "skills", `.deactivated-${slug}`)
  if (existsSync(deactivatedPath)) {
    rmSync(deactivatedPath, { recursive: true, force: true })
  } else {
    deleteContent(chainHome, "skills", slug)
  }
  registryRemoveSkill(slug, chainHome)
}

export function toggleSkill(chainHome: string, slug: string, enabled: boolean): void {
  const registry = readRegistry(chainHome)
  const deactivated = registry.deactivated_skills ?? []
  
  const normalPath = join(chainHome, "skills", slug)
  const deactivatedPath = join(chainHome, "skills", `.deactivated-${slug}`)

  if (enabled) {
    // Activate
    if (existsSync(deactivatedPath)) {
      renameSync(deactivatedPath, normalPath)
    }
    registry.deactivated_skills = deactivated.filter((s) => s !== slug)
  } else {
    // Deactivate
    if (existsSync(normalPath)) {
      renameSync(normalPath, deactivatedPath)
    }
    if (!deactivated.includes(slug)) {
      deactivated.push(slug)
      registry.deactivated_skills = deactivated
    }
  }

  writeRegistry(registry, chainHome)
}
