import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync } from "fs"
import { join } from "path"
import { validateHub } from "./validation-service"
import { listContent } from "./content-service"
import { getLearningsDir } from "../utils/learnings"

export type ImproveProposalKind = "skill_patch" | "workflow_patch" | "agent_patch" | "rule_patch"
export type ImproveProposalStatus = "draft" | "approved" | "rejected" | "applied" | "failed"
export type ImproveRiskLevel = "low" | "medium" | "high"

export interface ImproveProposal {
  id: string
  created_at: string
  kind: ImproveProposalKind
  target_path: string
  summary: string
  rationale: string
  evidence_refs: string[]
  risk_level: ImproveRiskLevel
  confidence: number
  diff_preview: string
  content?: string // Added: Full content to apply
  status: ImproveProposalStatus
  rollback_hint: string
}

export interface ImproveRun {
  run_id: string
  started_at: string
  ended_at: string
  mode: "manual"
  proposal_count: number
  approved_count: number
  applied_count: number
  failed_count: number
  validation_status: "ok" | "failed"
  notes: string
  applied_proposals?: { proposal_id: string; target_path: string; backup_content?: string }[] // Track changes for rollback
}

const PROPOSALS_FILE = "proposals.json"
const ARCHIVED_PROPOSALS_FILE = "archived_proposals.json"
const RUNS_FILE = "runs.json"

// =============================================================================
// Storage layer
// Low-level JSON persistence helpers and typed store accessors.
// =============================================================================

function getImproveDir(chainHome: string): string {
  const learningsDir = getLearningsDir(chainHome)
  const improveDir = join(learningsDir, "improve")
  mkdirSync(improveDir, { recursive: true })
  return improveDir
}

function readJsonArray<T>(path: string): T[] {
  if (!existsSync(path)) return []
  const raw = readFileSync(path, "utf-8").trim()
  if (!raw) return []
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) return []
  return parsed as T[]
}

function writeJsonArray(path: string, entries: unknown[]): void {
  writeFileSync(path, `${JSON.stringify(entries, null, 2)}\n`, "utf-8")
}

function listProposalStore(chainHome: string): ImproveProposal[] {
  return readJsonArray<ImproveProposal>(join(getImproveDir(chainHome), PROPOSALS_FILE))
}

function listRunStore(chainHome: string): ImproveRun[] {
  return readJsonArray<ImproveRun>(join(getImproveDir(chainHome), RUNS_FILE))
}

function saveProposalStore(chainHome: string, proposals: ImproveProposal[]): void {
  writeJsonArray(join(getImproveDir(chainHome), PROPOSALS_FILE), proposals)
}

function saveRunStore(chainHome: string, runs: ImproveRun[]): void {
  writeJsonArray(join(getImproveDir(chainHome), RUNS_FILE), runs)
}

// =============================================================================
// Scanning layer
// Reads draft markdown files and extracts per-skill learning events.
// =============================================================================

/** Extracts the bullet-point events from one skill section in a draft file. */
function extractSkillEvents(content: string, sectionStart: number, headerLength: number): string[] {
  const tail = content.slice(sectionStart + headerLength)
  const nextSection = tail.match(/## Skill `|---/)
  const sectionEnd = nextSection ? sectionStart + headerLength + nextSection.index! : content.length
  return content
    .slice(sectionStart, sectionEnd)
    .split("\n")
    .filter((line) => line.trim().startsWith("- **"))
    .map((line) => {
      const l = line.trim()
      // Strip metadata like (2026-05-06...) _repo_... to keep it clean for SKILL.md
      const match = l.match(/^- \*\*([^*]+)\*\* \([^)]+\) _[^_]+_: (.*)$/)
      if (match) return `- **${match[1]}**: ${match[2]}`
      return l
    })
}

/**
 * Scans all draft markdown files in `learnings/drafts/` and returns a map of
 * skill slug → { slug, events, file } built from "## Skill `slug` (N events)"
 * section headers and their bullet-point contents.
 */
function scanDraftsForSkillSlugs(chainHome: string): Map<string, { slug: string; events: string[]; file: string }> {
  const draftsDir = join(getLearningsDir(chainHome), "drafts")
  const results = new Map<string, { slug: string; events: string[]; file: string }>()
  if (!existsSync(draftsDir)) return results

  const skillHeaderRegex = /## Skill `([^`]+)` \((\d+) events\)/g

  for (const file of readdirSync(draftsDir).filter((f) => f.endsWith(".md"))) {
    const content = readFileSync(join(draftsDir, file), "utf-8")
    skillHeaderRegex.lastIndex = 0
    let match
    while ((match = skillHeaderRegex.exec(content)) !== null) {
      const slug = match[1]
      const events = extractSkillEvents(content, match.index, match[0].length)

      if (!results.has(slug)) {
        results.set(slug, { slug, events: [], file })
      }
      results.get(slug)!.events.push(...events)
    }
  }
  return results
}

