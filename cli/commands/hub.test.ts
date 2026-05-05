import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdirSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { buildSkillsListResponse, resolveStaticRoot } from "./hub"

describe("buildSkillsListResponse", () => {
  let hub: string

  beforeEach(() => {
    hub = join(tmpdir(), `chain-hub-api-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(join(hub, "skills"), { recursive: true })
    mkdirSync(join(hub, "core"), { recursive: true })
    writeFileSync(join(hub, "skills-registry.yaml"), "schema_version: 1\nchain_hub: []\npersonal: []\ncli_packages: []\n")
    writeFileSync(
      join(hub, "core", "registry.yaml"),
      "schema_version: 1\nprotected:\n  skills: []\n  rules: []\n  agents: []\n  workflows: []\n",
    )
  })

  afterEach(() => {
    rmSync(hub, { recursive: true, force: true })
  })

  test("returns skills-list payload contract with metadata", () => {
    const payload = buildSkillsListResponse(hub, "env")
    expect(Object.keys(payload).sort()).toEqual(["chainHome", "initialized", "skills", "source"])
    expect(Array.isArray(payload.skills)).toBe(true)
    expect(typeof payload.initialized).toBe("boolean")
    expect(payload.chainHome).toBe(hub)
    expect(payload.source).toBe("env")
  })

  test("self-heals missing assets and keeps payload initialized", () => {
    rmSync(join(hub, "skills-registry.yaml"), { force: true })
    rmSync(join(hub, "core", "registry.yaml"), { force: true })
    const payload = buildSkillsListResponse(hub, "env")
    expect(payload.initialized).toBe(true)
    expect(Array.isArray(payload.skills)).toBe(true)
  })
})

describe("resolveStaticRoot", () => {
  let sandbox: string

  beforeEach(() => {
    sandbox = join(tmpdir(), `chain-hub-static-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(sandbox, { recursive: true })
  })

  afterEach(() => {
    rmSync(sandbox, { recursive: true, force: true })
  })

  test("prefers live apps/hub when running from a source checkout", () => {
    const commandsDir = join(sandbox, "repo", "cli", "commands")
    const distHub = join(sandbox, "repo", "cli", "dist", "hub")
    const sourceHub = join(sandbox, "repo", "apps", "hub")
    mkdirSync(commandsDir, { recursive: true })
    mkdirSync(distHub, { recursive: true })
    mkdirSync(sourceHub, { recursive: true })

    const resolved = resolveStaticRoot(commandsDir)
    expect(resolved).toBe(sourceHub)
  })

  test("prefers dist/hub when running from packaged dist commands", () => {
    const distCommandsDir = join(sandbox, "install", "node_modules", "chain-hub", "dist", "commands")
    const distHub = join(sandbox, "install", "node_modules", "chain-hub", "dist", "hub")
    mkdirSync(distCommandsDir, { recursive: true })
    mkdirSync(distHub, { recursive: true })

    const resolved = resolveStaticRoot(distCommandsDir)
    expect(resolved).toBe(distHub)
  })
})
