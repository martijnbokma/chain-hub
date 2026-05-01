import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdirSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { validateWorkflowContent } from "./workflow"

const VALID_WORKFLOW = `---
description: A complete workflow for demonstration purposes.
version: 1.0.0
---
## When to Use
- Use when you need this.

## NOT When to Use
- Skip when irrelevant.

## AI Execution Guidelines
### Style & Tone
- Be clear.

## Process
1. Step one.
2. Step two.

## Output
### Format
Markdown.

## Verification Checklist
- [ ] Done.

## Related Skills
- [My Skill](../my-skill/SKILL.md)

## Related Workflows
- [Other](../other.md)

Checkpoint: Confirm before proceeding.
`

describe("validateWorkflowContent", () => {
  let tmp: string

  beforeEach(() => {
    tmp = join(tmpdir(), `chain-workflow-validator-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(tmp, { recursive: true })
  })

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true })
  })

  function writeworkflow(name: string, content: string): string {
    const path = join(tmp, `${name}.md`)
    writeFileSync(path, content)
    return path
  }

  test("passes for a valid workflow", () => {
    const path = writeworkflow("my-workflow", VALID_WORKFLOW)
    const errors: string[] = []
    const warnings: string[] = []
    validateWorkflowContent(path, errors, warnings)
    expect(errors).toEqual([])
    expect(warnings).toEqual([])
  })

  test("errors when file exceeds 12000 characters", () => {
    const path = writeworkflow("huge-workflow", "x".repeat(12001))
    const errors: string[] = []
    validateWorkflowContent(path, errors, [])
    expect(errors.some((e) => e.includes("12,000 character limit"))).toBe(true)
  })

  test("errors when frontmatter is missing", () => {
    const path = writeworkflow("no-frontmatter", "# No frontmatter\nJust content.\n")
    const errors: string[] = []
    validateWorkflowContent(path, errors, [])
    expect(errors.some((e) => e.includes("Missing YAML frontmatter"))).toBe(true)
  })

  test("errors when description is missing from frontmatter", () => {
    const content = `---\nversion: 1.0.0\n---\n## When to Use\n- x\n## NOT When to Use\n- x\n## AI Execution Guidelines\n- x\n## Process\n1. x\n## Output\n- x\n## Verification Checklist\n- [ ] x\n## Related Skills\n- x\n## Related Workflows\n- x\nCheckpoint: confirm\n`
    const path = writeworkflow("no-desc", content)
    const errors: string[] = []
    validateWorkflowContent(path, errors, [])
    expect(errors.some((e) => e.includes("Missing 'description'"))).toBe(true)
  })

  test("errors when version is missing from frontmatter", () => {
    const content = `---\ndescription: Some description here.\n---\n## When to Use\n- x\n## NOT When to Use\n- x\n## AI Execution Guidelines\n- x\n## Process\n1. x\n## Output\n- x\n## Verification Checklist\n- [ ] x\n## Related Skills\n- x\n## Related Workflows\n- x\nCheckpoint: confirm\n`
    const path = writeworkflow("no-version", content)
    const errors: string[] = []
    validateWorkflowContent(path, errors, [])
    expect(errors.some((e) => e.includes("Missing 'version'"))).toBe(true)
  })

  test("errors for each missing required section", () => {
    const path = writeworkflow("minimal", `---\ndescription: x\nversion: 1\n---\nNo sections.\n`)
    const errors: string[] = []
    validateWorkflowContent(path, errors, [])
    expect(errors.some((e) => e.includes("## When to Use"))).toBe(true)
    expect(errors.some((e) => e.includes("## Process"))).toBe(true)
    expect(errors.some((e) => e.includes("## Verification Checklist"))).toBe(true)
  })

  test("warns when no Checkpoint: marker is present", () => {
    const noCheckpoint = VALID_WORKFLOW.replace("Checkpoint: Confirm before proceeding.", "")
    const path = writeworkflow("no-checkpoint", noCheckpoint)
    const errors: string[] = []
    const warnings: string[] = []
    validateWorkflowContent(path, errors, warnings)
    expect(warnings.some((w) => w.includes("Checkpoint:"))).toBe(true)
  })
})
