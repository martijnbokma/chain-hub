import { join } from "path"
import { appendFileSync, readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from "fs"

export interface LearningRecord {
  ts?: string
  event: "correction" | "success" | "failure" | "note"
  skill_slug: string
  summary: string
  repo_hint?: string
  session_id?: string
}

const LEARNING_SUBDIRS = ["queue", "drafts", "archive", "shared"] as const

/** Ensures `learnings/` and all standard subfolders exist (idempotent). */
export function getLearningsDir(chainHome: string) {
  const dir = join(chainHome, "learnings")
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  for (const sub of LEARNING_SUBDIRS) {
    mkdirSync(join(dir, sub), { recursive: true })
  }
  return dir
}

function parseInboxJsonl(raw: string): LearningRecord[] {
  const lines = raw.split("\n").map((l) => l.trim()).filter((l) => l.length > 0)
  const records: LearningRecord[] = []
  for (let i = 0; i < lines.length; i++) {
    try {
      records.push(JSON.parse(lines[i]) as LearningRecord)
    } catch {
      throw new Error(`learnings inbox line ${i + 1}: invalid JSON (${lines[i].slice(0, 80)}${lines[i].length > 80 ? "…" : ""})`)
    }
  }
  return records
}

export function captureLearning(chainHome: string, record: LearningRecord) {
  const dir = getLearningsDir(chainHome)
  const queueFile = join(dir, "queue", "inbox.jsonl")
  
  const entry = {
    ts: new Date().toISOString(),
    ...record
  }

  appendFileSync(queueFile, JSON.stringify(entry) + "\n", "utf-8")
}

export function distillLearnings(chainHome: string, dryRun = false): string | null {
  const dir = getLearningsDir(chainHome)
  const queueFile = join(dir, "queue", "inbox.jsonl")

  if (!existsSync(queueFile)) return null

  const content = readFileSync(queueFile, "utf-8").trim()
  if (!content) return null

  const records = parseInboxJsonl(content)

  const bySkill: Record<string, LearningRecord[]> = {}
  for (const r of records) {
    if (!bySkill[r.skill_slug]) bySkill[r.skill_slug] = []
    bySkill[r.skill_slug].push(r)
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "").slice(0, 15) + "Z"
  const parts: string[] = [
    "# Learnings distill (draft)",
    "",
    `Generated: \`${new Date().toISOString()}\``,
    `Events: **${records.length}**`,
    "",
    "Review each section, then copy vetted bullets into:",
    "`CHAIN_HOME/learnings/shared/<skill-slug>/OVERLAY.md`",
    "",
    "---",
    ""
  ]

  for (const slug of Object.keys(bySkill).sort()) {
    const items = bySkill[slug]
    parts.push(`## Skill \`${slug}\` (${items.length} events)`)
    parts.push("")
    for (const r of items) {
      const extra = r.repo_hint ? ` _repo:${r.repo_hint}_` : ""
      parts.push(`- **${r.event}** (${r.ts})${extra}: ${r.summary}`)
    }
    parts.push("")
  }

  const body = parts.join("\n")

  if (!dryRun) {
    const draftPath = join(dir, "drafts", `distill-${stamp}.md`)
    const archiveFile = join(dir, "archive", `inbox-${stamp}.jsonl`)
    
    writeFileSync(draftPath, body, "utf-8")
    renameSync(queueFile, archiveFile)
  }

  return body
}
