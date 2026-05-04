import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { captureLearning, distillLearnings, getLearningsDir } from "./learnings"

describe("learnings", () => {
  let tmp: string
  let originalChainHome: string | undefined

  beforeEach(() => {
    tmp = join(tmpdir(), `chain-learnings-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(tmp, { recursive: true })
    originalChainHome = process.env.CHAIN_HOME
    process.env.CHAIN_HOME = tmp
  })

  afterEach(() => {
    if (originalChainHome === undefined) delete process.env.CHAIN_HOME
    else process.env.CHAIN_HOME = originalChainHome
    rmSync(tmp, { recursive: true, force: true })
  })

  test("getLearningsDir creates subfolders when learnings exists but queue was missing", () => {
    mkdirSync(join(tmp, "learnings"), { recursive: true })
    expect(existsSync(join(tmp, "learnings", "queue"))).toBe(false)
    getLearningsDir(tmp)
    expect(existsSync(join(tmp, "learnings", "queue"))).toBe(true)
    expect(existsSync(join(tmp, "learnings", "drafts"))).toBe(true)
    expect(existsSync(join(tmp, "learnings", "archive"))).toBe(true)
    expect(existsSync(join(tmp, "learnings", "shared"))).toBe(true)
  })

  test("distillLearnings returns null when inbox is missing", () => {
    getLearningsDir(tmp)
    expect(distillLearnings(tmp)).toBe(null)
  })

  test("distillLearnings skips blank lines and groups by skill", () => {
    getLearningsDir(tmp)
    const inbox = join(tmp, "learnings", "queue", "inbox.jsonl")
    const row1 = JSON.stringify({
      event: "success",
      skill_slug: "alpha",
      summary: "first",
      ts: "2026-01-01T00:00:00.000Z",
    })
    const row2 = JSON.stringify({
      event: "failure",
      skill_slug: "beta",
      summary: "second",
      ts: "2026-01-02T00:00:00.000Z",
    })
    writeFileSync(inbox, `${row1}\n\n  \n${row2}\n`, "utf-8")

    const body = distillLearnings(tmp, true)
    expect(body).toContain("## Skill `alpha`")
    expect(body).toContain("## Skill `beta`")
    expect(body).toContain("Events: **2**")
    expect(existsSync(inbox)).toBe(true)
  })

  test("distillLearnings dry run does not archive inbox", () => {
    getLearningsDir(tmp)
    const inbox = join(tmp, "learnings", "queue", "inbox.jsonl")
    writeFileSync(
      inbox,
      JSON.stringify({ event: "note", skill_slug: "x", summary: "y" }) + "\n",
      "utf-8",
    )
    distillLearnings(tmp, true)
    expect(existsSync(inbox)).toBe(true)
    expect(readdirSync(join(tmp, "learnings", "archive")).length).toBe(0)
  })

  test("distillLearnings writes draft and archives inbox when not dry run", () => {
    getLearningsDir(tmp)
    const inbox = join(tmp, "learnings", "queue", "inbox.jsonl")
    writeFileSync(
      inbox,
      JSON.stringify({ event: "note", skill_slug: "z", summary: "archived" }) + "\n",
      "utf-8",
    )
    distillLearnings(tmp, false)
    expect(existsSync(inbox)).toBe(false)
    const archived = readdirSync(join(tmp, "learnings", "archive"))
    expect(archived.some((f) => f.startsWith("inbox-") && f.endsWith(".jsonl"))).toBe(true)
    const drafts = readdirSync(join(tmp, "learnings", "drafts"))
    expect(drafts.some((f) => f.startsWith("distill-") && f.endsWith(".md"))).toBe(true)
  })

  test("distillLearnings throws on invalid JSON with line number", () => {
    getLearningsDir(tmp)
    const inbox = join(tmp, "learnings", "queue", "inbox.jsonl")
    writeFileSync(inbox, "{ not json\n", "utf-8")
    expect(() => distillLearnings(tmp, true)).toThrow(/inbox line 1/)
  })

  test("captureLearning appends after partial learnings layout", () => {
    mkdirSync(join(tmp, "learnings"), { recursive: true })
    captureLearning(tmp, { event: "note", skill_slug: "s", summary: "ok" })
    const inbox = join(tmp, "learnings", "queue", "inbox.jsonl")
    expect(existsSync(inbox)).toBe(true)
    expect(readFileSync(inbox, "utf-8").trim()).toContain('"skill_slug":"s"')
  })
})
