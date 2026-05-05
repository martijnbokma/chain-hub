import { describe, expect, test, beforeEach, afterEach } from "bun:test"
import { mkdirSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { messageMatchesSlug, validateSkill } from "./validation-service"

// ─── messageMatchesSlug unit tests ───────────────────────────────────────────

describe("messageMatchesSlug", () => {
  describe("Skill <slug>: prefix (skill validator + symlink warning)", () => {
    test("matches exact slug", () => {
      expect(messageMatchesSlug("Skill debug: Missing SKILL.md", "debug")).toBe(true)
    })

    test("does not match a slug that is a prefix of the message slug", () => {
      expect(messageMatchesSlug("Skill debug-tools: Missing SKILL.md", "debug")).toBe(false)
    })

    test("does not match a slug that is a suffix of the message slug", () => {
      expect(messageMatchesSlug("Skill my-debug: Missing SKILL.md", "debug")).toBe(false)
    })

    test("matches broken-symlink warning with exact slug", () => {
      expect(messageMatchesSlug("Skill debug: Broken symlink (points to ../other)", "debug")).toBe(true)
    })

    test("does not match broken-symlink warning for prefix slug", () => {
      expect(messageMatchesSlug("Skill debug-tools: Broken symlink (points to ../other)", "debug")).toBe(false)
    })
  })

  describe("Registry slug '<slug>' messages", () => {
    test("matches exact slug", () => {
      expect(messageMatchesSlug("Registry slug 'debug' has no directory under skills/", "debug")).toBe(true)
    })

    test("does not match prefix collision", () => {
      expect(messageMatchesSlug("Registry slug 'debug-tools' has no directory under skills/", "debug")).toBe(false)
    })
  })

  describe("Directory '<slug>' in skills/ messages", () => {
    test("matches exact slug", () => {
      expect(messageMatchesSlug("Directory 'debug' in skills/ is not in registry", "debug")).toBe(true)
    })

    test("does not match prefix collision", () => {
      expect(messageMatchesSlug("Directory 'debug-tools' in skills/ is not in registry", "debug")).toBe(false)
    })
  })

  describe("Duplicate registry slug '<slug>' messages", () => {
    test("matches exact slug", () => {
      expect(
        messageMatchesSlug(
          "Duplicate registry slug 'debug' in skills-registry.yaml (each skill must appear in one bucket only)",
          "debug",
        ),
      ).toBe(true)
    })

    test("does not match prefix collision", () => {
      expect(
        messageMatchesSlug(
          "Duplicate registry slug 'debug-tools' in skills-registry.yaml (each skill must appear in one bucket only)",
          "debug",
        ),
      ).toBe(false)
    })
  })

  describe("authorship.self slug '<slug>' messages", () => {
    test("matches exact slug", () => {
      expect(
        messageMatchesSlug(
          "authorship.self slug 'debug' is not listed in chain_hub, personal, packs, community, or cli_packages",
          "debug",
        ),
      ).toBe(true)
    })

    test("does not match prefix collision", () => {
      expect(
        messageMatchesSlug(
          "authorship.self slug 'debug-tools' is not listed in chain_hub, personal, packs, community, or cli_packages",
          "debug",
        ),
      ).toBe(false)
    })
  })

  describe("github_sources skill '<slug>' messages", () => {
    test("matches exact slug", () => {
      expect(
        messageMatchesSlug(
          "github_sources skill 'debug' is not in chain_hub, personal, packs, community, or cli_packages",
          "debug",
        ),
      ).toBe(true)
    })

    test("does not match prefix collision", () => {
      expect(
        messageMatchesSlug(
          "github_sources skill 'debug-tools' is not in chain_hub, personal, packs, community, or cli_packages",
          "debug",
        ),
      ).toBe(false)
    })
  })

  describe("Skill '<slug>' appears in more than one github_sources bundle", () => {
    test("matches exact slug", () => {
      expect(
        messageMatchesSlug(
          "Skill 'debug' appears in more than one github_sources bundle (use a single repo per skill)",
          "debug",
        ),
      ).toBe(true)
    })

    test("does not match prefix collision", () => {
      expect(
        messageMatchesSlug(
          "Skill 'debug-tools' appears in more than one github_sources bundle (use a single repo per skill)",
          "debug",
        ),
      ).toBe(false)
    })
  })

  describe("Core skill '<slug>' messages", () => {
    test("matches missing core skill message", () => {
      expect(
        messageMatchesSlug(
          "Core skill 'debug' is listed in core/registry.yaml but missing from core/skills/",
          "debug",
        ),
      ).toBe(true)
    })

    test("matches must-be-directory core skill message", () => {
      expect(messageMatchesSlug("Core skill 'debug' must be a directory under core/skills/", "debug")).toBe(true)
    })

    test("does not match prefix collision", () => {
      expect(
        messageMatchesSlug(
          "Core skill 'debug-tools' is listed in core/registry.yaml but missing from core/skills/",
          "debug",
        ),
      ).toBe(false)
    })
  })

  test("does not match unrelated messages", () => {
    expect(messageMatchesSlug("Missing skills-registry.yaml — CHAIN_HOME is not initialized.", "debug")).toBe(false)
    expect(messageMatchesSlug("Invalid YAML in skills-registry.yaml: unexpected token", "debug")).toBe(false)
    expect(messageMatchesSlug("github_sources entry must have a 'github' string starting with github:", "debug")).toBe(false)
  })
})

// ─── validateSkill integration tests ─────────────────────────────────────────

function makeHub(suffix: string): string {
  const dir = join(tmpdir(), `chain-vs-${suffix}-${Date.now()}-${Math.random().toString(16).slice(2)}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

function writeRegistry(hub: string, content: string) {
  writeFileSync(join(hub, "skills-registry.yaml"), content.trimStart())
}

function writeSkill(hub: string, slug: string, name = slug) {
  mkdirSync(join(hub, "skills", slug), { recursive: true })
  writeFileSync(
    join(hub, "skills", slug, "SKILL.md"),
    `---\nname: ${name}\ndescription: Valid description long enough for validation checks.\n---\n# ${name}\n\nBody content.\n`,
  )
}

describe("validateSkill", () => {
  let hub: string

  beforeEach(() => {
    hub = makeHub("test")
  })

  afterEach(() => {
    rmSync(hub, { recursive: true, force: true })
  })

  test("returns only errors for the requested slug, not for a prefix-collision slug", () => {
    writeRegistry(
      hub,
      `schema_version: 3\nchain_hub: []\npersonal:\n  - debug\n  - debug-tools\ncli_packages: []\n`,
    )
    writeSkill(hub, "debug-tools")
    // deliberately omit debug/ so it triggers "Registry slug 'debug' has no directory"

    const result = validateSkill(hub, "debug")

    expect(result.errors.some((e) => e.includes("debug-tools"))).toBe(false)
    expect(result.errors.some((e) => e.includes("'debug'"))).toBe(true)
  })

  test("returns skill-level errors only for the requested slug", () => {
    writeRegistry(
      hub,
      `schema_version: 3\nchain_hub: []\npersonal:\n  - alpha\n  - beta\ncli_packages: []\n`,
    )
    writeSkill(hub, "beta")
    // alpha directory missing → registry error for alpha

    const resultAlpha = validateSkill(hub, "alpha")
    const resultBeta = validateSkill(hub, "beta")

    expect(resultAlpha.errors.some((e) => e.includes("'alpha'"))).toBe(true)
    expect(resultAlpha.errors.some((e) => e.includes("'beta'"))).toBe(false)

    expect(resultBeta.errors.some((e) => e.includes("'beta'"))).toBe(false)
    expect(resultBeta.errors.some((e) => e.includes("'alpha'"))).toBe(false)
  })

  test("returns warnings for requested slug only", () => {
    writeRegistry(
      hub,
      `schema_version: 3\nchain_hub: []\npersonal:\n  - debug\n  - debug-tools\ncli_packages: []\n`,
    )
    // Both skills exist but with mismatched frontmatter names → triggers warnings
    mkdirSync(join(hub, "skills", "debug"), { recursive: true })
    writeFileSync(
      join(hub, "skills", "debug", "SKILL.md"),
      `---\nname: debug-renamed\ndescription: Valid description long enough for validation checks.\n---\n# debug\n\nBody content.\n`,
    )
    mkdirSync(join(hub, "skills", "debug-tools"), { recursive: true })
    writeFileSync(
      join(hub, "skills", "debug-tools", "SKILL.md"),
      `---\nname: debug-tools-renamed\ndescription: Valid description long enough for validation checks.\n---\n# debug-tools\n\nBody content.\n`,
    )

    const result = validateSkill(hub, "debug")

    expect(result.warnings.some((w) => w.startsWith("Skill debug:"))).toBe(true)
    expect(result.warnings.some((w) => w.startsWith("Skill debug-tools:"))).toBe(false)
  })
})
