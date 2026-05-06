import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { runFix } from "./fix"

describe("runFix", () => {
  let tmp: string
  let originalChainHome: string | undefined

  beforeEach(() => {
    tmp = join(tmpdir(), `chain-fix-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(join(tmp, "skills"), { recursive: true })
    originalChainHome = process.env.CHAIN_HOME
    process.env.CHAIN_HOME = tmp
  })

  afterEach(() => {
    if (originalChainHome === undefined) delete process.env.CHAIN_HOME
    else process.env.CHAIN_HOME = originalChainHome
    rmSync(tmp, { recursive: true, force: true })
  })

  function writeSkill(slug: string, content: string): string {
    const dir = join(tmp, "skills", slug)
    mkdirSync(dir, { recursive: true })
    const path = join(dir, "SKILL.md")
    writeFileSync(path, content)
    return path
  }

  test("adds version to frontmatter when missing", async () => {
    const path = writeSkill("my-skill", `---\nname: my-skill\ndescription: A description.\n---\n# Body\n`)
    await runFix()
    expect(readFileSync(path, "utf-8")).toContain("version: 1.0.0")
  })

  test("adds last_updated to frontmatter when missing", async () => {
    const path = writeSkill("my-skill", `---\nname: my-skill\ndescription: A description.\n---\n# Body\n`)
    await runFix()
    const today = new Date().toISOString().split("T")[0]
    expect(readFileSync(path, "utf-8")).toContain(`last_updated: ${today}`)
  })

  test("does NOT add success_rate to frontmatter", async () => {
    const path = writeSkill("my-skill", `---\nname: my-skill\ndescription: A description.\n---\n# Body\n`)
    await runFix()
    expect(readFileSync(path, "utf-8")).not.toContain("success_rate")
  })

  test("does NOT add complexity to frontmatter", async () => {
    const path = writeSkill("my-skill", `---\nname: my-skill\ndescription: A description.\n---\n# Body\n`)
    await runFix()
    expect(readFileSync(path, "utf-8")).not.toContain("complexity:")
  })

  test("does NOT inject Quality Metrics section", async () => {
    const path = writeSkill("my-skill", `---\nname: my-skill\ndescription: A description.\n---\n# Body\n`)
    await runFix()
    expect(readFileSync(path, "utf-8")).not.toContain("Quality Metrics")
  })

  test("does NOT inject hardcoded 7/10 scores", async () => {
    const path = writeSkill("my-skill", `---\nname: my-skill\ndescription: A description.\n---\n# Body\n`)
    await runFix()
    expect(readFileSync(path, "utf-8")).not.toContain("7/10")
  })

  test("adds missing When to Use section", async () => {
    const path = writeSkill("my-skill", `---\nname: my-skill\ndescription: A description.\nversion: 1.0.0\nlast_updated: 2026-01-01\n---\n# Body\n`)
    await runFix()
    expect(readFileSync(path, "utf-8")).toContain("## When to Use")
  })

  test("does not modify a skill that already has all frontmatter and sections", async () => {
    const complete = `---
name: my-skill
description: A description.
version: 1.0.0
last_updated: 2026-01-01
---
# Body

## When to Use
- Something.

## NOT When to Use
- Not this.

## Key Principles
- Rule one.

## Output Format
\`\`\`markdown
template
\`\`\`

## Constraints
- One.

## Examples
### Success Example
Example here.

### Common Pitfalls
- Pitfall: Description.
`
    const path = writeSkill("my-skill", complete)
    const before = readFileSync(path, "utf-8")
    await runFix()
    expect(readFileSync(path, "utf-8")).toBe(before)
  })
})
