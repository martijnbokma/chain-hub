import { createHash } from "node:crypto";

import {
  type AnalysisItem,
  type AnalysisItemType,
  type AnalysisReport,
  InvalidInputError,
  NotFoundError,
  type SaveAnalysisInput,
  type UpdateAnalysisItemInput
} from "@chain-hub/contracts";
import { getAsset, readAnalysisReport, writeAnalysisReport } from "@chain-hub/storage";

function analysisItemId(kind: string, name: string, type: AnalysisItemType): string {
  return `${kind}/${name}/${type}`;
}

export async function getHubAnalysisReport(chainHome?: string): Promise<AnalysisReport | null> {
  return readAnalysisReport(chainHome);
}

/**
 * Turns a finished client-side run into persisted worklist items and merges
 * with the previous report: items dismissed for identical content stay
 * dismissed; everything else (re)opens.
 */
export async function saveHubAnalysisReport(
  chainHome: string | undefined,
  input: SaveAnalysisInput
): Promise<AnalysisReport> {
  const previous = await readAnalysisReport(chainHome);
  const dismissedById = new Map(
    (previous?.items ?? [])
      .filter((item) => item.status === "dismissed")
      .map((item) => [item.id, item.contentHash])
  );

  const items: AnalysisItem[] = [];
  for (const entry of input.entries) {
    const detail = await getAsset(chainHome, entry.kind, entry.name).catch(() => null);
    const contentHash = detail ? createHash("sha256").update(detail.content).digest("hex") : "";

    const status = (id: string): AnalysisItem["status"] =>
      dismissedById.get(id) === contentHash ? "dismissed" : "open";

    const push = (type: AnalysisItemType, fields: Partial<AnalysisItem>) => {
      const id = analysisItemId(entry.kind, entry.name, type);
      items.push({ id, kind: entry.kind, name: entry.name, type, status: status(id), contentHash, ...fields });
    };

    if (entry.classification && !entry.classification.matchesCurrent) {
      push("kind-mismatch", {
        recommendedKind: entry.classification.recommendedKind,
        reason: entry.classification.reason
      });
    }
    if (entry.audit && entry.audit.findings.length > 0) {
      push("audit-findings", { summary: entry.audit.summary, findings: entry.audit.findings });
    }
    if ((entry.compatIssues?.length ?? 0) > 0) {
      push("compat-issue", { compatIssues: entry.compatIssues });
    }
    const checkError = [entry.classifyError, entry.auditError].filter(Boolean).join(" · ");
    if (checkError) {
      push("check-failed", { error: checkError });
    }
  }

  const report: AnalysisReport = {
    version: 1,
    runAt: new Date().toISOString(),
    totalAssets: input.totalAssets,
    items
  };
  await writeAnalysisReport(chainHome, report);
  return report;
}

export async function updateHubAnalysisItemStatus(
  chainHome: string | undefined,
  input: UpdateAnalysisItemInput
): Promise<AnalysisReport> {
  const report = await readAnalysisReport(chainHome);
  if (!report) {
    throw new InvalidInputError("No analysis report exists yet");
  }
  const item = report.items.find((candidate) => candidate.id === input.id);
  if (!item) {
    throw new NotFoundError(`Analysis item not found: ${input.id}`);
  }
  item.status = input.status;
  await writeAnalysisReport(chainHome, report);
  return report;
}
