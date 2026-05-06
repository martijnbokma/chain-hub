import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdirSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { buildSkillsListResponse, resolveStaticRoot } from "./hub"
import { routeRequest } from "../services/hub-router"
import type { ChainHomeResolution } from "../utils/chain-home"

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

  test("prefers apps/hub/dist (Astro output) when running from a source checkout", () => {
    const commandsDir = join(sandbox, "repo", "cli", "commands")
    const packagedHub = join(sandbox, "repo", "cli", "dist", "hub")
    const sourceHub = join(sandbox, "repo", "apps", "hub")
    const sourceHubDist = join(sourceHub, "dist")
    mkdirSync(commandsDir, { recursive: true })
    mkdirSync(packagedHub, { recursive: true })
    mkdirSync(sourceHubDist, { recursive: true })
    writeFileSync(join(sourceHubDist, "index.html"), "<!doctype html><html></html>")

    const resolved = resolveStaticRoot(commandsDir)
    expect(resolved).toBe(sourceHubDist)
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

describe("routeRequest content routes", () => {
  let hub: string
  const resolution: ChainHomeResolution = { path: "", source: "env" }

  beforeEach(() => {
    hub = join(tmpdir(), `chain-hub-router-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    resolution.path = hub
    mkdirSync(join(hub, "skills"), { recursive: true })
    mkdirSync(join(hub, "rules"), { recursive: true })
    mkdirSync(join(hub, "agents"), { recursive: true })
    mkdirSync(join(hub, "workflows"), { recursive: true })
    mkdirSync(join(hub, "core"), { recursive: true })
    writeFileSync(join(hub, "skills-registry.yaml"), "schema_version: 1\nchain_hub: []\npersonal: []\ncli_packages: []\n")
    writeFileSync(
      join(hub, "core", "registry.yaml"),
      "schema_version: 1\nprotected:\n  skills: [core-skill]\n  rules: []\n  agents: []\n  workflows: []\n",
    )
    mkdirSync(join(hub, "core", "skills", "core-skill"), { recursive: true })
    writeFileSync(join(hub, "core", "skills", "core-skill", "SKILL.md"), "# core skill\n", "utf8")
  })

  afterEach(() => {
    rmSync(hub, { recursive: true, force: true })
  })

  async function api(
    path: string,
    method = "GET",
    body?: Record<string, unknown>,
  ): Promise<{ status: number; payload: any }> {
    const response = await routeRequest(
      new Request(`http://localhost:2342${path}`, {
        method,
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      }),
      hub,
      resolution,
    )
    return { status: response.status, payload: await response.json() }
  }

  test("supports content CRUD for agents", async () => {
    const created = await api("/api/content/agents", "POST", { slug: "my-agent", content: "# my agent\n" })
    expect(created.status).toBe(201)

    const listed = await api("/api/content/agents")
    expect(listed.status).toBe(200)
    expect(Array.isArray(listed.payload.items)).toBe(true)
    expect(listed.payload.items.some((item: { slug: string }) => item.slug === "my-agent")).toBe(true)

    const read = await api("/api/content/agents/my-agent")
    expect(read.status).toBe(200)
    expect(read.payload.content).toContain("my agent")

    const updated = await api("/api/content/agents/my-agent", "PUT", { content: "# updated agent\n" })
    expect(updated.status).toBe(200)

    const deleted = await api("/api/content/agents/my-agent", "DELETE")
    expect(deleted.status).toBe(200)
  })

  test("rejects invalid content kind", async () => {
    const response = await api("/api/content/unknown")
    expect(response.status).toBe(400)
    expect(response.payload.code).toBe("bad_request")
    expect(response.payload.error).toContain("Invalid content kind")
  })

  test("keeps /api/skills compatibility behavior", async () => {
    const create = await api("/api/skills", "POST", { slug: "compat-skill", description: "compat" })
    expect(create.status).toBe(201)

    const list = await api("/api/skills")
    expect(list.status).toBe(200)
    expect(Array.isArray(list.payload.skills)).toBe(true)

    const read = await api("/api/skills/compat-skill")
    expect(read.status).toBe(200)
    expect(read.payload.content).toBeDefined()
  })

  test("blocks mutation on protected skill through new content route", async () => {
    const list = await api("/api/content/skills")
    const protectedSlug = list.payload.items.find((item: { isCore: boolean }) => item.isCore)?.slug
    if (!protectedSlug) {
      throw new Error("Expected at least one protected core skill in hub list")
    }
    const response = await api(`/api/content/skills/${protectedSlug}`, "PUT", { content: "# no\n" })
    expect(response.status).toBe(400)
    expect(response.payload.error).toContain("protected")
  })
})
