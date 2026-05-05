import { existsSync, mkdirSync, writeFileSync } from "fs"
import { join } from "path"
import { ensureCoreAssets, ensureUserRegistry } from "../utils/core-assets"
import { addSkill, isProtectedCoreSkill } from "../registry/local"
import { UserError } from "../utils/errors"

export const SKILL_TEMPLATE = `---
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

const VALID_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function assertValidSkillSlug(slug: string): void {
  if (!VALID_SLUG_RE.test(slug)) {
    throw new UserError(
      `Invalid slug '${slug}'. Use lowercase letters, digits, and hyphens only (e.g. my-skill).`,
    )
  }
}

export function createSkill(chainHome: string, slug: string): void {
  ensureCoreAssets({ chainHome })
  ensureUserRegistry({ chainHome })

  assertValidSkillSlug(slug)

  if (isProtectedCoreSkill(slug, chainHome)) {
    throw new UserError(`'${slug}' is a protected core skill and cannot be overwritten.`)
  }

  const dest = join(chainHome, "skills", slug)

  if (existsSync(dest)) {
    throw new UserError(`Skill '${slug}' already exists at ${dest}`)
  }

  mkdirSync(dest, { recursive: true })
  writeFileSync(join(dest, "SKILL.md"), SKILL_TEMPLATE.replace(/SLUG/g, slug), "utf8")

  addSkill({ slug, bucket: "personal" })
}
