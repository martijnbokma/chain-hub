import path from "node:path";
import { promises as fs } from "node:fs";

import { analysisReportSchema, type AnalysisReport } from "@chain-hub/contracts";

import { resolveChainHome } from "./core.js";
import { ensureDir, writeFileAtomic } from "./shared.js";

export function analysisFilePath(chainHome?: string): string {
  return path.join(resolveChainHome(chainHome), "system", "analysis.json");
}

/** Latest persisted analysis report; null when absent or unreadable. */
export async function readAnalysisReport(chainHome?: string): Promise<AnalysisReport | null> {
  try {
    const contents = await fs.readFile(analysisFilePath(chainHome), "utf8");
    return analysisReportSchema.parse(JSON.parse(contents));
  } catch {
    return null;
  }
}

export async function writeAnalysisReport(chainHome: string | undefined, report: AnalysisReport): Promise<void> {
  const target = analysisFilePath(chainHome);
  await ensureDir(path.dirname(target));
  await writeFileAtomic(target, JSON.stringify(report, null, 2));
}
