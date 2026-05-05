import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"
import { mkdirSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { runValidate } from "./validate"

// Minimal valid skills-registry.yaml with no user skills
const EMPTY_REGISTRY = `schema_version: 3
chain_hub: []
personal: []
packs: []
community: []
cli_packages: []
`

// Minimal valid core/registry.yaml with nothing protected
const EMPTY_CORE_REGISTRY = `schema_version: 1
protected:
  skills: []
  rules: []
  agents: []
  workflows: []
`

describe("runValidate", () => {
  let tmp: string
  let originalChainHome: string | undefined
  let originalLog: typeof console.log
  let lines: string[]

  beforeEach(() => {
    tmp = join(tmpdir(), `chain-validate-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(join(tmp, "core"), { recursive: true })

    // Write the core registry so readProtectedCoreAssets returns empty lists
    writeFileSync(join(tmp, "core", "registry.yaml"), EMPTY_CORE_REGISTRY)

    originalChainHome = process.env.CHAIN_HOME
    process.env.CHAIN_HOME = tmp

    originalLog = console.log
    lines = []
    console.log = (...args: unknown[]) => {
      lines.push(args.map(String).join(" "))
    }
  })

  afterEach(() => {
    console.log = originalLog
    if (originalChainHome === undefined) delete process.env.CHAIN_HOME
    else process.env.CHAIN_HOME = originalChainHome
    rmSync(tmp, { recursive: true, force: true })
  })

  test("happy path (no skills): empty CHAIN_HOME with valid empty registry passes validation", async () => {
    writeFileSync(join(tmp, "skills-registry.yaml"), EMPTY_REGISTRY)

    await runValidate()

    const output = lines.join("\n")
    expect(output).toContain("All quality checks passed!")
  })

  test("happy path (valid skill): skill with valid SKILL.md passes validation", async () => {
    // Create a skill directory and register it
    const skillSlug = "my-test-skill"
    mkdirSync(join(tmp, "skills", skillSlug), { recursive: true })
    writeFileSync(
      join(tmp, "skills", skillSlug, "SKILL.md"),
      `---
name: ${skillSlug}
description: Processes test data and validates output for automated test pipelines.
---

This skill processes test data.
`,
    )

    // Register the skill in the user registry
    writeFileSync(
      join(tmp, "skills-registry.yaml"),
      `schema_version: 3
chain_hub: []
personal:
  - ${skillSlug}
packs: []
community: []
cli_packages: []
`,
    )

    await runValidate()

    const output = lines.join("\n")
    expect(output).toContain("All quality checks passed!")
    expect(output).toContain("Skills processed:")
  })

  test("error path (missing registry): no skills-registry.yaml causes process.exit(1)", async () => {
    // Do NOT write skills-registry.yaml

    const exitSpy = mock((code: number) => {
      throw new Error(`process.exit(${code})`)
    })
    const originalExit = process.exit
    process.exit = exitSpy as never

    try {
      await expect(runValidate()).rejects.toThrow("process.exit(1)")
    } finally {
      process.exit = originalExit
    }

    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  test("error path (missing registry): output mentions skills-registry.yaml", async () => {
    // Do NOT write skills-registry.yaml

    const exitSpy = mock((_code: number) => {
      throw new Error("process.exit")
    })
    const originalExit = process.exit
    process.exit = exitSpy as never

    try {
      await runValidate().catch(() => {})
    } finally {
      process.exit = originalExit
    }

    const output = lines.join("\n")
    expect(output).toContain("skills-registry.yaml")
  })

  test("error path (bad frontmatter): skill with empty frontmatter causes process.exit(1)", async () => {
    const skillSlug = "bad-skill"
    mkdirSync(join(tmp, "skills", skillSlug), { recursive: true })
    // Empty frontmatter — no name, no description
    writeFileSync(
      join(tmp, "skills", skillSlug, "SKILL.md"),
      `---
---

Some body content here.
`,
    )

    writeFileSync(
      join(tmp, "skills-registry.yaml"),
      `schema_version: 3
chain_hub: []
personal:
  - ${skillSlug}
packs: []
community: []
cli_packages: []
`,
    )

    const exitSpy = mock((code: number) => {
      throw new Error(`process.exit(${code})`)
    })
    const originalExit = process.exit
    process.exit = exitSpy as never

    try {
      await expect(runValidate()).rejects.toThrow("process.exit(1)")
    } finally {
      process.exit = originalExit
    }

    expect(exitSpy).toHaveBeenCalledWith(1)

    const output = lines.join("\n")
    expect(output).toContain("Validation failed")
  })
})
