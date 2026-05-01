import { expect, test, describe, afterEach } from "bun:test"
import { getChainHome } from "./chain-home"
import { mkdtempSync, rmSync } from "fs"
import { homedir, tmpdir } from "os"
import { join } from "path"

describe("getChainHome", () => {
  const original = process.env.CHAIN_HOME
  const originalCwd = process.cwd()
  const tempDirs: string[] = []

  afterEach(() => {
    if (original === undefined) delete process.env.CHAIN_HOME
    else process.env.CHAIN_HOME = original
    process.chdir(originalCwd)
    for (const tempDir of tempDirs.splice(0)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  test("returns CHAIN_HOME env var when set", () => {
    process.env.CHAIN_HOME = "/custom/chain"
    expect(getChainHome()).toBe("/custom/chain")
  })

  test("returns ~/.chain when CHAIN_HOME not set outside a chain workspace", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "chain-home-"))
    tempDirs.push(tempDir)
    process.chdir(tempDir)
    delete process.env.CHAIN_HOME
    expect(getChainHome()).toBe(join(homedir(), ".chain"))
  })
})
