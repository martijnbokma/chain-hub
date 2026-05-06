import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"
import { validateHub } from "./validation-service"
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
}

const PROPOSALS_FILE = "proposals.json"
const RUNS_FILE = "runs.json"

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

function createMockProposal(): ImproveProposal {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    created_at: now,
    kind: "skill_patch",
    target_path: "skills/example-skill/SKILL.md",
    summary: "Improve instruction clarity for a frequently used skill",
    rationale: "Seed proposal scaffold generated from current learnings flow",
    evidence_refs: ["reflect:latest"],
    risk_level: "low",
    confidence: 0.62,
    diff_preview: "Refine wording in one section and add a short example.",
    status: "draft",
    rollback_hint: "Revert the SKILL.md edit to restore previous instructions.",
  }
}

export function generateImproveProposals(
  chainHome: string,
  opts: { maxProposals?: number; scopes?: string[] },
): { runId: string; generated: number; proposals: ImproveProposal[] } {
  const maxProposals = Math.max(1, Math.min(20, Number(opts.maxProposals ?? 3)))
  const scopes = Array.isArray(opts.scopes) ? opts.scopes : []
  const proposals = listProposalStore(chainHome)
  const runId = crypto.randomUUID()

  const generated: ImproveProposal[] = []
  if (scopes.length === 0 || scopes.includes("skills")) {
    for (let i = 0; i < maxProposals; i += 1) {
      generated.push(createMockProposal())
    }
  }

  const next = [...generated, ...proposals]
  saveProposalStore(chainHome, next)
  const runs = listRunStore(chainHome)
  const now = new Date().toISOString()
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
    notes: "Generated proposal scaffolds.",
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

export function applyApprovedProposals(
  chainHome: string,
  proposalIds: string[],
): { runId: string; applied: number; failed: number; validation: "ok" | "failed" } {
  const proposals = listProposalStore(chainHome)
  const selected = new Set(proposalIds)
  let applied = 0

  const next = proposals.map((proposal) => {
    if (!selected.has(proposal.id)) return proposal
    if (proposal.status !== "approved") return proposal
    applied += 1
    return { ...proposal, status: "applied" as const }
  })
  saveProposalStore(chainHome, next)

  const validation = validateHub(chainHome)
  const validationStatus = validation.errors.length === 0 ? "ok" : "failed"
  const runId = crypto.randomUUID()
  const now = new Date().toISOString()
  const run: ImproveRun = {
    run_id: runId,
    started_at: now,
    ended_at: now,
    mode: "manual",
    proposal_count: proposalIds.length,
    approved_count: proposalIds.length,
    applied_count: applied,
    failed_count: 0,
    validation_status: validationStatus,
    notes: validationStatus === "ok" ? "Apply scaffold run completed." : "Validation reported errors after apply.",
  }
  const runs = listRunStore(chainHome)
  saveRunStore(chainHome, [run, ...runs])
  return { runId, applied, failed: 0, validation: validationStatus }
}

export function getImproveRun(chainHome: string, runId: string): { run: ImproveRun | null; proposals: ImproveProposal[] } {
  const runs = listRunStore(chainHome)
  const proposals = listProposalStore(chainHome)
  const run = runs.find((entry) => entry.run_id === runId) ?? null
  return { run, proposals }
}
