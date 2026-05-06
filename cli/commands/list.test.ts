import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdirSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { runList } from "./list"

describe("runList", () => {
  let tmp: string
  let originalChainHome: string | undefined
  let originalLog: typeof console.log
  let lines: string[]

  beforeEach(() => {
    tmp = join(tmpdir(), `chain-list-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(join(tmp, "skills", "personal-skill"), { recursive: true })
    mkdirSync(join(tmp, "core", "skills", "canvas"), { recursive: true })
    writeFileSync(
      join(tmp, "skills-registry.yaml"),
      `schema_version: 3
chain_hub: []
personal:
  - personal-skill
cli_packages: []
`,
    )
    writeFileSync(
      join(tmp, "core", "registry.yaml"),
      `schema_version: 1
protected:
  skills:
    - canvas
  rules: []
  agents: []
  workflows: []
`,
    )
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

  test("shows protected core skills separately from user-installed skills", async () => {
    await runList()

    const output = lines.join("\n")
    expect(output).toContain("Protected core skills")
    expect(output).toContain("canvas")
    expect(output).toContain("User-installed skills")
    expect(output).toContain("personal-skill")
  })

  test("shows protected core agents and workflows when listed in registry", async () => {
    rmSync(join(tmp, "skills"), { recursive: true, force: true })
    writeFileSync(
      join(tmp, "skills-registry.yaml"),
      `schema_version: 3
chain_hub: []
personal: []
cli_packages: []
`,
    )
    writeFileSync(
      join(tmp, "core", "registry.yaml"),
      `schema_version: 1
protected:
  skills: []
  rules: []
  agents:
    - chain-onboarding
  workflows:
    - chain-quickstart
`,
    )
    mkdirSync(join(tmp, "agents"), { recursive: true })
    writeFileSync(join(tmp, "agents", "chain-onboarding.md"), "---\nname: x\ndescription: y\n---\n")
    mkdirSync(join(tmp, "workflows"), { recursive: true })
    writeFileSync(join(tmp, "workflows", "chain-quickstart.md"), "# x\n")

    lines.length = 0
    await runList()

    const output = lines.join("\n")
    expect(output).toContain("Protected core agents")
    expect(output).toContain("chain-onboarding")
    expect(output).toContain("Protected core workflows")
    expect(output).toContain("chain-quickstart")
    expect(output).not.toContain("Protected core skills")
  })

  test("shows protected core rules and user rules", async () => {
    rmSync(join(tmp, "skills"), { recursive: true, force: true })
    writeFileSync(
      join(tmp, "skills-registry.yaml"),
      `schema_version: 3
chain_hub: []
personal: []
cli_packages: []
`,
    )
    writeFileSync(
      join(tmp, "core", "registry.yaml"),
      `schema_version: 1
protected:
  skills: []
  rules:
    - global
  agents: []
  workflows: []
`,
    )
    mkdirSync(join(tmp, "rules"), { recursive: true })
    writeFileSync(join(tmp, "rules", "global.md"), "# core")
    writeFileSync(join(tmp, "rules", "user-rule.mdc"), "# user")

    lines.length = 0
    await runList()

    const output = lines.join("\n")
    expect(output).toContain("Protected core rules")
    expect(output).toContain("global")
    expect(output).toContain("User rules")
    expect(output).toContain("user-rule")
  })
})
