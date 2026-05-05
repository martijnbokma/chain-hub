import { join } from "path"
import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync, readdirSync } from "fs"
import { parse } from "yaml"
import { readRegistry, addSkill, removeSkill as registryRemoveSkill } from "../registry/local"
import { isProtectedCoreSkill, readProtectedCoreAssets } from "../registry/core"
import { UserError } from "../utils/errors"
import type { InstallBucket } from "../registry/local"

export interface SkillEntry {
  slug: string
  description: string
  bucket: InstallBucket | "core" | "unknown"
  isCore: boolean
  githubRef?: string
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

function readSkillDescription(skillDir: string): string {
  const skillMdPath = join(skillDir, "SKILL.md")
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

export function listSkills(chainHome: string): { coreSkills: SkillEntry[]; userSkills: SkillEntry[] } {
  const core = readProtectedCoreAssets(chainHome)
  const registry = readRegistry(chainHome)

  const githubRef = new Map<string, string>()
  for (const bundle of registry.github_sources ?? []) {
    for (const slug of bundle.skills ?? []) {
      githubRef.set(slug, bundle.github)
    }
  }

  const bucketFor = (slug: string): InstallBucket | "unknown" => {
    if ((registry.chain_hub ?? []).includes(slug)) return "chain_hub"
    if ((registry.personal ?? []).includes(slug)) return "personal"
    if ((registry.packs ?? []).includes(slug)) return "packs"
    if ((registry.community ?? []).includes(slug)) return "community"
    if ((registry.cli_packages ?? []).includes(slug)) return "cli_packages"
    return "unknown"
  }

  const coreSkillsDir = join(chainHome, "core", "skills")
  const coreSkills: SkillEntry[] = core.skills.map((slug) => ({
    slug,
    description: readSkillDescription(join(coreSkillsDir, slug)),
    bucket: "core",
    isCore: true,
    githubRef: githubRef.get(slug),
  }))

  const userSkillsDir = join(chainHome, "skills")
  const userSlugs = existsSync(userSkillsDir)
    ? readdirSync(userSkillsDir, { withFileTypes: true })
        .filter((e) => (e.isDirectory() || e.isSymbolicLink()) && !e.name.startsWith("_"))
        .map((e) => e.name)
        .filter((slug) => !core.skills.includes(slug))
        .sort()
    : []

  const userSkills: SkillEntry[] = userSlugs.map((slug) => ({
    slug,
    description: readSkillDescription(join(userSkillsDir, slug)),
    bucket: bucketFor(slug),
    isCore: false,
    githubRef: githubRef.get(slug),
  }))

  return { coreSkills, userSkills }
}

export function readSkill(chainHome: string, slug: string): { content: string; isCore: boolean } {
  const isCore = isProtectedCoreSkill(slug, chainHome)
  const dir = isCore ? join(chainHome, "core", "skills", slug) : join(chainHome, "skills", slug)
  const skillMdPath = join(dir, "SKILL.md")

  if (!existsSync(skillMdPath)) {
    throw new UserError(`Skill '${slug}' not found.`)
  }

  return { content: readFileSync(skillMdPath, "utf8"), isCore }
}

export function writeSkill(chainHome: string, slug: string, content: string): void {
  if (isProtectedCoreSkill(slug, chainHome)) {
    throw new UserError(`'${slug}' is a protected core skill and cannot be modified.`)
  }

  const skillMdPath = join(chainHome, "skills", slug, "SKILL.md")
  if (!existsSync(join(chainHome, "skills", slug))) {
    throw new UserError(`Skill '${slug}' does not exist. Use createSkill to create it first.`)
  }

  writeFileSync(skillMdPath, content, "utf8")
}

export function createSkill(chainHome: string, slug: string): void {
  if (isProtectedCoreSkill(slug, chainHome)) {
    throw new UserError(`'${slug}' is a protected core skill and cannot be overwritten.`)
  }

  const dest = join(chainHome, "skills", slug)
  if (existsSync(dest)) {
    throw new UserError(`Skill '${slug}' already exists at ${dest}.`)
  }

  mkdirSync(dest, { recursive: true })
  writeFileSync(join(dest, "SKILL.md"), SKILL_TEMPLATE.replace(/SLUG/g, slug), "utf8")
  addSkill({ slug, bucket: "personal", chainHome })
}

export function removeSkill(chainHome: string, slug: string): void {
  if (isProtectedCoreSkill(slug, chainHome)) {
    throw new UserError(
      `'${slug}' is a protected Chain Hub core skill and cannot be removed.`,
    )
  }

  const skillDir = join(chainHome, "skills", slug)
  if (existsSync(skillDir)) {
    rmSync(skillDir, { recursive: true })
  }

  registryRemoveSkill(slug, chainHome)
}