// =============================================================================
// Business layer
// Exported functions that implement the improve workflow end-to-end.
// =============================================================================

export function generateImproveProposals(
  chainHome: string,
  opts: { maxProposals?: number; scopes?: string[] },
): { runId: string; generated: number; proposals: ImproveProposal[] } {
  const maxProposals = Math.max(1, Math.min(20, Number(opts.maxProposals ?? 10)))
  const scopes = Array.isArray(opts.scopes) ? opts.scopes : ["skills"]
  const existingProposals = listProposalStore(chainHome)
  const runId = crypto.randomUUID()
  const now = new Date().toISOString()

  const generated: ImproveProposal[] = []
  
  if (scopes.includes("skills")) {
    const skillDrafts = scanDraftsForSkillSlugs(chainHome)
    const userSkills = listContent(chainHome, "skills").filter((s) => !s.isCore)

    for (const [slug, data] of skillDrafts.entries()) {
      if (generated.length >= maxProposals) break

      const skill = userSkills.find((s) => s.slug === slug)
      if (!skill) continue

      const currentContent = readFileSync(skill.path, "utf-8")
      
      // 1. Filter out events that are already in the file to avoid duplicates
      const newEvents = data.events.filter((e) => !currentContent.includes(e))
      if (newEvents.length === 0) continue

      // 2. Check if we already have a draft proposal for this skill in the queue
      const alreadyInQueue = existingProposals.some(
        (p) => p.target_path === `skills/${slug}/SKILL.md` && p.status === "draft"
      )
      if (alreadyInQueue) continue

      const eventsFormatted = newEvents.join("\n")
      
      let newContent: string
      if (currentContent.includes("## Recent Learnings")) {
        // Prepend new events to existing section for chronological order (newest top)
        newContent = currentContent.replace("## Recent Learnings", `## Recent Learnings\n${eventsFormatted}`)
      } else {
        newContent = currentContent.trim() + "\n\n## Recent Learnings\n" + eventsFormatted + "\n"
      }
      
      generated.push({
        id: crypto.randomUUID(),
        created_at: now,
        kind: "skill_patch",
        target_path: `skills/${slug}/SKILL.md`,
        summary: `Incorporate ${data.events.length} new learnings into ${slug}`,
        rationale: `Reflection identified recurring patterns/corrections for this skill in recent sessions.`,
        evidence_refs: [`reflect:${data.file}`],
        risk_level: "low",
        confidence: 0.85,
        diff_preview: `+ ## Recent Learnings\n${data.events[0]}${data.events.length > 1 ? "\n..." : ""}`,
        content: newContent,
        status: "draft",
        rollback_hint: "Restores the SKILL.md to its previous state before learnings were appended.",
      })
    }
  }

  const next = [...generated, ...existingProposals]
  saveProposalStore(chainHome, next)
  const runs = listRunStore(chainHome)
  const run: ImproveRun = {
    run_id: runId,
    started_at: now,
    ended_at: now,
    mode: "manual",
    proposal_count: generated.length,
    approved_count: 0,
    applied_count: 0,
    failed_count: 0,
    validation_status: "ok",
    notes: `Generated ${generated.length} proposal(s) based on local learnings.`,
  }
  saveRunStore(chainHome, [run, ...runs])

  return { runId, generated: generated.length, proposals: generated }
}

export function listImproveProposals(chainHome: string): { proposals: ImproveProposal[] } {
  return { proposals: listProposalStore(chainHome) }
}

export function setProposalStatus(
  chainHome: string,
  proposalId: string,
  status: "approved" | "rejected",
): { ok: true } {
  const proposals = listProposalStore(chainHome)
  const next = proposals.map((proposal) => (proposal.id === proposalId ? { ...proposal, status } : proposal))
  saveProposalStore(chainHome, next)
  return { ok: true }
}

// ---------------------------------------------------------------------------
// applyApprovedProposals helpers
// ---------------------------------------------------------------------------

/** Throws if `targetPath` points to a protected core asset. */
function assertNotCoreAsset(targetPath: string): void {
  if (targetPath.startsWith("core/") || targetPath.includes("/core/")) {
    throw new Error(`Cannot mutate protected core asset: ${targetPath}`)
  }
}

/** Returns the current file content as a backup string, or undefined if the file does not exist. */
function backupFile(fullPath: string): string | undefined {
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : undefined
}

