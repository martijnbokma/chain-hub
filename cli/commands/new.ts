import kleur from "kleur"
import { join } from "path"
import { mkdirSync, existsSync, writeFileSync } from "fs"
import { getChainHome } from "../utils/chain-home"
import { addSkill } from "../registry/local"
import { assertValidSkillSlug } from "../utils/skill-slug"

const TEMPLATE = `---
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

export async function runNew(slug: string): Promise<void> {
  const safeSlug = assertValidSkillSlug(slug)
  const chainHome = getChainHome()
  const dest = join(chainHome, "skills", safeSlug)

  if (existsSync(dest)) {
    console.error(kleur.red(`\n  Skill '${safeSlug}' already exists at ${dest}\n`))
    process.exit(1)
  }

  mkdirSync(dest, { recursive: true })
  writeFileSync(join(dest, "SKILL.md"), TEMPLATE.replace(/SLUG/g, safeSlug), "utf8")

  addSkill({ slug: safeSlug, bucket: "personal" })

  console.log(kleur.green(`\n  ✓ Created ${dest}/SKILL.md`))
  console.log(kleur.dim(`  Registered '${safeSlug}' in skills-registry.yaml (personal). Edit the file, then run: chain validate\n`))
}
