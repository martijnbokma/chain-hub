import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { runRemove } from "./remove"
import { UserError } from "../utils/errors"

describe("runRemove", () => {
  let tmp: string
  let originalChainHome: string | undefined

  beforeEach(() => {
    tmp = join(tmpdir(), `chain-remove-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(join(tmp, "skills"), { recursive: true })
    writeFileSync(
      join(tmp, "skills-registry.yaml"),
      "schema_version: 3\nchain_hub: []\npersonal:\n  - installed-skill\ncli_packages: []\n",
    )
    mkdirSync(join(tmp, "skills", "installed-skill"), { recursive: true })
    originalChainHome = process.env.CHAIN_HOME
    process.env.CHAIN_HOME = tmp
  })

  afterEach(() => {
    if (originalChainHome === undefined) delete process.env.CHAIN_HOME
    else process.env.CHAIN_HOME = originalChainHome
    rmSync(tmp, { recursive: true, force: true })
  })

  function addProtectedCore(slug: string): void {
    mkdirSync(join(tmp, "core"), { recursive: true })
    writeFileSync(
      join(tmp, "core", "registry.yaml"),
      `schema_version: 1\nprotected:\n  skills:\n    - ${slug}\n  rules: []\n  agents: []\n  workflows: []\n`,
    )
  }

  test("throws UserError when removing a protected core skill", async () => {
    addProtectedCore("canvas")
    await expect(runRemove("canvas")).rejects.toBeInstanceOf(UserError)
  })

  test("throws UserError when slug is not in registry", async () => {
    await expect(runRemove("unknown-skill")).rejects.toBeInstanceOf(UserError)
  })

  test("removes directory and registry entry for a tracked skill", async () => {
    await runRemove("installed-skill")
    expect(existsSync(join(tmp, "skills", "installed-skill"))).toBe(false)
    const reg = (await import("../registry/local")).readRegistry()
    expect(reg.personal).not.toContain("installed-skill")
  })
})
