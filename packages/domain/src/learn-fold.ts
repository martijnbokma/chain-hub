import {
  isUpstreamOwnedSkill,
  normalizeSkillName,
  NotFoundError,
  type AiConfig,
  type AiSecrets,
  type AuditAssetResult,
  type CaptureEvent,
  type FoldLearningsInput,
  type FoldLearningsResult,
  type FoldSkillOutcome,
  type FoldSkillResult
} from "@chain-hub/contracts";
import {
  buildReflectionReport,
  foldsDir,
  getAsset,
  getSkillLearnings,
  readAiConfig,
  readAiSecrets,
  resolveChainHome,
  resolveSkillLearnings,
  updateAsset,
  writeFoldArtifact,
  writeSkillToPathSource
} from "@chain-hub/storage";

import { AiProviderError, auditExistingAsset, improveExistingAsset } from "./ai-providers.js";

/** Max captured learning events given to one audit, to keep the prompt focused. */
export const AUDIT_LEARNINGS_LIMIT = 10;

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type FoldContext = {
  home: string;
  config: AiConfig;
  secrets: AiSecrets;
  dryRun: boolean;
  toSource: boolean;
};

function baseResult(skill: string, learnings: CaptureEvent[]): FoldSkillResult {
  return {
    skill,
    outcome: "failed",
    findingCount: 0,
    findings: [],
    currentContent: null,
    proposedContent: null,
    learningsConsidered: learnings.length,
    artifactPath: null,
    error: null
  };
}

async function foldOneSkill(ctx: FoldContext, skill: string, learnings: CaptureEvent[]): Promise<FoldSkillResult> {
  const base = baseResult(skill, learnings);

  let asset;
  try {
    asset = await getAsset(ctx.home, "skills", skill);
  } catch (error) {
    if (error instanceof NotFoundError) {
      // Reports exist but no skill to fold them into — leave them open and say so.
      return { ...base, outcome: "orphan", error: "No skill with this name in the hub" };
    }
    throw error;
  }

  const audit: AuditAssetResult = await auditExistingAsset({
    config: ctx.config,
    secrets: ctx.secrets,
    kind: "skills",
    name: skill,
    content: asset.content,
    learnings
  });
  base.findingCount = audit.findings.length;
  base.findings = audit.findings;

  // The audit reviewed the field reports and found them already covered or
  // project-specific: considered = addressed, nothing to write.
  if (audit.findings.length === 0) {
    if (!ctx.dryRun) {
      await resolveSkillLearnings(ctx.home, skill);
    }
    return { ...base, outcome: "reviewed-clean" };
  }

  let improved: { content: string };
  try {
    improved = await improveExistingAsset({
      config: ctx.config,
      secrets: ctx.secrets,
      kind: "skills",
      name: skill,
      content: asset.content,
      summary: audit.summary,
      findings: audit.findings
    });
  } catch (error) {
    // Asset too large for a full rewrite: keep the findings as a reviewable
    // artifact and resolve the reports instead of dropping the learning.
    if (error instanceof AiProviderError && !ctx.dryRun) {
      const artifact = await writeFoldArtifact(ctx.home, {
        skill,
        outcome: "findings-only",
        auditSummary: audit.summary,
        findings: audit.findings,
        events: learnings,
        before: asset.content,
        after: "(not rewritten — asset exceeds the AI improve size limit)",
        provenance: asset.provenance
      });
      await resolveSkillLearnings(ctx.home, skill);
      return { ...base, outcome: "findings-only", artifactPath: artifact.filePath, error: error.message };
    }
    throw error;
  }
  base.currentContent = asset.content;
  base.proposedContent = improved.content;

  const upstream = isUpstreamOwnedSkill(asset.provenance);
  const canWriteSource = upstream && ctx.toSource && asset.provenance?.sourceType === "path";
  const outcome: FoldSkillOutcome = !upstream ? "applied" : canWriteSource ? "to-source" : "upstream-proposal";

  // Dry-run stops here: outcomes, findings and proposed content are reported,
  // but no skill, artifact or marker is touched.
  if (ctx.dryRun) {
    return { ...base, outcome };
  }

  const artifactInput = {
    skill,
    auditSummary: audit.summary,
    findings: audit.findings,
    events: learnings,
    before: asset.content,
    after: improved.content,
    provenance: asset.provenance
  };

  if (canWriteSource && asset.provenance) {
    try {
      const { filePath } = await writeSkillToPathSource(ctx.home, asset.provenance, skill, improved.content);
      const artifact = await writeFoldArtifact(ctx.home, { ...artifactInput, outcome, writtenTo: filePath });
      await resolveSkillLearnings(ctx.home, skill);
      return { ...base, outcome, artifactPath: artifact.filePath };
    } catch (error) {
      // Source dir vanished or rejected — fall back to a contribution artifact.
      const artifact = await writeFoldArtifact(ctx.home, { ...artifactInput, outcome: "upstream-proposal" });
      await resolveSkillLearnings(ctx.home, skill);
      return {
        ...base,
        outcome: "upstream-proposal",
        artifactPath: artifact.filePath,
        error: `Write-back to source failed: ${errorText(error)}`
      };
    }
  }

  if (upstream) {
    const artifact = await writeFoldArtifact(ctx.home, { ...artifactInput, outcome });
    await resolveSkillLearnings(ctx.home, skill);
    return { ...base, outcome, artifactPath: artifact.filePath };
  }

  const updated = await updateAsset(ctx.home, "skills", skill, improved.content);
  const artifact = await writeFoldArtifact(ctx.home, { ...artifactInput, outcome, writtenTo: updated.relativePath });
  await resolveSkillLearnings(ctx.home, skill);
  return { ...base, outcome, artifactPath: artifact.filePath };
}

/**
 * Fold open field reports into skills: audit each skill with its captured
 * learnings, rewrite it when the audit produces findings, then checkpoint the
 * reports. Upstream-locked skills get a contribution artifact under
 * memory/learnings/folds/ (or a write-back to their path source with toSource).
 * dryRun runs the same audit+improve pipeline but writes nothing — the result
 * doubles as the review payload for UI and CLI previews.
 */
export async function foldHubLearnings(
  chainHome: string | undefined,
  input: FoldLearningsInput
): Promise<FoldLearningsResult> {
  const home = resolveChainHome(chainHome);
  const ctx: FoldContext = {
    home,
    config: await readAiConfig(home),
    secrets: await readAiSecrets(home),
    dryRun: input.dryRun ?? false,
    toSource: input.toSource ?? false
  };
  const skillFilter = input.skill ? normalizeSkillName(input.skill) || input.skill.trim() : null;

  const report = await buildReflectionReport(home);
  const candidates = report.skills.filter((skill) => {
    const open = skill.openCorrectionCount + skill.openFailureCount + skill.openNoteCount;
    return open > 0 && (!skillFilter || skill.skill === skillFilter);
  });

  const results: FoldSkillResult[] = [];
  for (const candidate of candidates) {
    const learnings = await getSkillLearnings(home, candidate.skill, AUDIT_LEARNINGS_LIMIT);
    try {
      results.push(await foldOneSkill(ctx, candidate.skill, learnings));
    } catch (error) {
      results.push({ ...baseResult(candidate.skill, learnings), error: errorText(error) });
    }
  }

  return { dryRun: ctx.dryRun, results, foldsDir: foldsDir(home), foldedAt: new Date().toISOString() };
}
