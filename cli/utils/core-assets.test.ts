import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { ensureCoreAssets, ensureUserRegistry } from "./core-assets"

describe("ensureCoreAssets", () => {
  let tmp: string
  let packageRoot: string
  let chainHome: string

  beforeEach(() => {
    tmp = join(tmpdir(), `chain-core-assets-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    packageRoot = join(tmp, "package")
    chainHome = join(tmp, "home")
    mkdirSync(join(packageRoot, "core", "skills", "canvas"), { recursive: true })
    writeFileSync(join(packageRoot, "core", "registry.yaml"), "schema_version: 1\n")
    writeFileSync(join(packageRoot, "core", "skills", "canvas", "SKILL.md"), "core canvas")
  })

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true })
  })

  test("copies packaged core assets into chain home", () => {
    ensureCoreAssets({ chainHome, packageRoot })

    expect(readFileSync(join(chainHome, "core", "skills", "canvas", "SKILL.md"), "utf8")).toBe("core canvas")
  })

  test("does not remove user-installed skills", () => {
    mkdirSync(join(chainHome, "skills", "personal-skill"), { recursive: true })
    writeFileSync(join(chainHome, "skills", "personal-skill", "SKILL.md"), "personal")

    ensureCoreAssets({ chainHome, packageRoot })

    expect(existsSync(join(chainHome, "skills", "personal-skill", "SKILL.md"))).toBe(true)
  })

  test("does nothing when package core and chain home core are the same path", () => {
    ensureCoreAssets({ chainHome: packageRoot, packageRoot })

    expect(readFileSync(join(packageRoot, "core", "registry.yaml"), "utf8")).toBe("schema_version: 1\n")
  })

  test("installs protected agents and workflows into chain home root", () => {
    writeFileSync(
      join(packageRoot, "core", "registry.yaml"),
      `schema_version: 1
protected:
  skills: []
  rules: []
  agents:
    - chain-onboarding
  workflows:
    - chain-quickstart
`,
    )
    mkdirSync(join(packageRoot, "core", "agents"), { recursive: true })
    writeFileSync(
      join(packageRoot, "core", "agents", "chain-onboarding.md"),
      "---\nname: chain-onboarding\ndescription: Onboarding helper\n---\nBody.\n",
    )
    mkdirSync(join(packageRoot, "core", "workflows"), { recursive: true })
    writeFileSync(join(packageRoot, "core", "workflows", "chain-quickstart.md"), "# Quickstart\n")

    ensureCoreAssets({ chainHome, packageRoot })

    expect(readFileSync(join(chainHome, "agents", "chain-onboarding.md"), "utf8")).toContain("chain-onboarding")
    expect(readFileSync(join(chainHome, "workflows", "chain-quickstart.md"), "utf8")).toContain("# Quickstart")
  })

  test("creates an empty user registry when missing", () => {
    ensureUserRegistry({ chainHome })

    expect(readFileSync(join(chainHome, "skills-registry.yaml"), "utf8")).toContain("schema_version: 3")
  })

  test("does not overwrite an existing user registry", () => {
    mkdirSync(chainHome, { recursive: true })
    writeFileSync(join(chainHome, "skills-registry.yaml"), "custom: true\n")

    ensureUserRegistry({ chainHome })

    expect(readFileSync(join(chainHome, "skills-registry.yaml"), "utf8")).toBe("custom: true\n")
  })
})
