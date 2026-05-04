import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { spawnSync } from "child_process"
import { downloadSkillDirectoryFromGithub } from "./github"

describe("downloadSkillDirectoryFromGithub", () => {
  let tmp: string
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    tmp = join(tmpdir(), `gh-skill-dir-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(tmp, { recursive: true })
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    rmSync(tmp, { recursive: true, force: true })
  })

  test("copies full skill directory including files beyond SKILL.md", async () => {
    const archiveRootName = "fake-repo-main"
    const skillRel = "skills/demo-skill"
    const srcRoot = join(tmp, "src", archiveRootName)
    const skillDir = join(srcRoot, skillRel)
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, "SKILL.md"), "# Demo\n", "utf8")
    writeFileSync(join(skillDir, "helper.txt"), "asset payload\n", "utf8")

    const tarPath = join(tmp, "archive.tar.gz")
    const pack = spawnSync("tar", ["-czf", tarPath, "-C", join(tmp, "src"), archiveRootName])
    expect(pack.status).toBe(0)

    const tarBytes = readFileSync(tarPath)

    globalThis.fetch = async (input: RequestInfo | URL) => {
      const u = String(input)
      if (u.includes("codeload.github.com")) {
        return new Response(tarBytes, { status: 200 })
      }
      return originalFetch(input)
    }

    const destSkills = join(tmp, "skills-out")
    mkdirSync(destSkills, { recursive: true })

    await downloadSkillDirectoryFromGithub({
      owner: "any",
      repo: "any",
      pathInRepo: skillRel,
      slug: "demo-skill",
      destDir: destSkills,
    })

    expect(readFileSync(join(destSkills, "demo-skill", "SKILL.md"), "utf8")).toContain("# Demo")
    expect(readFileSync(join(destSkills, "demo-skill", "helper.txt"), "utf8")).toContain("asset payload")
  })

  test("replaces existing target directory so stale files are removed", async () => {
    const archiveRootName = "pkg-HEAD"
    const skillRel = "x/my-skill"
    const srcRoot = join(tmp, "src2", archiveRootName, skillRel)
    mkdirSync(srcRoot, { recursive: true })
    writeFileSync(join(srcRoot, "SKILL.md"), "# v2\n", "utf8")

    const tarPath = join(tmp, "archive2.tar.gz")
    const pack = spawnSync("tar", ["-czf", tarPath, "-C", join(tmp, "src2"), archiveRootName])
    expect(pack.status).toBe(0)

    const destSkills = join(tmp, "skills-out2")
    mkdirSync(join(destSkills, "my-skill"), { recursive: true })
    writeFileSync(join(destSkills, "my-skill", "stale-only.txt"), "old\n", "utf8")

    globalThis.fetch = async (input: RequestInfo | URL) => {
      if (String(input).includes("codeload.github.com")) {
        return new Response(readFileSync(tarPath), { status: 200 })
      }
      return originalFetch(input)
    }

    await downloadSkillDirectoryFromGithub({
      owner: "o",
      repo: "r",
      pathInRepo: skillRel,
      slug: "my-skill",
      destDir: destSkills,
    })

    expect(() => readFileSync(join(destSkills, "my-skill", "stale-only.txt"), "utf8")).toThrow()
    expect(readFileSync(join(destSkills, "my-skill", "SKILL.md"), "utf8")).toContain("# v2")
  })
})
