import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdirSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { runUpdate } from "./update"

describe("runUpdate", () => {
  let tmp: string
  let originalChainHome: string | undefined
  let originalLog: typeof console.log
  let originalError: typeof console.error
  let lines: string[]
  let errorLines: string[]

  beforeEach(() => {
    tmp = join(tmpdir(), `chain-update-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(join(tmp, "skills"), { recursive: true })

    originalChainHome = process.env.CHAIN_HOME
    process.env.CHAIN_HOME = tmp

    originalLog = console.log
    originalError = console.error
    lines = []
    errorLines = []

    console.log = (...args: unknown[]) => {
      lines.push(args.map(String).join(" "))
    }
    console.error = (...args: unknown[]) => {
      errorLines.push(args.map(String).join(" "))
    }
  })

  afterEach(() => {
    console.log = originalLog
    console.error = originalError
    if (originalChainHome === undefined) delete process.env.CHAIN_HOME
    else process.env.CHAIN_HOME = originalChainHome
    rmSync(tmp, { recursive: true, force: true })
  })

  test("empty registry completes with 0 updated, 0 skipped", async () => {
    writeFileSync(
      join(tmp, "skills-registry.yaml"),
      `schema_version: 3
chain_hub: []
personal: []
cli_packages: []
`,
    )

    await runUpdate()

    const output = lines.join("\n")
    expect(output).toContain("0 updated, 0 skipped")
  })

  test("registry with only personal skills skips them and reports 0 updated", async () => {
    writeFileSync(
      join(tmp, "skills-registry.yaml"),
      `schema_version: 3
chain_hub: []
personal:
  - my-custom-skill
  - another-personal-skill
cli_packages: []
`,
    )

    await runUpdate()

    const output = lines.join("\n")
    // Personal skills should be reported as skipped
    expect(output).toContain("Skipped 2 personal skill(s)")
    // Done line should show 0 updated
    expect(output).toContain("0 updated")
    // Updated count should be zero, skipped should include the personal count
    expect(output).toContain("2 skipped")
  })

  test("single personal skill prints singular skipped message and 0 updated", async () => {
    writeFileSync(
      join(tmp, "skills-registry.yaml"),
      `schema_version: 3
chain_hub: []
personal:
  - solo-skill
cli_packages: []
`,
    )

    await runUpdate()

    const output = lines.join("\n")
    expect(output).toContain("Skipped 1 personal skill(s)")
    expect(output).toContain("0 updated")
    expect(output).toContain("1 skipped")
  })

  test("chain_hub slug not in remote index is skipped with a dim message", async () => {
    // Use a slug that definitely does not exist in the bundled registry index.
    // fetchRemoteIndex() will fall back to the bundled catalog (no network needed),
    // and the slug will not be found → "not in remote registry (skipped)".
    writeFileSync(
      join(tmp, "skills-registry.yaml"),
      `schema_version: 3
chain_hub:
  - this-slug-does-not-exist-in-any-registry
personal: []
cli_packages: []
`,
    )

    await runUpdate()

    const output = lines.join("\n")
    // The slug should be mentioned as skipped
    expect(output).toContain("this-slug-does-not-exist-in-any-registry")
    expect(output).toContain("not in remote registry (skipped)")
    // Updated count stays 0, skipped count is 1
    expect(output).toContain("0 updated")
    expect(output).toContain("1 skipped")
  })

  test("chain_hub skills trigger registry check message", async () => {
    writeFileSync(
      join(tmp, "skills-registry.yaml"),
      `schema_version: 3
chain_hub:
  - no-such-skill-alpha
  - no-such-skill-beta
personal: []
cli_packages: []
`,
    )

    await runUpdate()

    const output = lines.join("\n")
    // The header for checking registry skills should appear with the count
    expect(output).toContain("Checking 2 registry skill(s)")
  })

  test("missing registry file behaves as empty registry and completes cleanly", async () => {
    // Do not write skills-registry.yaml at all; readRegistry() returns defaults
    await runUpdate()

    const output = lines.join("\n")
    expect(output).toContain("0 updated, 0 skipped")
  })

  test("done line is always printed even with mixed personal and chain_hub slugs", async () => {
    writeFileSync(
      join(tmp, "skills-registry.yaml"),
      `schema_version: 3
chain_hub:
  - nonexistent-hub-skill
personal:
  - my-personal-skill
cli_packages: []
`,
    )

    await runUpdate()

    const output = lines.join("\n")
    // Done line must always appear
    expect(output).toContain("Done")
    expect(output).toContain("updated")
    expect(output).toContain("skipped")
    // Personal skill dim notice
    expect(output).toContain("Skipped 1 personal skill(s)")
  })
})
