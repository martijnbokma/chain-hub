import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdirSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { runAdd } from "./add"
import { UserError } from "../utils/errors"

describe("runAdd", () => {
  let tmp: string
  let originalChainHome: string | undefined

  beforeEach(() => {
    tmp = join(tmpdir(), `chain-add-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(join(tmp, "skills"), { recursive: true })
    writeFileSync(
      join(tmp, "skills-registry.yaml"),
      "schema_version: 3\ncore: []\nchain_hub: []\npersonal: []\ncli_packages: []\n",
    )
    originalChainHome = process.env.CHAIN_HOME
    process.env.CHAIN_HOME = tmp
  })

  afterEach(() => {
    if (originalChainHome === undefined) delete process.env.CHAIN_HOME
    else process.env.CHAIN_HOME = originalChainHome
    rmSync(tmp, { recursive: true, force: true })
  })

  test("throws UserError for github: slug without repo part", async () => {
    await expect(runAdd("github:onlyowner")).rejects.toBeInstanceOf(UserError)
  })

  test("throws UserError for github: slug with empty owner", async () => {
    await expect(runAdd("github:/repo")).rejects.toBeInstanceOf(UserError)
  })

  test("registry install lands in chain_hub bucket", async () => {
    // Simulate a minimal registry response by intercepting fetchRemoteIndex.
    // We can't hit the real network in unit tests, so we verify bucket assignment
    // by calling addSkill directly with bucket: "chain_hub" and reading back.
    const { addSkill, readRegistry } = await import("../registry/local")
    addSkill({ slug: "test-skill", source: "chain-hub-registry", version: "1.0.0", bucket: "chain_hub" })
    const reg = readRegistry()
    expect(reg.chain_hub).toContain("test-skill")
    expect(reg.personal ?? []).not.toContain("test-skill")
  })

  test("personal install lands in personal bucket", async () => {
    const { addSkill, readRegistry } = await import("../registry/local")
    addSkill({ slug: "my-skill", source: "github:me/repo", version: "github-main", bucket: "personal" })
    const reg = readRegistry()
    expect(reg.personal).toContain("my-skill")
    expect(reg.chain_hub ?? []).not.toContain("my-skill")
  })

  test("addSkill can land in core bucket", async () => {
    const { addSkill, readRegistry } = await import("../registry/local")
    addSkill({ slug: "bundled-skill", bucket: "core" })
    const reg = readRegistry()
    expect(reg.core).toContain("bundled-skill")
    expect(reg.chain_hub ?? []).not.toContain("bundled-skill")
  })
})
