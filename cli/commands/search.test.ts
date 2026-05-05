import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"

// mock.module() must be called before importing the module under test
mock.module("../registry/remote", () => ({
  searchRemote: async (_query: string) => [],
}))

mock.module("../registry/skills-directory", () => ({
  searchSkillsDirectory: async (_query: string, _limit: number) => [],
  chainAddDirectoryHint: (hit: { name: string; source: string; skillId: string }) =>
    `chain add github:${hit.source} --skill ${hit.skillId}`,
  skillsShPageUrl: (hit: { id: string }) => `https://skills.sh/${hit.id}`,
}))

import { runSearch } from "./search"

describe("runSearch", () => {
  let originalLog: typeof console.log
  let originalError: typeof console.error
  let lines: string[]

  beforeEach(() => {
    originalLog = console.log
    originalError = console.error
    lines = []
    console.log = (...args: unknown[]) => {
      lines.push(args.map(String).join(" "))
    }
    console.error = (...args: unknown[]) => {
      lines.push(args.map(String).join(" "))
    }
  })

  afterEach(() => {
    console.log = originalLog
    console.error = originalError
  })

  test("registry hit: output contains slug and 'chain add'", async () => {
    mock.module("../registry/remote", () => ({
      searchRemote: async (_query: string) => [
        {
          slug: "test-skill",
          description: "A test skill",
          source: "github:owner/repo",
          version: "1.0.0",
          path: "skills/test-skill",
        },
      ],
    }))
    mock.module("../registry/skills-directory", () => ({
      searchSkillsDirectory: async () => [],
      chainAddDirectoryHint: (hit: { source: string; skillId: string }) =>
        `chain add github:${hit.source} --skill ${hit.skillId}`,
      skillsShPageUrl: (hit: { id: string }) => `https://skills.sh/${hit.id}`,
    }))

    // Re-import after mock update
    const { runSearch: run } = await import("./search")
    await run("test")

    const output = lines.join("\n")
    expect(output).toContain("test-skill")
    expect(output).toContain("chain add")
  })

  test("no results anywhere: output contains 'No results'", async () => {
    mock.module("../registry/remote", () => ({
      searchRemote: async () => [],
    }))
    mock.module("../registry/skills-directory", () => ({
      searchSkillsDirectory: async () => [],
      chainAddDirectoryHint: (hit: { source: string; skillId: string }) =>
        `chain add github:${hit.source} --skill ${hit.skillId}`,
      skillsShPageUrl: (hit: { id: string }) => `https://skills.sh/${hit.id}`,
    }))

    const { runSearch: run } = await import("./search")
    await run("nothing-matches-this-query")

    const output = lines.join("\n")
    expect(output).toContain("No results")
  })

  test("hubOnly flag: directory results do not appear even when mocked with results", async () => {
    mock.module("../registry/remote", () => ({
      searchRemote: async () => [],
    }))
    mock.module("../registry/skills-directory", () => ({
      searchSkillsDirectory: async () => [
        {
          id: "42",
          skillId: "cool-skill",
          name: "cool-skill",
          source: "owner/cool-skill",
          installs: 100,
        },
      ],
      chainAddDirectoryHint: (hit: { source: string; skillId: string }) =>
        `chain add github:${hit.source} --skill ${hit.skillId}`,
      skillsShPageUrl: (hit: { id: string }) => `https://skills.sh/${hit.id}`,
    }))

    const { runSearch: run } = await import("./search")
    await run("cool", { hubOnly: true })

    const output = lines.join("\n")
    expect(output).not.toContain("cool-skill")
    expect(output).toContain("No results")
    expect(output).toContain("Chain Hub registry")
  })

  test("directory hit: output contains the hit name and install hint", async () => {
    mock.module("../registry/remote", () => ({
      searchRemote: async () => [],
    }))
    mock.module("../registry/skills-directory", () => ({
      searchSkillsDirectory: async () => [
        {
          id: "99",
          skillId: "awesome-skill",
          name: "awesome-skill",
          source: "owner/awesome-skill",
          installs: 42,
        },
      ],
      chainAddDirectoryHint: (_hit: unknown) => "chain add github:owner/awesome-skill --skill awesome-skill",
      skillsShPageUrl: (_hit: unknown) => "https://skills.sh/99",
    }))

    const { runSearch: run } = await import("./search")
    await run("awesome")

    const output = lines.join("\n")
    expect(output).toContain("awesome-skill")
    expect(output).toContain("chain add github:owner/awesome-skill --skill awesome-skill")
  })

  test("formatInstalls boundary: 1500 installs renders as '1.5K installs'", async () => {
    mock.module("../registry/remote", () => ({
      searchRemote: async () => [],
    }))
    mock.module("../registry/skills-directory", () => ({
      searchSkillsDirectory: async () => [
        {
          id: "77",
          skillId: "popular-skill",
          name: "popular-skill",
          source: "owner/popular-skill",
          installs: 1500,
        },
      ],
      chainAddDirectoryHint: (_hit: unknown) => "chain add github:owner/popular-skill --skill popular-skill",
      skillsShPageUrl: (_hit: unknown) => "https://skills.sh/77",
    }))

    const { runSearch: run } = await import("./search")
    await run("popular")

    const output = lines.join("\n")
    expect(output).toContain("1.5K installs")
  })
})
