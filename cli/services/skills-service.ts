import { join } from "path"
import { existsSync, readFileSync, statSync } from "fs"
import { parse } from "yaml"
import { readRegistry, addSkill, removeSkill as registryRemoveSkill } from "../registry/local"
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

  const allSkills = listContent(chainHome, "skills")
  const coreSkills: SkillEntry[] = allSkills
    .filter((s) => s.isCore)
    .map((s) => ({
      slug: s.slug,
      description: readSkillDescription(s.path),
      bucket: "core",
      isCore: true,
      addedAt: readSkillAddedAt(s.path),
      githubRef: githubRef.get(s.slug),
    }))

  const userSkills: SkillEntry[] = allSkills
    .filter((s) => !s.isCore)
    .map((s) => ({
      slug: s.slug,
      description: readSkillDescription(s.path),
      bucket: bucketFor(s.slug),
      isCore: false,
      addedAt: readSkillAddedAt(s.path),
      githubRef: githubRef.get(s.slug),
    }))

  return { coreSkills, userSkills }
}

export function listSkillsPayload(chainHome: string): SkillsListPayload {
  ensureInitialized(chainHome)
  const initialized = isHubInitialized(chainHome)
  const { coreSkills, userSkills } = listSkills(chainHome)
  return { skills: [...coreSkills, ...userSkills], initialized }
}

export function readSkill(chainHome: string, slug: string): { content: string; isCore: boolean } {
  const result = readContent(chainHome, "skills", slug)
  return { content: result.content, isCore: result.isCore }
}

export function writeSkill(chainHome: string, slug: string, content: string): void {
  updateContent(chainHome, { kind: "skills", slug, content })
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
  deleteContent(chainHome, "skills", slug)
  registryRemoveSkill(slug, chainHome)
}
