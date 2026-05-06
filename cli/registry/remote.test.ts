import { describe, expect, test } from "bun:test"
import { filterAndRankRegistrySkills, scoreRegistryMatch, type RemoteSkill } from "./remote"

const catalog: RemoteSkill[] = [
  {
    slug: "create-skill",
    description: "Author agent skills (SKILL.md) for multiple editors.",
    version: "1",
    source: "github:x/y",
    path: "core/skills/create-skill",
  },
  {
    slug: "find-skills",
    description: "Discover and install skills via Chain Hub CLI.",
    version: "1",
    source: "github:x/y",
    path: "core/skills/find-skills",
  },
  {
    slug: "update-editor-settings",
    description: "Modify VS Code–family user settings.",
    version: "1",
    source: "github:x/y",
    path: "core/skills/update-editor-settings",
  },
]

describe("scoreRegistryMatch", () => {
  test("exact slug beats description-only substring", () => {
    const skillA: RemoteSkill = {
      slug: "acme-hook",
      description: "Mentions create-skill in passing",
      version: "1",
      source: "github:x/y",
      path: "p",
    }
    const skillB: RemoteSkill = {
      slug: "create-skill",
      description: "Short",
      version: "1",
      source: "github:x/y",
      path: "p",
    }
    expect(scoreRegistryMatch(skillB, "create-skill")).toBeGreaterThan(scoreRegistryMatch(skillA, "create-skill"))
  })

  test("slug segment match ranks above bare description match", () => {
    const hookSkill: RemoteSkill = {
      slug: "create-hook",
      description: "Hooks for agents",
      version: "1",
      source: "github:x/y",
      path: "p",
    }
    const other: RemoteSkill = {
      slug: "other",
      description: "This text mentions hook configuration",
      version: "1",
      source: "github:x/y",
      path: "p",
    }
    expect(scoreRegistryMatch(hookSkill, "hook")).toBeGreaterThan(scoreRegistryMatch(other, "hook"))
  })
})

describe("filterAndRankRegistrySkills", () => {
  test("multi-word query prefers skills matching all tokens", () => {
    const ranked = filterAndRankRegistrySkills(catalog, "skill chain")
    expect(ranked[0]?.slug).toBe("find-skills")
  })

  test("empty query returns all skills sorted by slug", () => {
    const ranked = filterAndRankRegistrySkills(catalog, "")
    expect(ranked.map((s) => s.slug)).toEqual(["create-skill", "find-skills", "update-editor-settings"])
  })
})
