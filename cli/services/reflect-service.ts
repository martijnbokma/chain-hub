import { readdirSync } from "fs"
import { join } from "path"
import { distillLearnings, getLearningsDir } from "../utils/learnings"

interface ReflectSummary {
  eventCount: number
}

function parseEventCount(markdown: string): number {
  const match = markdown.match(/Events:\s+\*\*(\d+)\*\*/)
  if (!match) return 0
  const parsed = Number.parseInt(match[1] ?? "0", 10)
  return Number.isFinite(parsed) ? parsed : 0
}

function listDraftFiles(chainHome: string): string[] {
  const draftsDir = join(getLearningsDir(chainHome), "drafts")
  const files = readdirSync(draftsDir)
    .filter((name) => name.startsWith("distill-") && name.endsWith(".md"))
    .sort((a, b) => b.localeCompare(a))
  return files
}

function summarize(body: string | null): ReflectSummary {
  if (!body) {
    return { eventCount: 0 }
  }
  return {
    eventCount: parseEventCount(body),
  }
}

export function previewReflect(chainHome: string): {
  ok: true
  eventCount: number
  hasQueuedEvents: boolean
  message: string
} {
  const body = distillLearnings(chainHome, true)
  const summary = summarize(body)
  if (!body) {
    return {
      ok: true,
      eventCount: 0,
      hasQueuedEvents: false,
      message: "No queued events found in the learnings inbox.",
    }
  }
  return {
    ok: true,
    eventCount: summary.eventCount,
    hasQueuedEvents: true,
    message: "Preview ready. You can run reflect to generate draft learnings.",
  }
}

export function runReflect(chainHome: string): {
  ok: true
  eventCount: number
  generated: string[]
  draftsPath: string
  message: string
} {
  const before = new Set(listDraftFiles(chainHome))
  const body = distillLearnings(chainHome, false)
  const summary = summarize(body)
  const draftsPath = join(getLearningsDir(chainHome), "drafts")
  const after = listDraftFiles(chainHome)
  const generated = after.filter((name) => !before.has(name))

  if (!body) {
    return {
      ok: true,
      eventCount: 0,
      generated: [],
      draftsPath,
      message: "No queued events found in the learnings inbox.",
    }
  }

  return {
    ok: true,
    eventCount: summary.eventCount,
    generated,
    draftsPath,
    message: generated.length > 0 ? "Reflect completed successfully." : "Reflect finished with no new draft files.",
  }
}
