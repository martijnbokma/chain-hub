import { expect, test, describe, beforeEach, afterEach } from "bun:test"
import { mkdirSync, rmSync, writeFileSync, existsSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import { readRegistry, addSkill, removeSkill, writeRegistry } from "../registry/local"

function writeCoreRegistry(hub: string, protectedSkills: string[]): void {
  mkdirSync(join(hub, "core"), { recursive: true })
  writeFileSync(
    join(hub, "core", "registry.yaml"),
    `schema_version: 1\nprotected:\n  skills:\n${protectedSkills.map((s) => `    - ${s}`).join("\n")}\n`,
    "utf8",
  )
}

function makeHub(name: string): string {
  const dir = join(tmpdir(), `chain-iso-${name}-${Date.now()}-${Math.random().toString(16).slice(2)}`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, "skills-registry.yaml"),
    "schema_version: 3\nchain_hub: []\npersonal: []\ncli_packages: []\n",
    "utf8",
  )
  return dir
}

describe("registry isolation — explicit chainHome vs CHAIN_HOME env", () => {
  let envHub: string
  let explicitHub: string
  let originalChainHome: string | undefined

  beforeEach(() => {
    envHub = makeHub("env")
    explicitHub = makeHub("explicit")
    originalChainHome = process.env.CHAIN_HOME
    process.env.CHAIN_HOME = envHub
  })

  afterEach(() => {
    if (originalChainHome === undefined) delete process.env.CHAIN_HOME
    else process.env.CHAIN_HOME = originalChainHome
    rmSync(envHub, { recursive: true, force: true })
    rmSync(explicitHub, { recursive: true, force: true })
  })

  test("readRegistry(explicitHub) reads from explicitHub, not from CHAIN_HOME", () => {
    writeRegistry({ schema_version: 3, chain_hub: ["from-env"], personal: [], cli_packages: [] }, envHub)
    writeRegistry({ schema_version: 3, chain_hub: ["from-explicit"], personal: [], cli_packages: [] }, explicitHub)

    const reg = readRegistry(explicitHub)
    expect(reg.chain_hub).toContain("from-explicit")
    expect(reg.chain_hub).not.toContain("from-env")
  })

  test("writeRegistry(reg, explicitHub) writes to explicitHub, not to CHAIN_HOME", () => {
    writeRegistry({ schema_version: 3, chain_hub: ["new-skill"], personal: [], cli_packages: [] }, explicitHub)

    // env hub should be unchanged
    const envReg = readRegistry(envHub)
    expect(envReg.chain_hub).not.toContain("new-skill")

    // explicit hub should have the new skill
    const explicitReg = readRegistry(explicitHub)
    expect(explicitReg.chain_hub).toContain("new-skill")
  })

  test("addSkill({ chainHome: explicitHub }) touches only explicitHub", () => {
    addSkill({ slug: "my-skill", bucket: "personal", chainHome: explicitHub })

    expect(readRegistry(envHub).personal).not.toContain("my-skill")
    expect(readRegistry(explicitHub).personal).toContain("my-skill")
  })

  test("removeSkill(slug, explicitHub) removes only from explicitHub", () => {
    // seed both hubs with the same slug
    addSkill({ slug: "shared-skill", bucket: "personal", chainHome: envHub })
    addSkill({ slug: "shared-skill", bucket: "personal", chainHome: explicitHub })

    removeSkill("shared-skill", explicitHub)

    expect(readRegistry(envHub).personal).toContain("shared-skill")
    expect(readRegistry(explicitHub).personal).not.toContain("shared-skill")
  })

  test("addSkill without chainHome falls back to CHAIN_HOME env var", () => {
    addSkill({ slug: "ambient-skill", bucket: "personal" })

    expect(readRegistry(envHub).personal).toContain("ambient-skill")
    expect(readRegistry(explicitHub).personal).not.toContain("ambient-skill")
  })

  test("addSkill({ chainHome: explicitHub }) bypasses protected-core guard from CHAIN_HOME", () => {
    // envHub treats "canvas" as a protected core skill
    writeCoreRegistry(envHub, ["canvas"])
    // explicitHub has no core registry — "canvas" is not protected there
    // (no writeCoreRegistry call for explicitHub)

    addSkill({ slug: "canvas", bucket: "personal", chainHome: explicitHub })

    // The skill should be added to the explicit hub only
    expect(readRegistry(explicitHub).personal).toContain("canvas")
    // The ambient env hub must not have been touched
    expect(readRegistry(envHub).personal).not.toContain("canvas")
  })
})
