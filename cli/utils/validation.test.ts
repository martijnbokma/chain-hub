import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdirSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { validateProject } from "./validation"

describe("project validation", () => {
  let tmp: string

  beforeEach(() => {
    tmp = join(tmpdir(), `chain-validation-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(join(tmp, "skills"), { recursive: true })
  })

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true })
  })

  test("allows reserved names for github-sourced skills", () => {
    writeRegistry(`
schema_version: 3
chain_hub: []
personal:
  - claude-api
cli_packages: []
github_sources:
  - github: github:anthropics/skills
    credits: anthropics/skills
    skills:
      - claude-api
`)
    writeSkill("claude-api", "claude-api")

    const result = validateProject(tmp)

    expect(result.errors).toEqual([])
  })

  test("rejects reserved names for non-github-sourced skills", () => {
    writeRegistry(`
schema_version: 3
chain_hub: []
personal:
  - claude-api
cli_packages: []
`)
    writeSkill("claude-api", "claude-api")

    const result = validateProject(tmp)

    expect(result.errors).toContain("Skill claude-api: 'name' contains reserved words (anthropic/claude)")
  })

  test("reports missing protected core skill assets", () => {
    writeRegistry(`
schema_version: 3
chain_hub: []
personal: []
cli_packages: []
`)
    writeCoreRegistry(`
schema_version: 1
protected:
  skills:
    - phantom-skill
  rules: []
  agents: []
  workflows: []
`)

    const result = validateProject(tmp)

    expect(result.errors).toContain(
      "Core skill 'phantom-skill' is listed in core/registry.yaml but missing from core/skills/",
    )
  })

  test("accepts present protected core skill and rule assets", () => {
    writeRegistry(`
schema_version: 3
chain_hub: []
personal: []
cli_packages: []
`)
    writeCoreRegistry(`
schema_version: 1
protected:
  skills:
    - create-hook
  rules:
    - global
  agents: []
  workflows: []
`)
    writeCoreSkill("create-hook", "create-hook")
    mkdirSync(join(tmp, "core", "rules"), { recursive: true })
    writeFileSync(join(tmp, "core", "rules", "global.md"), "# Global Rule\n")

    const result = validateProject(tmp)

    expect(result.errors).toEqual([])
  })

  test("validates user rules and agents", () => {
    writeRegistry(`
schema_version: 3
chain_hub: []
personal: []
cli_packages: []
`)
    // Valid agent
    mkdirSync(join(tmp, "agents"), { recursive: true })
    writeFileSync(
      join(tmp, "agents", "my-agent.md"),
      `---
name: My Agent
description: A helpful agent.
---
# Content
`,
    )

    // Invalid agent (missing description)
    writeFileSync(
      join(tmp, "agents", "bad-agent.md"),
      `---
name: Bad Agent
---
# Content
`,
    )

    // Valid rule
    mkdirSync(join(tmp, "rules"), { recursive: true })
    writeFileSync(join(tmp, "rules", "my-rule.md"), "# Rule Content\n")

    // Too long rule
    writeFileSync(join(tmp, "rules", "long-rule.md"), "A".repeat(50001))

    const result = validateProject(tmp)

    expect(result.agentsProcessed).toBe(2)
    expect(result.rulesProcessed).toBe(2)
    expect(result.errors).toContain("Agent bad-agent.md: Missing 'description' in frontmatter")
    expect(result.errors).toContain("Rule long-rule.md: Exceeds 50,000 character limit")
  })

  function writeRegistry(content: string) {
    writeFileSync(join(tmp, "skills-registry.yaml"), content.trimStart())
  }

  function writeCoreRegistry(content: string) {
    mkdirSync(join(tmp, "core"), { recursive: true })
    writeFileSync(join(tmp, "core", "registry.yaml"), content.trimStart())
  }

  function writeSkill(slug: string, name: string) {
    mkdirSync(join(tmp, "skills", slug), { recursive: true })
    writeFileSync(
      join(tmp, "skills", slug, "SKILL.md"),
      `---
name: ${name}
description: Valid test description long enough for validation.
---
# Test Skill

## When to Use
- For validation tests.
`,
    )
  }

  function writeCoreSkill(slug: string, name: string) {
    mkdirSync(join(tmp, "core", "skills", slug), { recursive: true })
    writeFileSync(
      join(tmp, "core", "skills", slug, "SKILL.md"),
      `---
name: ${name}
description: Valid test description long enough for validation.
---
# Test Skill

## When to Use
- For validation tests.
`,
    )
  }
})
