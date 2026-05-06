import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { runAssetEdit, runAssetList, runAssetNew, runAssetRemove } from "./content-assets"

describe("content-assets commands", () => {
  let hub: string
  let originalChainHome: string | undefined
  let originalLog: typeof console.log
  let lines: string[]

  beforeEach(() => {
    hub = join(tmpdir(), `chain-content-commands-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(join(hub, "core"), { recursive: true })
    mkdirSync(join(hub, "rules"), { recursive: true })
    mkdirSync(join(hub, "agents"), { recursive: true })
    mkdirSync(join(hub, "workflows"), { recursive: true })
    mkdirSync(join(hub, "skills"), { recursive: true })
    writeFileSync(join(hub, "skills-registry.yaml"), "schema_version: 1\nchain_hub: []\npersonal: []\ncli_packages: []\n")
    writeFileSync(
      join(hub, "core", "registry.yaml"),
      "schema_version: 1\nprotected:\n  skills: []\n  rules: [global]\n  agents: []\n  workflows: []\n",
    )
    mkdirSync(join(hub, "core", "rules"), { recursive: true })
    writeFileSync(join(hub, "core", "rules", "global.md"), "# core\n")

    originalChainHome = process.env.CHAIN_HOME
    process.env.CHAIN_HOME = hub
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
    rmSync(hub, { recursive: true, force: true })
  })

  test("creates, edits, lists, and removes a rule", async () => {
    await runAssetNew("rules", "my-rule", { content: "# hello\n", ext: ".mdc" })
    expect(existsSync(join(hub, "rules", "my-rule.mdc"))).toBe(true)

    await runAssetEdit("rules", "my-rule", { content: "# changed\n" })
    expect(readFileSync(join(hub, "rules", "my-rule.mdc"), "utf8")).toContain("changed")

    await runAssetList("rules")
    const output = lines.join("\n")
    expect(output).toContain("rules")
    expect(output).toContain("my-rule")

    await runAssetRemove("rules", "my-rule")
    expect(existsSync(join(hub, "rules", "my-rule.mdc"))).toBe(false)
  })
})
