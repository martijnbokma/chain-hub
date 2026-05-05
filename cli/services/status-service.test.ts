import { expect, test, describe, beforeEach, afterEach } from "bun:test"
import { mkdirSync, rmSync, symlinkSync, writeFileSync, realpathSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import { classifyLink } from "./status-service"

describe("classifyLink — all four status cases", () => {
  let tmp: string
  let chainHome: string
  let outsideDir: string

  beforeEach(() => {
    const rawTmp = join(tmpdir(), `chain-status-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(join(rawTmp, "chain-hub", "skills"), { recursive: true })
    mkdirSync(join(rawTmp, "outside"), { recursive: true })
    // Resolve canonical path so macOS /var → /private/var is handled correctly.
    tmp = realpathSync(rawTmp)
    chainHome = join(tmp, "chain-hub")
    outsideDir = join(tmp, "outside")
    writeFileSync(join(chainHome, "skills", "some-skill.md"), "")
    writeFileSync(join(outsideDir, "other.md"), "")
  })

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true })
  })

  test("status ok — symlink resolves inside chainHome", () => {
    const target = join(chainHome, "skills")
    const link = join(tmp, "link-ok")
    symlinkSync(target, link)

    const result = classifyLink("skills", link, chainHome)
    expect(result.status).toBe("ok")
    expect(result.resolvedPath).toBeDefined()
    expect(result.resolvedPath!.startsWith(chainHome)).toBe(true)
  })

  test("status warning — symlink resolves outside chainHome", () => {
    const link = join(tmp, "link-outside")
    symlinkSync(outsideDir, link)

    const result = classifyLink("outside-link", link, chainHome)
    expect(result.status).toBe("warning")
    expect(result.resolvedPath).toBeDefined()
    expect(result.resolvedPath!.startsWith(chainHome)).toBe(false)
  })

  test("status broken — dangling symlink (target deleted)", () => {
    const ghost = join(tmp, "ghost-target")
    const link = join(tmp, "link-broken")
    symlinkSync(ghost, link)
    // ghost was never created, so the symlink is dangling

    const result = classifyLink("broken-link", link, chainHome)
    expect(result.status).toBe("broken")
    expect(result.resolvedPath).toBeUndefined()
  })

  test("status missing — path is not a symlink at all", () => {
    const notALink = join(tmp, "not-a-link")
    // not-a-link does not exist, so isSymlink returns false

    const result = classifyLink("missing-link", notALink, chainHome)
    expect(result.status).toBe("missing")
    expect(result.resolvedPath).toBeUndefined()
  })

  test("status missing — path is a regular file (not a symlink)", () => {
    const regularFile = join(tmp, "regular.txt")
    writeFileSync(regularFile, "not a symlink")

    const result = classifyLink("regular-file", regularFile, chainHome)
    expect(result.status).toBe("missing")
  })

  test("regression: sibling-prefix path is warning, not ok", () => {
    // /tmp/chain-hub-sibling shares the prefix /tmp/chain-hub but is not inside it.
    const siblingDir = join(tmp, "chain-hub-sibling")
    mkdirSync(siblingDir, { recursive: true })
    writeFileSync(join(siblingDir, "file.md"), "")
    const link = join(tmp, "link-sibling")
    symlinkSync(siblingDir, link)

    const result = classifyLink("sibling-prefix", link, chainHome)
    expect(result.status).toBe("warning")
  })

  test("regression: symlinked chainHome alias resolves ok when target is inside canonical chainHome", () => {
    // Simulate /var → /private/var style alias: chainHomeAlias → chainHome (canonical).
    const chainHomeAlias = join(tmp, "chain-hub-alias")
    symlinkSync(chainHome, chainHomeAlias)

    const target = join(chainHome, "skills", "some-skill.md")
    const link = join(tmp, "link-via-alias")
    symlinkSync(target, link)

    // Pass the aliased (non-canonical) chainHome path — classifyLink must still report ok.
    const result = classifyLink("alias-chainHome", link, chainHomeAlias)
    expect(result.status).toBe("ok")
  })
})

describe("getStatus — echoes the input chainHome and optional source", () => {
  test("StatusResult.chainHome equals the passed chainHome", async () => {
    const { getStatus } = await import("./status-service")
    const result = getStatus("/some/explicit/path")
    expect(result.chainHome).toBe("/some/explicit/path")
  })

  test("StatusResult.source equals the passed source when provided", async () => {
    const { getStatus } = await import("./status-service")
    const result = getStatus("/hub", "config")
    expect(result.source).toBe("config")
  })

  test("StatusResult.source is undefined when not passed", async () => {
    const { getStatus } = await import("./status-service")
    const result = getStatus("/hub")
    expect(result.source).toBeUndefined()
  })

  test("StatusResult.initialized is false when hub assets are missing", async () => {
    const { getStatus } = await import("./status-service")
    const result = getStatus("/definitely/missing/chain-home")
    expect(result.initialized).toBe(false)
  })

  test("StatusResult.initialized is true when hub assets exist", async () => {
    const hub = join(tmpdir(), `chain-status-init-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(join(hub, "core"), { recursive: true })
    writeFileSync(join(hub, "skills-registry.yaml"), "schema_version: 1\nchain_hub: []\npersonal: []\ncli_packages: []\n")
    writeFileSync(
      join(hub, "core", "registry.yaml"),
      "schema_version: 1\nprotected:\n  skills: []\n  rules: []\n  agents: []\n  workflows: []\n",
    )
    try {
      const { getStatus } = await import("./status-service")
      const result = getStatus(hub)
      expect(result.initialized).toBe(true)
    } finally {
      rmSync(hub, { recursive: true, force: true })
    }
  })
})
