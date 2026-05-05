import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test"
import { mkdirSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { UserError } from "../utils/errors"

describe("installSkill — registry failure modes", () => {
  let tmp: string
  let originalChainHome: string | undefined

  beforeEach(() => {
    tmp = join(tmpdir(), `reg-svc-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(join(tmp, "skills"), { recursive: true })
    writeFileSync(
      join(tmp, "skills-registry.yaml"),
      "schema_version: 3\nchain_hub: []\npersonal: []\ncli_packages: []\n",
    )
    originalChainHome = process.env.CHAIN_HOME
    process.env.CHAIN_HOME = tmp
  })

  afterEach(() => {
    if (originalChainHome === undefined) delete process.env.CHAIN_HOME
    else process.env.CHAIN_HOME = originalChainHome
    rmSync(tmp, { recursive: true, force: true })
    mock.restore()
  })

  test("throws a 'registry is unavailable' UserError when fetchRemoteIndex rejects", async () => {
    mock.module("../registry/remote", () => ({
      fetchRemoteIndex: async () => {
        throw new Error("ENOTFOUND raw.githubusercontent.com")
      },
    }))

    const { installSkill } = await import("./registry-service")
    const err = await installSkill(tmp, "some-slug").catch((e) => e)

    expect(err).toBeInstanceOf(UserError)
    expect(err.message).toMatch(/registry is unavailable/i)
    expect(err.message).not.toMatch(/not found in registry/i)
  })

  test("throws a 'not found in registry' UserError when fetch succeeds but slug is absent", async () => {
    mock.module("../registry/remote", () => ({
      fetchRemoteIndex: async () => ({
        schema_version: 1,
        skills: [{ slug: "other-skill", description: "", version: "1.0.0", source: "github:a/b", path: "skills/other-skill" }],
        source: "live",
      }),
    }))

    const { installSkill } = await import("./registry-service")
    const err = await installSkill(tmp, "missing-slug").catch((e) => e)

    expect(err).toBeInstanceOf(UserError)
    expect(err.message).toMatch(/not found in registry/i)
    expect(err.message).not.toMatch(/registry is unavailable/i)
  })
})

describe("fetchRegistry", () => {
  afterEach(() => {
    mock.restore()
  })

  test("returns bundled source when remote index falls back to bundled", async () => {
    mock.module("../registry/remote", () => ({
      fetchRemoteIndex: async () => ({
        schema_version: 1,
        source: "bundled",
        skills: [
          {
            slug: "fallback-skill",
            description: "offline copy",
            version: "1.0.0",
            source: "github:owner/repo",
            path: "skills/fallback-skill",
          },
        ],
      }),
    }))

    const { fetchRegistry } = await import("./registry-service")
    const result = await fetchRegistry()

    expect(result.source).toBe("bundled")
    expect(result.skills.map((skill) => skill.slug)).toEqual(["fallback-skill"])
  })

  test("defaults source to live when remote index omits source", async () => {
    mock.module("../registry/remote", () => ({
      fetchRemoteIndex: async () => ({
        schema_version: 1,
        skills: [],
      }),
    }))

    const { fetchRegistry } = await import("./registry-service")
    const result = await fetchRegistry()

    expect(result.source).toBe("live")
  })
})
