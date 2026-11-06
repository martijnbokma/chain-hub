import {
  type AssetKind,
  InvalidInputError,
  type SecurityScanContext,
  SecurityScanError,
  type SecurityScanRecord,
  type SecurityScanReport
} from "@chain-hub/contracts";

import {
  collectSkillScanFiles,
  mergeScanFindings,
  scanAssetFiles,
  type SecurityExtraScanner,
  type SecurityScanFile
} from "./security-scan.js";
import { recordSecurityScan } from "./security-store.js";

/**
 * The single gate every external-content write path goes through: scan, persist
 * the record, and either allow, allow-with-warning, or block. Blocking happens
 * before the caller writes anything to the hub — a `fail` means nothing lands
 * on disk. `allowUnsafe` is the explicit allow-anyway override and is recorded
 * on the scan record.
 */
/** Options install paths forward to the gate — provenance context plus an optional extra engine. */
export interface SkillInstallSecurity {
  context?: SecurityScanContext;
  extraScanner?: SecurityExtraScanner;
}

export interface SecurityGateOptions {
  kind: AssetKind;
  name: string;
  context: SecurityScanContext;
  /** Single-file assets: the file set to scan. */
  files?: SecurityScanFile[];
  /** Skill folders: scanned via the skill-copy filter (exactly what an install copies). */
  rootDir?: string;
  /** Canonical content hash (matches the lock entry for skills). */
  contentHash?: string;
  /** Explicit allow-anyway override for a `fail` verdict; recorded on the scan record. */
  allowUnsafe?: boolean;
  /**
   * When false, the record is written but `fail` never throws — used for rescans
   * and for unchanged updates where the content is already installed.
   */
  enforce?: boolean;
  /** Extra engine (the AI layer in domain) merged into the static report. */
  extraScanner?: SecurityExtraScanner;
}

export async function runSecurityGate(
  chainHome: string,
  options: SecurityGateOptions
): Promise<SecurityScanRecord> {
  const files = options.files ?? (options.rootDir ? await collectSkillScanFiles(options.rootDir) : null);
  if (!files) {
    throw new InvalidInputError("Security gate needs files or a rootDir to scan");
  }

  let report: SecurityScanReport = scanAssetFiles(files, options.context, options.contentHash);
  let aiError: string | null = null;

  if (options.extraScanner) {
    try {
      const extra = await options.extraScanner({ kind: options.kind, name: options.name, files });
      if (extra.length > 0) {
        report = mergeScanFindings(report, extra, "ai");
      } else {
        report = { ...report, engines: [...report.engines, "ai"] };
      }
    } catch (error) {
      // AI layer is best-effort: the static verdict still stands. The failure is
      // recorded on the scan record so the UI can show the scan was partial.
      aiError = error instanceof Error ? error.message : String(error);
    }
  }

  const record: SecurityScanRecord = {
    ...report,
    ...(aiError ? { aiError } : {}),
    ...(report.verdict === "fail" && options.allowUnsafe ? { overriddenAt: new Date().toISOString() } : {})
  };

  await recordSecurityScan(chainHome, options.kind, options.name, record);

  if (report.verdict === "fail" && options.enforce !== false && !options.allowUnsafe) {
    throw new SecurityScanError(report);
  }

  return record;
}
