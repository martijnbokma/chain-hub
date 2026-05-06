import { expect, test, describe, afterEach } from "bun:test"
import { DEFAULT_CHAIN_HUB_DIRNAME, getChainHome, getChainHomeResolution } from "./chain-home"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs"
import { homedir, tmpdir } from "os"
import { join } from "path"

describe("getChainHome", () => {
  const original = process.env.CHAIN_HOME
  const originalXdgConfig = process.env.XDG_CONFIG_HOME
  const originalCwd = process.cwd()
  const tempDirs: string[] = []

  afterEach(() => {
    if (original === undefined) delete process.env.CHAIN_HOME
    else process.env.CHAIN_HOME = original
    if (originalXdgConfig === undefined) delete process.env.XDG_CONFIG_HOME
    else process.env.XDG_CONFIG_HOME = originalXdgConfig
    process.chdir(originalCwd)
    for (const tempDir of tempDirs.splice(0)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  test("returns CHAIN_HOME env var when set", () => {
    process.env.CHAIN_HOME = "/custom/chain"
    expect(getChainHome()).toBe("/custom/chain")
  })

  test("returns ~/chain-hub when CHAIN_HOME is not set", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "chain-home-"))
    const configRoot = mkdtempSync(join(tmpdir(), "chain-xdg-"))
    tempDirs.push(tempDir, configRoot)
    process.chdir(tempDir)
    process.env.XDG_CONFIG_HOME = configRoot
    delete process.env.CHAIN_HOME
    expect(getChainHome()).toBe(join(homedir(), DEFAULT_CHAIN_HUB_DIRNAME))
  })

  test("returns config chain_home when env var is not set", () => {
    const configRoot = mkdtempSync(join(tmpdir(), "chain-config-"))
    tempDirs.push(configRoot)
    process.env.XDG_CONFIG_HOME = configRoot
    delete process.env.CHAIN_HOME

    const configDir = join(configRoot, "chain-hub")
    mkdirSync(configDir, { recursive: true })
    writeFileSync(join(configDir, "config.json"), JSON.stringify({ chain_home: "~/custom-chain-home" }), "utf-8")

    const resolution = getChainHomeResolution()
    expect(resolution.path).toBe(join(homedir(), "custom-chain-home"))
    expect(resolution.source).toBe("config")
  })

  test("CHAIN_HOME env var wins over config", () => {
    const configRoot = mkdtempSync(join(tmpdir(), "chain-config-"))
    tempDirs.push(configRoot)
    process.env.XDG_CONFIG_HOME = configRoot
    process.env.CHAIN_HOME = "/env/chain-home"

    const configDir = join(configRoot, "chain-hub")
    mkdirSync(configDir, { recursive: true })
    writeFileSync(join(configDir, "config.json"), JSON.stringify({ chain_home: "/config/chain-home" }), "utf-8")

    const resolution = getChainHomeResolution()
    expect(resolution.path).toBe("/env/chain-home")
    expect(resolution.source).toBe("env")
  })
})
