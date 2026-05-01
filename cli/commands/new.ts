import kleur from "kleur"
import { join } from "path"
import { mkdirSync, existsSync, writeFileSync } from "fs"
import { getChainHome } from "../utils/chain-home"

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
  const chainHome = getChainHome()
  const dest = join(chainHome, "skills", slug)

  if (existsSync(dest)) {
    console.error(kleur.red(`\n  Skill '${slug}' already exists at ${dest}\n`))
    process.exit(1)
  }

  mkdirSync(dest, { recursive: true })
  writeFileSync(join(dest, "SKILL.md"), TEMPLATE.replace(/SLUG/g, slug), "utf8")

  console.log(kleur.green(`\n  ✓ Created ${dest}/SKILL.md`))
  console.log(kleur.dim(`  Edit the file, then run: chain validate\n`))
}
