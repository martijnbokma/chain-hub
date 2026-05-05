import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { runNew } from "./new"
import { readRegistry } from "../registry/local"
import { UserError } from "../utils/errors"

describe("runNew", () => {
  let tmp: string
  let originalChainHome: string | undefined

  beforeEach(() => {
    tmp = join(tmpdir(), `chain-new-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(join(tmp, "skills"), { recursive: true })
    writeFileSync(
      join(tmp, "skills-registry.yaml"),
      "schema_version: 3\nchain_hub: []\npersonal: []\ncli_packages: []\n",
    )
    originalChainHome = process.env.CHAIN_HOME
    process.env.CHAIN_HOME = tmp
  })

  afterEach(() => {
    if (originalChainHome === undefined) delete process.env.CHAIN_HOME
    else process.env.CHAIN_HOME = originalChainHome
    rmSync(tmp, { recursive: true, force: true })
  })

  test("scaffolds skill and registers slug in personal", async () => {
    await runNew("my-fresh-skill")
    expect(existsSync(join(tmp, "skills", "my-fresh-skill", "SKILL.md"))).toBe(true)
    const reg = readRegistry()
    expect(reg.personal ?? []).toContain("my-fresh-skill")
  })

  test("rejects invalid slug input", async () => {
    await expect(runNew("../escape")).rejects.toBeInstanceOf(UserError)
  })
})
