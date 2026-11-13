import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import {
  type AssetKind,
  type SecurityScanContext,
  type SecurityScanFinding,
  type SecurityScanReport,
  type SecurityScanSeverity,
  verdictForFindings
} from "@chain-hub/contracts";

import {
  ABBREVIATION_DOT_RE,
  CODE_EXTENSIONS,
  EXECUTABLE_EXTENSIONS,
  EXAMPLE_OR_DEFENSE_RE,
  type FileKind,
  MARKDOWN_EXTENSIONS,
  NEGATION_RE,
  NETWORK_RE,
  QUOTE_BEFORE_RE,
  RULES,
  type ScanRule,
  SENSITIVE_FILENAME_RE,
  SENSITIVE_RE,
  severityFor,
  SUPPRESSIBLE_RULES
} from "./security-rules.js";
import { createSkillCopyFilter } from "./skill-copy.js";

/**
 * Deterministic security scanner for assets entering the hub. Runs over exactly
 * the file set an install would copy (the skill-copy filter), so the scanned
 * surface always matches what lands on disk. Pattern rules produce findings;
 * a composite pass upgrades "sensitive data + outbound network in one file" to
 * a high-severity exfiltration risk. `verdictForFindings` maps severity to
 * pass / warn / fail — fail blocks the install unless the caller allows it.
 */

export interface SecurityScanFile {
  /** Skill-relative posix path (e.g. `scripts/setup.sh`), or the asset file name. */
  path: string;
  content: string;
}

/** Extra engine (the AI layer) — receives the same capped file set the static pass saw. */
export type SecurityExtraScanner = (target: {
  kind: AssetKind;
  name: string;
  files: SecurityScanFile[];
}) => Promise<SecurityScanFinding[]>;

const MAX_SCAN_FILE_BYTES = 512 * 1024;
const MAX_FINDINGS = 50;

/** Same-line text preceding `index`, cut at the last sentence boundary. */
function precedingClause(content: string, index: number): string {
  const lineStart = content.lastIndexOf("\n", index - 1) + 1;
  const prefix = content.slice(lineStart, index).replace(ABBREVIATION_DOT_RE, "   ");
  const boundary = Math.max(
    prefix.lastIndexOf("."),
    prefix.lastIndexOf(";"),
    prefix.lastIndexOf("!"),
    prefix.lastIndexOf("?"),
    prefix.lastIndexOf(":")
  );
  return prefix.slice(boundary + 1);
}

/** A quoted attack cited as an example or flagged as untrusted — documentation, not a payload. */
function isQuotedExample(content: string, index: number): boolean {
  const lineStart = content.lastIndexOf("\n", index - 1) + 1;
  const prefix = content.slice(lineStart, index);
  return QUOTE_BEFORE_RE.test(prefix) && EXAMPLE_OR_DEFENSE_RE.test(prefix);
}

/** "don't silently delete" forbids the action the pattern reads as covert. */
function isNegatedAction(content: string, index: number): boolean {
  return NEGATION_RE.test(precedingClause(content, index));
}

function isSuppressedMatch(rule: ScanRule, file: SecurityScanFile, matchIndex: number): boolean {
  if (!SUPPRESSIBLE_RULES.has(rule.id)) return false;
  return isQuotedExample(file.content, matchIndex) || isNegatedAction(file.content, matchIndex);
}

function fileKindOf(filePath: string, content: string): FileKind {
  const ext = path.extname(filePath).toLowerCase();
  if (MARKDOWN_EXTENSIONS.has(ext)) return "markdown";
  if (CODE_EXTENSIONS.has(ext)) return "code";
  if (content.startsWith("#!")) return "code";
  return "text";
}

function lineOf(content: string, index: number): number {
  return content.slice(0, index).split("\n").length;
}

function applyRules(file: SecurityScanFile): SecurityScanFinding[] {
  const findings: SecurityScanFinding[] = [];
  const kind = fileKindOf(file.path, file.content);

  for (const rule of RULES) {
    if (rule.kinds && !rule.kinds.includes(kind)) {
      continue;
    }
    for (const pattern of rule.patterns) {
      // Iterate all matches so a suppressed first match doesn't hide a real
      // payload later in the file.
      const global = pattern.global ? pattern : new RegExp(pattern.source, `${pattern.flags}g`);
      let match: RegExpExecArray | null;
      while ((match = global.exec(file.content)) !== null) {
        if (match[0].length === 0) {
          global.lastIndex++;
          continue;
        }
        if (isSuppressedMatch(rule, file, match.index)) {
          continue;
        }
        findings.push({
          ruleId: rule.id,
          severity: severityFor(rule, file, kind, match.index),
          engine: "static",
          title: rule.title,
          detail: rule.detail,
          file: file.path,
          line: lineOf(file.content, match.index)
        });
        break; // one finding per rule per file
      }
    }
  }

  return findings;
}

/** Sensitive access + outbound network in the same file is an exfiltration shape, not two coincidences. */
function compositeFindings(file: SecurityScanFile): SecurityScanFinding[] {
  if (!SENSITIVE_RE.test(file.content) || !NETWORK_RE.test(file.content)) {
    return [];
  }

  const alreadyHigh = file.content.match(
    /\b(?:curl|wget|nc|ncat|socat|scp|sftp|rsync)\b[^\n]{0,200}(?:\.ssh|id_rsa|(?<!process)\.env|secrets?|credentials?|cookies?|wallet)/i
  );
  if (alreadyHigh) {
    return []; // secret-file-exfil already reports this exact shape
  }

  const sensitiveAt = SENSITIVE_RE.exec(file.content)?.index;
  return [
    {
      ruleId: "credential-exfil-risk",
      severity: fileKindOf(file.path, file.content) === "code" ? "high" : "medium",
      engine: "static",
      title: "Combines sensitive-data access with outbound network calls",
      detail:
        "The file touches credential/secret locations and performs network requests in the same file — a common data-theft shape.",
      file: file.path,
      ...(sensitiveAt !== undefined ? { line: lineOf(file.content, sensitiveAt) } : {})
    }
  ];
}

