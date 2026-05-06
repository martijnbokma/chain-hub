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

  test("addSkill silently skips protected core skills", async () => {
    mkdirSync(join(tmp, "core"), { recursive: true })
    writeFileSync(
      join(tmp, "core", "registry.yaml"),
      "schema_version: 1\nprotected:\n  skills:\n    - canvas\n",
    )
    const { addSkill, readRegistry } = await import("../registry/local")
    addSkill({ slug: "canvas", bucket: "personal" })
    const reg = readRegistry()
    expect(reg.personal ?? []).not.toContain("canvas")
    expect(reg.chain_hub ?? []).not.toContain("canvas")
  })

  test("addSkill can land in packs bucket", async () => {
    const { addSkill, readRegistry } = await import("../registry/local")
    addSkill({ slug: "premium-skill", source: "github:acme/premium-pack", version: "1", bucket: "packs" })
    const reg = readRegistry()
    expect(reg.packs ?? []).toContain("premium-skill")
    expect(reg.personal ?? []).not.toContain("premium-skill")
    expect(reg.github_sources?.some((b) => b.github === "github:acme/premium-pack" && b.skills.includes("premium-skill"))).toBe(true)
  })

  test("throws UserError when --pack is used without github:", async () => {
    await expect(runAdd("some-slug", { pack: true })).rejects.toBeInstanceOf(UserError)
  })
})
