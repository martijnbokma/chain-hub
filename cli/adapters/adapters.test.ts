import { describe, expect, test } from "bun:test"
import { mkdirSync } from "fs"
import { homedir, tmpdir } from "os"
import { join } from "path"

import { allAdapters, windsurf, cursor, claudeCode, antigravity, gemini, mistralVibe, trae, kiro, universal } from "./index"

// ---------------------------------------------------------------------------
// 1. allAdapters export — length and shape
// ---------------------------------------------------------------------------
describe("allAdapters", () => {
  test("exports exactly 9 adapters", () => {
    expect(allAdapters).toHaveLength(9)
  })

  test("every adapter has a name string and links function", () => {
    for (const adapter of allAdapters) {
      expect(typeof adapter.name).toBe("string")
      expect(adapter.name.length).toBeGreaterThan(0)
      expect(typeof adapter.links).toBe("function")
      expect(typeof adapter.detect).toBe("function")
    }
  })
})

// ---------------------------------------------------------------------------
// 2. links() shape — non-empty, correct field types, from/to prefixes
// ---------------------------------------------------------------------------
const FAKE_HOME = "/some/fake/chain-home"

describe("links() shape for all adapters", () => {
  const adapters = [windsurf, cursor, claudeCode, antigravity, gemini, mistralVibe, trae, kiro, universal]

  for (const adapter of adapters) {
    test(`${adapter.name}: links() returns a non-empty array with correct shape`, () => {
      const links = adapter.links(FAKE_HOME)

      expect(Array.isArray(links)).toBe(true)
      expect(links.length).toBeGreaterThan(0)

      for (const link of links) {
        // All fields must be strings
        expect(typeof link.from).toBe("string")
        expect(typeof link.to).toBe("string")
        expect(typeof link.description).toBe("string")

        // from must start with the chainHome we passed in
        expect(link.from).toMatch(new RegExp(`^${FAKE_HOME}`))

        // to must start with homedir()
        expect(link.to).toMatch(new RegExp(`^${homedir().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`))

        // description must be non-empty
        expect(link.description.length).toBeGreaterThan(0)
      }
    })
  }
})

// ---------------------------------------------------------------------------
// 3. universal.detect() is always true
// ---------------------------------------------------------------------------
describe("universal adapter", () => {
  test("detect() always returns true", () => {
    expect(universal.detect()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 4. detect() return type is always boolean for non-universal adapters
// ---------------------------------------------------------------------------
describe("non-universal adapter detect() return type", () => {
  const nonUniversal = [windsurf, cursor, claudeCode, antigravity, gemini, mistralVibe, trae, kiro]

  for (const adapter of nonUniversal) {
    test(`${adapter.name}: detect() returns a boolean`, () => {
      expect(typeof adapter.detect()).toBe("boolean")
    })
  }
})

// ---------------------------------------------------------------------------
// 5. claudeCode memory link is conditional on the memory/ dir existing
// ---------------------------------------------------------------------------
describe("claudeCode memory link", () => {
  test("memory link is NOT included when chainHome/memory does not exist", () => {
    // Use a temp dir without a memory/ subdirectory
    const chainHome = join(tmpdir(), `chain-hub-test-no-memory-${process.pid}`)
    mkdirSync(chainHome, { recursive: true })

    const links = claudeCode.links(chainHome)
    const memoryLink = links.find((l) => l.description === "memory")

    expect(memoryLink).toBeUndefined()
  })

  test("memory link IS included when chainHome/memory exists", () => {
    // Use a temp dir that has a memory/ subdirectory
    const chainHome = join(tmpdir(), `chain-hub-test-with-memory-${process.pid}`)
    mkdirSync(join(chainHome, "memory"), { recursive: true })

    const links = claudeCode.links(chainHome)
    const memoryLink = links.find((l) => l.description === "memory")

    expect(memoryLink).toBeDefined()
    expect(memoryLink!.from).toBe(join(chainHome, "memory"))
    expect(typeof memoryLink!.to).toBe("string")
    expect(memoryLink!.to.length).toBeGreaterThan(0)
  })

  test("memory link 'to' path contains the correct project ID derivation from homedir", () => {
    const chainHome = join(tmpdir(), `chain-hub-test-memory-path-${process.pid}`)
    mkdirSync(join(chainHome, "memory"), { recursive: true })

    const links = claudeCode.links(chainHome)
    const memoryLink = links.find((l) => l.description === "memory")!

    // Project ID: homedir() with slashes replaced by dashes, leading dash stripped
    const expectedProjectId = homedir().replace(/\//g, "-").replace(/^-/, "")
    expect(memoryLink.to).toContain(expectedProjectId)
    expect(memoryLink.to).toContain(".claude")
    expect(memoryLink.to).toContain("projects")
    expect(memoryLink.to).toContain("memory")
  })
})

// ---------------------------------------------------------------------------
// 6. claudeCode baseline links are always present regardless of memory
// ---------------------------------------------------------------------------
describe("claudeCode baseline links", () => {
  test("always includes agents, skills, CLAUDE.md, and commands links", () => {
    const chainHome = join(tmpdir(), `chain-hub-test-baseline-${process.pid}`)
    mkdirSync(chainHome, { recursive: true })

    const links = claudeCode.links(chainHome)
    const descriptions = links.map((l) => l.description)

    expect(descriptions).toContain("agents")
    expect(descriptions).toContain("skills")
    expect(descriptions).toContain("CLAUDE.md")
    expect(descriptions).toContain("commands")
  })
})
