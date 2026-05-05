import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdirSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { createSkill, listSkillsPayload, readSkill, removeSkill, writeSkill } from "./skills-service"
import { UserError } from "../utils/errors"

describe("skills-service", () => {
  let hub: string

  beforeEach(() => {
    hub = join(tmpdir(), `chain-skills-service-${Date.now()}-${Math.random().toString(16).slice(2)}`)
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

  test("listSkillsPayload returns contract shape for initialized hubs", () => {
    const payload = listSkillsPayload(hub)
    expect(payload.initialized).toBe(true)
    expect(Array.isArray(payload.skills)).toBe(true)
  })

  test("listSkillsPayload self-heals missing registry assets", () => {
    rmSync(join(hub, "skills-registry.yaml"), { force: true })
    rmSync(join(hub, "core", "registry.yaml"), { force: true })
    const payload = listSkillsPayload(hub)
    expect(payload.initialized).toBe(true)
    expect(Array.isArray(payload.skills)).toBe(true)
  })

  test("skill read/write/create/remove reject traversal-like slugs", () => {
    expect(() => createSkill(hub, "../escape")).toThrow(UserError)
    expect(() => readSkill(hub, "../escape")).toThrow(UserError)
    expect(() => writeSkill(hub, "../escape", "x")).toThrow(UserError)
    expect(() => removeSkill(hub, "../escape")).toThrow(UserError)
    expect(() => createSkill(hub, "ok/escape")).toThrow(UserError)
    expect(() => createSkill(hub, "not_kebab")).toThrow(UserError)
  })

  test("read/write/remove allow legacy non-kebab slugs that exist on disk", () => {
    const legacySlug = "MyLegacySkill"
    const legacyDir = join(hub, "skills", legacySlug)
    mkdirSync(legacyDir, { recursive: true })
    writeFileSync(join(legacyDir, "SKILL.md"), "# legacy\n", "utf8")

    const detail = readSkill(hub, legacySlug)
    expect(detail.content).toContain("legacy")
    writeSkill(hub, legacySlug, "# updated\n")
    expect(readSkill(hub, legacySlug).content).toContain("updated")
    removeSkill(hub, legacySlug)
    expect(() => readSkill(hub, legacySlug)).toThrow(UserError)
  })
})