/** Ensures the parent directory exists, then writes content to fullPath. */
function writeProposalContent(fullPath: string, content: string): void {
  const dir = join(fullPath, "..")
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(fullPath, content, "utf8")
}

export function applyApprovedProposals(
  chainHome: string,
  proposalIds: string[],
): { runId: string; applied: number; failed: number; validation: "ok" | "failed" } {
  const proposals = listProposalStore(chainHome)
  const selected = new Set(proposalIds)
  let applied = 0
  let failed = 0
  const appliedMeta: { proposal_id: string; target_path: string; backup_content?: string }[] = []

  const next = proposals.map((proposal) => {
    if (!selected.has(proposal.id)) return proposal
    if (proposal.status !== "approved") return proposal

    try {
      if (!proposal.content) {
        throw new Error("No content provided in proposal")
      }

      const fullPath = join(chainHome, proposal.target_path)
      assertNotCoreAsset(proposal.target_path)
      const backupContent = backupFile(fullPath)
      writeProposalContent(fullPath, proposal.content)

      applied += 1
      appliedMeta.push({ proposal_id: proposal.id, target_path: proposal.target_path, backup_content: backupContent })
      return { ...proposal, status: "applied" as const }
    } catch (e) {
      console.error(`Failed to apply proposal ${proposal.id}:`, e)
      failed += 1
      return { ...proposal, status: "failed" as const }
    }
  })
  saveProposalStore(chainHome, next)

  const validation = validateHub(chainHome)
  const validationStatus = validation.errors.length === 0 ? "ok" : "failed"
  const runId = crypto.randomUUID()
  const now = new Date().toISOString()

  const run: ImproveRun = {
    run_id: runId,
    started_at: now,
    ended_at: new Date().toISOString(),
    mode: "manual",
    proposal_count: proposalIds.length,
    approved_count: proposalIds.length,
    applied_count: applied,
    failed_count: failed,
    validation_status: validationStatus,
    notes: validationStatus === "ok" ? "Apply run completed." : `Validation reported errors after apply: ${validation.errors[0]}`,
    applied_proposals: appliedMeta,
  }
  const runs = listRunStore(chainHome)
  saveRunStore(chainHome, [run, ...runs])
  return { runId, applied, failed, validation: validationStatus }
}

export function rollbackRun(chainHome: string, runId: string): { ok: boolean; restored: number; failed: number } {
  const runs = listRunStore(chainHome)
  const run = runs.find((r) => r.run_id === runId)
  if (!run || !run.applied_proposals) return { ok: false, restored: 0, failed: 0 }

  let restored = 0
  let failed = 0

  for (const item of run.applied_proposals) {
    try {
      const fullPath = join(chainHome, item.target_path)
      if (item.backup_content !== undefined) {
        writeFileSync(fullPath, item.backup_content, "utf8")
      } else {
        // If there was no backup, it means the file was new; delete it
        if (existsSync(fullPath)) {
          unlinkSync(fullPath)
        }
      }
      restored += 1
    } catch (e) {
      console.error(`Failed to rollback ${item.target_path}:`, e)
      failed += 1
    }
  }

  // Update proposals status back to draft or something?
  // For now, let's just mark the run as rolled back in the notes
  run.notes += ` [Rolled back at ${new Date().toISOString()}]`
  saveRunStore(chainHome, runs)

  return { ok: true, restored, failed }
}

export function getImproveRun(chainHome: string, runId: string): { run: ImproveRun | null; proposals: ImproveProposal[] } {
  const runs = listRunStore(chainHome)
  const proposals = listProposalStore(chainHome)
  const run = runs.find((entry) => entry.run_id === runId) ?? null
  return { run, proposals }
}

export function archiveProposals(chainHome: string): { archived: number } {
  const proposals = listProposalStore(chainHome)
  const toKeep: ImproveProposal[] = []
  const toArchive: ImproveProposal[] = []

  for (const p of proposals) {
    if (p.status === "applied" || p.status === "rejected" || p.status === "failed") {
      toArchive.push(p)
    } else {
      toKeep.push(p)
    }
  }

  if (toArchive.length === 0) {
    return { archived: 0 }
  }

  // Save updated active store
  saveProposalStore(chainHome, toKeep)

  // Append to archive store
  const archivePath = join(getImproveDir(chainHome), ARCHIVED_PROPOSALS_FILE)
  const existingArchive = readJsonArray<ImproveProposal>(archivePath)
  writeJsonArray(archivePath, [...toArchive, ...existingArchive])

  return { archived: toArchive.length }
}
