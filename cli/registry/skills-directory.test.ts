import { afterEach, describe, expect, test } from "bun:test"
import { chainAddDirectoryHint, searchSkillsDirectory, skillsShPageUrl } from "./skills-directory"

describe("searchSkillsDirectory", () => {
  const origFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = origFetch
  })

  test("returns empty for very short query without calling fetch", async () => {
    let called = false
    globalThis.fetch = () => {
      called = true
      return Promise.resolve(new Response("{}", { status: 200 }))
    }
    expect(await searchSkillsDirectory("a", 10)).toEqual([])
    expect(called).toBe(false)
  })

  test("maps skills.sh API response", async () => {
    globalThis.fetch = async (input: RequestInfo | URL) => {
      expect(String(input)).toContain("/api/search?q=documentation")
      return new Response(
        JSON.stringify({
          skills: [
            {
              id: "anthropics/knowledge-work-plugins/documentation",
              skillId: "documentation",
              name: "documentation",
              installs: 100,
              source: "anthropics/knowledge-work-plugins",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      )
    }
    const r = await searchSkillsDirectory("documentation", 5)
    expect(r).toHaveLength(1)
    expect(r[0]?.source).toBe("anthropics/knowledge-work-plugins")
    expect(r[0]?.skillId).toBe("documentation")
    expect(skillsShPageUrl(r[0]!)).toBe("https://skills.sh/anthropics/knowledge-work-plugins/documentation")
    expect(chainAddDirectoryHint(r[0]!)).toBe(
      "chain add github:anthropics/knowledge-work-plugins --skill documentation",
    )
  })

  test("returns empty on non-OK response", async () => {
    globalThis.fetch = () => Promise.resolve(new Response("", { status: 503 }))
    expect(await searchSkillsDirectory("x", 10)).toEqual([])
  })
})
