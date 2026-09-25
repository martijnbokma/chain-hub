import { assetKindSchema, type AssetKind, type AuditAssetFinding, type AuditAssetResult } from "@chain-hub/contracts";

import { AiProviderError } from "./ai-transport.js";

// Turns raw model output into typed results and derives asset name suggestions.

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? trimmed).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new AiProviderError("AI returned unreadable JSON", 502);
  }
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as unknown;
  } catch {
    throw new AiProviderError("AI returned unreadable JSON", 502);
  }
}

export function parseClassification(raw: string): { kind: AssetKind; reason: string; suggestedName?: string } {
  const parsed = extractJsonObject(raw) as { kind?: unknown; reason?: unknown; suggestedName?: unknown };
  const kind = typeof parsed.kind === "string" ? parsed.kind.trim() : "";
  const parsedKind = assetKindSchema.safeParse(kind);
  if (!parsedKind.success) {
    throw new AiProviderError("AI recommended an unknown asset kind", 502);
  }
  const reason =
    typeof parsed.reason === "string" && parsed.reason.trim()
      ? parsed.reason.trim().slice(0, 200)
      : `Best fit as ${kind}`;
  const suggestedName =
    typeof parsed.suggestedName === "string" ? normalizeSuggestedName(parsed.suggestedName) : undefined;
  return { kind: parsedKind.data, reason, ...(suggestedName ? { suggestedName } : {}) };
}

function normalizeSuggestedName(raw: string): string | undefined {
  const slug = raw
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return slug.length > 0 ? slug : undefined;
}

export function extractSuggestedNameFromContent(content: string): string | undefined {
  const frontmatterName = content.match(/^---\s*\n[\s\S]*?\nname:\s*["']?([a-z0-9][a-z0-9-]*)["']?/i);
  if (frontmatterName?.[1]) {
    return normalizeSuggestedName(frontmatterName[1]);
  }

  const heading = content.match(/^#\s+(.+)$/m);
  if (heading?.[1]) {
    return normalizeSuggestedName(heading[1]);
  }

  return undefined;
}

export function suggestNameFromIntent(intent: string): string {
  const stopWords = new Set([
    "a",
    "an",
    "and",
    "for",
    "from",
    "in",
    "into",
    "of",
    "on",
    "or",
    "the",
    "to",
    "with",
    "that",
    "this",
    "want",
    "please",
    "write",
    "create",
    "make",
    "help",
    "me",
    "my",
    "een",
    "de",
    "het",
    "van",
    "voor",
    "met",
    "ik",
    "wil",
    "maak",
    "schrijf",
    "dat",
    "er",
    "wordt",
    "worden",
    "uitgevoerd",
    "uitvoeren",
    "als",
    "om",
    "te",
    "een",
    "kan",
    "kunnen",
    "moet",
    "moeten",
    "zou",
    "graag",
    "nieuwe",
    "nieuw",
    "asset",
    "skill",
    "prompt",
    "workflow",
    "agent",
    "rule"
  ]);

  const words = intent
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]+/g, " ")
    .split(/[\s-]+/)
    .filter((word) => word.length > 1 && !stopWords.has(word));

  const slug = words
    .slice(0, 6)
    .join("-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug.slice(0, 48).replace(/-+$/g, "");
}

const SEVERITIES = new Set(["high", "medium", "low"]);

export function parseAudit(raw: string, options: { allowLearningSource: boolean }): AuditAssetResult {
  const parsed = extractJsonObject(raw) as { summary?: unknown; findings?: unknown };
  const summary =
    typeof parsed.summary === "string" && parsed.summary.trim()
      ? parsed.summary.trim().slice(0, 400)
      : "Audit complete";

  if (!Array.isArray(parsed.findings)) {
    throw new AiProviderError("AI audit did not return findings", 502);
  }

  const findings: AuditAssetFinding[] = [];
  for (const item of parsed.findings.slice(0, 12)) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const row = item as { severity?: unknown; title?: unknown; detail?: unknown; source?: unknown };
    const severity = typeof row.severity === "string" ? row.severity.trim().toLowerCase() : "";
    const title = typeof row.title === "string" ? row.title.trim().slice(0, 120) : "";
    const detail = typeof row.detail === "string" ? row.detail.trim().slice(0, 500) : "";
    if (!SEVERITIES.has(severity) || !title || !detail) {
      continue;
    }
    const finding: AuditAssetFinding = {
      severity: severity as AuditAssetFinding["severity"],
      title,
      detail
    };
    if (options.allowLearningSource) {
      finding.source = row.source === "learning" ? "learning" : "best-practice";
    }
    findings.push(finding);
  }

  return { summary, findings };
}
