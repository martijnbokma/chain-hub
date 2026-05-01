import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdirSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { validateSkillContent } from "./skill"

const VALID_SKILL = `---
name: my-skill
description: A long enough description that passes the minimum length check easily.
---
# My Skill

## When to Use
- Use this skill when you need to do something.
`

describe("validateSkillContent", () => {
  let tmp: string

  beforeEach(() => {
    tmp = join(tmpdir(), `chain-skill-validator-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(tmp, { recursive: true })
  })

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true })
  })

  function writeSkill(slug: string, content: string): string {
    const dir = join(tmp, slug)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, "SKILL.md"), content)
    return dir
  }

  test("passes for a valid skill", () => {
    const dir = writeSkill("my-skill", VALID_SKILL)
    const errors: string[] = []
    const warnings: string[] = []
    validateSkillContent(dir, errors, warnings)
    expect(errors).toEqual([])
  })

  test("errors when SKILL.md is missing", () => {
    mkdirSync(join(tmp, "empty-skill"), { recursive: true })
    const errors: string[] = []
    validateSkillContent(join(tmp, "empty-skill"), errors, [])
    expect(errors).toContain("Skill empty-skill: Missing SKILL.md")
  })

  test("errors when frontmatter is absent", () => {
    const dir = writeSkill("no-frontmatter", "# Just a heading\nNo frontmatter here.\n")
    const errors: string[] = []
    validateSkillContent(dir, errors, [])
    expect(errors).toContain("Skill no-frontmatter: Missing YAML frontmatter in SKILL.md")
  })

  test("errors when name is not kebab-case", () => {
    const dir = writeSkill("BadName", `---\nname: BadName\ndescription: A long enough description that passes the minimum length check easily.\n---\nBody.\n`)
    const errors: string[] = []
    validateSkillContent(dir, errors, [])
    expect(errors.some((e) => e.includes("kebab-case"))).toBe(true)
  })

  test("errors when name exceeds 64 characters", () => {
    const longName = "a-".repeat(33).slice(0, 65)
    const dir = writeSkill("long-name", `---\nname: ${longName}\ndescription: A long enough description.\n---\nBody.\n`)
    const errors: string[] = []
    validateSkillContent(dir, errors, [])
    expect(errors.some((e) => e.includes("64 characters"))).toBe(true)
  })

  test("errors when name contains reserved word 'claude'", () => {
    const dir = writeSkill("claude-helper", `---\nname: claude-helper\ndescription: A long enough description that passes the minimum length check easily.\n---\nBody.\n`)
    const errors: string[] = []
    validateSkillContent(dir, errors, [])
    expect(errors.some((e) => e.includes("reserved words"))).toBe(true)
  })

  test("allows reserved name when allowReservedName option is set", () => {
    const dir = writeSkill("claude-helper", `---\nname: claude-helper\ndescription: A long enough description that passes the minimum length check easily.\n---\nBody.\n`)
    const errors: string[] = []
    validateSkillContent(dir, errors, [], { allowReservedName: true })
    expect(errors.some((e) => e.includes("reserved words"))).toBe(false)
  })

  test("errors when description is missing", () => {
    const dir = writeSkill("no-desc", `---\nname: no-desc\n---\nBody.\n`)
    const errors: string[] = []
    validateSkillContent(dir, errors, [])
    expect(errors.some((e) => e.includes("description"))).toBe(true)
  })

  test("warns when description is shorter than 40 characters", () => {
    const dir = writeSkill("short-desc", `---\nname: short-desc\ndescription: Too short.\n---\nBody.\n`)
    const errors: string[] = []
    const warnings: string[] = []
    validateSkillContent(dir, errors, warnings)
    expect(warnings.some((w) => w.includes("very short"))).toBe(true)
  })

  test("warns when description starts with first-person pronoun", () => {
    const dir = writeSkill("first-person", `---\nname: first-person\ndescription: I help you do something useful and meaningful in your codebase.\n---\nBody.\n`)
    const errors: string[] = []
    const warnings: string[] = []
    validateSkillContent(dir, errors, warnings)
    expect(warnings.some((w) => w.includes("third person"))).toBe(true)
  })

  test("warns when frontmatter name differs from directory name", () => {
    const dir = writeSkill("dir-name", `---\nname: different-name\ndescription: A long enough description that passes the minimum length check easily.\n---\nBody.\n`)
    const errors: string[] = []
    const warnings: string[] = []
    validateSkillContent(dir, errors, warnings)
    expect(warnings.some((w) => w.includes("differs from directory name"))).toBe(true)
  })
})
