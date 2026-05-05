import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdirSync, readFileSync, rmSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { runCapture } from "./capture"

describe("runCapture", () => {
  let tmp: string
  let originalChainHome: string | undefined

  beforeEach(() => {
    tmp = join(tmpdir(), `chain-capture-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(tmp, { recursive: true })
    originalChainHome = process.env.CHAIN_HOME
    process.env.CHAIN_HOME = tmp
  })

  afterEach(() => {
    if (originalChainHome === undefined) delete process.env.CHAIN_HOME
    else process.env.CHAIN_HOME = originalChainHome
    rmSync(tmp, { recursive: true, force: true })
  })

  test("creates the inbox file and appends a record", async () => {
    await runCapture({ event: "success", skill: "my-skill", summary: "it worked" })

    const inboxPath = join(tmp, "learnings", "queue", "inbox.jsonl")
    const raw = readFileSync(inboxPath, "utf-8").trim()
    const record = JSON.parse(raw)

    expect(record.event).toBe("success")
    expect(record.skill_slug).toBe("my-skill")
    expect(record.summary).toBe("it worked")
  })

  test("appends multiple records", async () => {
    await runCapture({ event: "success", skill: "skill-a", summary: "first" })
    await runCapture({ event: "failure", skill: "skill-b", summary: "second" })

    const inboxPath = join(tmp, "learnings", "queue", "inbox.jsonl")
    const lines = readFileSync(inboxPath, "utf-8")
      .split("\n")
      .filter((l) => l.trim().length > 0)

    expect(lines).toHaveLength(2)

    const first = JSON.parse(lines[0])
    const second = JSON.parse(lines[1])

    expect(first.event).toBe("success")
    expect(second.event).toBe("failure")
  })

  test("optional repo field is included when provided", async () => {
    await runCapture({ event: "note", skill: "my-skill", summary: "noted", repo: "my-repo" })

    const inboxPath = join(tmp, "learnings", "queue", "inbox.jsonl")
    const raw = readFileSync(inboxPath, "utf-8").trim()
    const record = JSON.parse(raw)

    expect(record.repo_hint).toBe("my-repo")
  })
})
