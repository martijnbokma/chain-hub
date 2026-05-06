import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { previewReflect, runReflect } from "./reflect-service"
import { getLearningsDir } from "../utils/learnings"

describe("reflect-service", () => {
  let hub: string

  beforeEach(() => {
    hub = join(tmpdir(), `chain-reflect-service-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(hub, { recursive: true })
    getLearningsDir(hub)
  })

  afterEach(() => {
    rmSync(hub, { recursive: true, force: true })
  })

  test("preview reports empty queue without generating files", () => {
    const result = previewReflect(hub)
    expect(result.ok).toBe(true)
    expect(result.hasQueuedEvents).toBe(false)
    expect(result.eventCount).toBe(0)
    const drafts = readdirSync(join(hub, "learnings", "drafts"))
    expect(drafts.length).toBe(0)
  })

  test("preview reads queued events count", () => {
    const inbox = join(hub, "learnings", "queue", "inbox.jsonl")
    writeFileSync(
      inbox,
      [
        JSON.stringify({ event: "success", skill_slug: "alpha", summary: "first" }),
        JSON.stringify({ event: "note", skill_slug: "beta", summary: "second" }),
      ].join("\n") + "\n",
      "utf-8",
    )
    const result = previewReflect(hub)
    expect(result.ok).toBe(true)
    expect(result.hasQueuedEvents).toBe(true)
    expect(result.eventCount).toBe(2)
  })

  test("run creates a draft file when queue has events", () => {
    const inbox = join(hub, "learnings", "queue", "inbox.jsonl")
    writeFileSync(
      inbox,
      JSON.stringify({ event: "success", skill_slug: "alpha", summary: "saved insight" }) + "\n",
      "utf-8",
    )

    const result = runReflect(hub)
    expect(result.ok).toBe(true)
    expect(result.eventCount).toBe(1)
    expect(result.generated.length).toBe(1)

    const drafts = readdirSync(join(hub, "learnings", "drafts"))
    expect(drafts.some((name) => name.startsWith("distill-") && name.endsWith(".md"))).toBe(true)
  })
})