/**
 * File-level (non-content) checks that don't need text: shipped executables
 * and credential-looking filenames.
 */
function filenameFindings(filePath: string): SecurityScanFinding[] {
  const findings: SecurityScanFinding[] = [];
  const ext = path.extname(filePath).toLowerCase();

  if (EXECUTABLE_EXTENSIONS.has(ext)) {
    findings.push({
      ruleId: "binary-payload",
      severity: "medium",
      engine: "static",
      title: "Ships a binary or executable file",
      detail: "Executable payloads can't be reviewed as text — verify this file belongs in the asset.",
      file: filePath
    });
  }

  if (SENSITIVE_FILENAME_RE.test(filePath)) {
    findings.push({
      ruleId: "bundled-secrets",
      severity: "medium",
      engine: "static",
      title: "Ships a file that looks like credentials",
      detail: "The filename matches a secrets/credentials pattern — check it isn't real secret material.",
      file: filePath
    });
  }

  return findings;
}

/** True when the bytes look like a program (ELF, PE/MZ, Mach-O) rather than a document. */
function looksLikeExecutable(head: Buffer): boolean {
  if (head.length < 4) return false;
  if (head[0] === 0x7f && head[1] === 0x45 && head[2] === 0x4c && head[3] === 0x46) return true; // ELF
  if (head[0] === 0x4d && head[1] === 0x5a) return true; // MZ / PE
  const magic = head.readUInt32BE(0);
  return [0xfeedface, 0xfeedfacf, 0xcefaedfe, 0xcffaedfe, 0xcafebabe].includes(magic); // Mach-O / fat / Java class
}

function isBinaryBuffer(head: Buffer): boolean {
  return head.includes(0);
}

/**
 * Runs the static rules over the given files and builds a report. `files` are the
 * installable set — for skills, exactly what `copySkillTree` would copy. Pass
 * `contentHash` with the caller's canonical hash so the record matches lock entries.
 */
export function scanAssetFiles(
  files: SecurityScanFile[],
  context: SecurityScanContext,
  contentHash?: string
): SecurityScanReport {
  const findings: SecurityScanFinding[] = [];

  for (const file of files) {
    findings.push(...filenameFindings(file.path), ...applyRules(file), ...compositeFindings(file));
  }

  const severityRank: Record<SecurityScanSeverity, number> = { high: 0, medium: 1, low: 2 };
  findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || a.ruleId.localeCompare(b.ruleId));
  const capped = findings.slice(0, MAX_FINDINGS);

  return {
    verdict: verdictForFindings(capped, context),
    findings: capped,
    contentHash: contentHash ?? hashScanFiles(files),
    scannedAt: new Date().toISOString(),
    context,
    engines: ["static"]
  };
}

function hashScanFiles(files: SecurityScanFile[]): string {
  // sha1 matches the lock entry's contentHash algorithm for tree scans.
  const hash = createHash("sha1");
  for (const file of files) {
    hash.update(file.path);
    hash.update("\0");
    hash.update(file.content);
    hash.update("\0");
  }
  return hash.digest("hex");
}

/** Reads every file the skill-copy filter would install, capped per file for scanning. */
export async function collectSkillScanFiles(rootDir: string): Promise<SecurityScanFile[]> {
  const filter = await createSkillCopyFilter(rootDir);
  const files: SecurityScanFile[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = (await fs.readdir(dir)).sort();
    for (const name of entries) {
      const entryPath = path.join(dir, name);
      if (!(await filter(entryPath))) {
        continue;
      }
      const stats = await fs.stat(entryPath);
      if (stats.isDirectory()) {
        await walk(entryPath);
      } else if (stats.isFile()) {
        const relative = path.relative(rootDir, entryPath).split(path.sep).join("/");
        const buffer = await fs.readFile(entryPath);
        if (isBinaryBuffer(buffer.subarray(0, 8192))) {
          // Binaries aren't regex-scannable; flag real executables by magic or extension.
          if (looksLikeExecutable(buffer.subarray(0, 4)) || EXECUTABLE_EXTENSIONS.has(path.extname(name).toLowerCase())) {
            files.push({ path: relative, content: "" });
          }
          continue;
        }
        files.push({ path: relative, content: buffer.subarray(0, MAX_SCAN_FILE_BYTES).toString("utf8") });
      }
    }
  }

  await walk(rootDir);
  return files;
}

/** Scans a skill directory tree (staging or installed) with the static engine. */
export async function scanSkillTree(
  rootDir: string,
  context: SecurityScanContext,
  contentHash?: string
): Promise<SecurityScanReport> {
  return scanAssetFiles(await collectSkillScanFiles(rootDir), context, contentHash);
}

/** Merges an extra engine's findings into a static report. */
export function mergeScanFindings(report: SecurityScanReport, extra: SecurityScanFinding[], engine: "ai"): SecurityScanReport {
  const findings = [...report.findings, ...extra]
    .sort((a, b) => {
      const rank: Record<SecurityScanSeverity, number> = { high: 0, medium: 1, low: 2 };
      return rank[a.severity] - rank[b.severity] || a.ruleId.localeCompare(b.ruleId);
    })
    .slice(0, MAX_FINDINGS);

  return {
    ...report,
    findings,
    verdict: verdictForFindings(findings, report.context),
    engines: [...report.engines, engine]
  };
}
