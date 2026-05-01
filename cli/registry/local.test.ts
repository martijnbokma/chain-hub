import { expect, test, describe, beforeEach, afterEach } from "bun:test"
import { readRegistry, addSkill, removeSkill, writeRegistry, isProtectedCoreSkill } from "./local"
import { mkdirSync, rmSync, writeFileSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"

describe("local registry", () => {
  let tmp: string

  beforeEach(() => {
    tmp = join(tmpdir(), `chain-registry-${Date.now()}`)
    mkdirSync(tmp, { recursive: true })
    process.env.CHAIN_HOME = tmp
  })

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true })
    delete process.env.CHAIN_HOME
  })

  test("readRegistry returns empty registry when file missing", () => {
    const reg = readRegistry()
    expect(reg.chain_hub).toEqual([])
    expect(reg.personal).toEqual([])
    expect(reg.cli_packages).toEqual([])
  })

  test("addSkill writes personal slug and re-reads correctly", () => {
    addSkill({ slug: "tailwind-css", source: "chain-hub-registry", version: "1.0.0" })
    const reg = readRegistry()
    expect(reg.personal).toEqual(["tailwind-css"])
  })

  test("removeSkill removes entry from personal", () => {
    addSkill({ slug: "tailwind-css", source: "chain-hub-registry", version: "1.0.0" })
    removeSkill("tailwind-css")
    expect(readRegistry().personal).toEqual([])
  })

  test("addSkill is idempotent when slug already registered", () => {
    addSkill({ slug: "tailwind-css", source: "chain-hub-registry", version: "1.0.0" })
    addSkill({ slug: "tailwind-css", source: "chain-hub-registry", version: "2.0.0" })
    const reg = readRegistry()
    expect(reg.personal).toEqual(["tailwind-css"])
  })

  test("addSkill with github source records github_sources bundle", () => {
    addSkill({
      slug: "plugin-foo",
      source: "github:acme/plugins",
      version: "github-main",
      credits: "Acme — https://github.com/acme/plugins",
    })
    const reg = readRegistry()
    expect(reg.github_sources?.length).toBe(1)
    expect(reg.github_sources?.[0].github).toBe("github:acme/plugins")
    expect(reg.github_sources?.[0].skills).toEqual(["plugin-foo"])
    expect(reg.github_sources?.[0].credits).toContain("Acme")
  })

  test("removeSkill drops slug from github_sources", () => {
    addSkill({ slug: "a", source: "github:acme/plugins", version: "1" })
    addSkill({ slug: "b", source: "github:acme/plugins", version: "1" })
    removeSkill("a")
    const reg = readRegistry()
    expect(reg.github_sources?.[0].skills).toEqual(["b"])
    removeSkill("b")
    expect(readRegistry().github_sources).toBeUndefined()
  })

  test("validator accepts manual github_sources matching registered slugs", async () => {
    const { validateRegistryIntegrity } = await import("../utils/validators/registry")
    const skillsDir = join(tmp, "skills")
    mkdirSync(join(skillsDir, "pack-skill"), { recursive: true })
    writeRegistry({
      schema_version: 3,
      chain_hub: [],
      personal: [],
      packs: ["pack-skill"],
      community: [],
      cli_packages: [],
      github_sources: [
        {
          github: "github:acme/bundle",
          credits: "Acme",
          skills: ["pack-skill"],
        },
      ],
    })
    const errors: string[] = []
    validateRegistryIntegrity(tmp, errors)
    expect(errors.filter((e) => e.includes("github_sources"))).toEqual([])
  })

  test("isProtectedCoreSkill returns true for slugs in core registry", () => {
    mkdirSync(join(tmp, "core"), { recursive: true })
    writeFileSync(
      join(tmp, "core", "registry.yaml"),
      "schema_version: 1\nprotected:\n  skills:\n    - canvas\n",
      "utf8",
    )

    expect(isProtectedCoreSkill("canvas")).toBe(true)
    expect(isProtectedCoreSkill("personal-skill")).toBe(false)
  })
})
