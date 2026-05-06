import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdirSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { createContent, deleteContent, listContent, readContent, updateContent } from "./content-service"
import { UserError } from "../utils/errors"

describe("content-service", () => {
  let hub: string

  beforeEach(() => {
    hub = join(tmpdir(), `chain-content-service-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(join(hub, "skills"), { recursive: true })
    mkdirSync(join(hub, "rules"), { recursive: true })
    mkdirSync(join(hub, "agents"), { recursive: true })
    mkdirSync(join(hub, "workflows"), { recursive: true })
    mkdirSync(join(hub, "core"), { recursive: true })
    writeFileSync(join(hub, "skills-registry.yaml"), "schema_version: 1\nchain_hub: []\npersonal: []\ncli_packages: []\n")
    writeFileSync(
      join(hub, "core", "registry.yaml"),
      "schema_version: 1\nprotected:\n  skills: [core-skill]\n  rules: [core-rule]\n  agents: [core-agent]\n  workflows: [core-workflow]\n",
    )
    mkdirSync(join(hub, "core", "skills", "core-skill"), { recursive: true })
    writeFileSync(join(hub, "core", "skills", "core-skill", "SKILL.md"), "# core skill\n", "utf8")
    mkdirSync(join(hub, "core", "rules"), { recursive: true })
    writeFileSync(join(hub, "core", "rules", "core-rule.md"), "# core rule\n", "utf8")
    mkdirSync(join(hub, "core", "agents"), { recursive: true })
    writeFileSync(join(hub, "core", "agents", "core-agent.md"), "# core agent\n", "utf8")
    mkdirSync(join(hub, "core", "workflows"), { recursive: true })
    writeFileSync(join(hub, "core", "workflows", "core-workflow.md"), "# core workflow\n", "utf8")
  })

  afterEach(() => {
    rmSync(hub, { recursive: true, force: true })
  })

  test("create/read/update/delete for non-skill content", () => {
    createContent(hub, { kind: "agents", slug: "my-agent", content: "# my agent\n" })
    expect(readContent(hub, "agents", "my-agent").content).toContain("my agent")
    updateContent(hub, { kind: "agents", slug: "my-agent", content: "# updated\n" })
    expect(readContent(hub, "agents", "my-agent").content).toContain("updated")
    deleteContent(hub, "agents", "my-agent")
    expect(() => readContent(hub, "agents", "my-agent")).toThrow(UserError)
  })

  test("rules resolve both .md and .mdc and preserve existing extension on update", () => {
    createContent(hub, { kind: "rules", slug: "my-rule", content: "# md rule\n", ext: ".md" })
    expect(readContent(hub, "rules", "my-rule").ext).toBe(".md")
    updateContent(hub, { kind: "rules", slug: "my-rule", content: "# changed md rule\n", ext: ".mdc" })
    const after = readContent(hub, "rules", "my-rule")
    expect(after.ext).toBe(".md")
    expect(after.content).toContain("changed md rule")

    createContent(hub, { kind: "rules", slug: "my-rule-c", content: "# mdc rule\n", ext: ".mdc" })
    expect(readContent(hub, "rules", "my-rule-c").ext).toBe(".mdc")
  })

  test("protected content cannot be created over, updated, or deleted", () => {
    const protectedSkill = listContent(hub, "skills").find((entry) => entry.isCore)?.slug
    const protectedRule = listContent(hub, "rules").find((entry) => entry.isCore)?.slug
    const protectedAgent = listContent(hub, "agents").find((entry) => entry.isCore)?.slug
    const protectedWorkflow = listContent(hub, "workflows").find((entry) => entry.isCore)?.slug

    if (protectedSkill) {
      expect(() => updateContent(hub, { kind: "skills", slug: protectedSkill, content: "# nope\n" })).toThrow(
        UserError,
      )
      expect(() => deleteContent(hub, "skills", protectedSkill)).toThrow(UserError)
    }
    if (protectedRule) {
      expect(() => updateContent(hub, { kind: "rules", slug: protectedRule, content: "# nope\n" })).toThrow(
        UserError,
      )
    }
    if (protectedAgent) {
      expect(() => deleteContent(hub, "agents", protectedAgent)).toThrow(UserError)
    }
    if (protectedWorkflow) {
      expect(() => createContent(hub, { kind: "workflows", slug: protectedWorkflow, content: "# nope\n" })).toThrow(
        UserError,
      )
    }
  })

  test("listContent includes core and user content for each kind", () => {
    createContent(hub, { kind: "skills", slug: "user-skill", content: "# user skill\n" })
    createContent(hub, { kind: "workflows", slug: "user-workflow", content: "# user workflow\n" })
    const skills = listContent(hub, "skills")
    const workflows = listContent(hub, "workflows")
    expect(skills.some((item) => item.slug === "user-skill" && !item.isCore)).toBe(true)
    expect(workflows.some((item) => item.slug === "user-workflow" && !item.isCore)).toBe(true)
    expect(skills.some((item) => item.isCore)).toBe(true)
  })
})
