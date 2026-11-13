import {
  parseFrontmatter,
  stringifyFrontmatter,
  type AiConfig,
  type AiSecrets,
  type AssetKind,
  type AuditAssetFinding,
  type AuditAssetResult,
  type CaptureEvent,
  type ClassifyAssetResult,
  type DraftAssetInput,
  type DraftAssetResult,
  type ImproveAssetResult,
  type SecurityScanFinding
} from "@chain-hub/contracts";

import {
  extractSuggestedNameFromContent,
  parseAudit,
  parseClassification,
  parseSecurityScan,
  suggestNameFromIntent
} from "./ai-parse.js";
import {
  AUDIT_EXISTING_SYSTEM,
  AUDIT_LEARNINGS_RULES,
  CLASSIFY_EXISTING_SYSTEM,
  CLASSIFY_SYSTEM,
  SECURITY_SCAN_SYSTEM,
  buildUserMessage,
  systemPromptForImprove,
  systemPromptForKind
} from "./ai-prompts.js";
import { AiProviderError, completeChat } from "./ai-transport.js";

export { AiProviderError };

/** Longest asset sent to a model. Classification only needs the start; audits say when they saw less. */
const MAX_ASSET_CHARS = 12_000;

/**
 * Models sometimes drop the leading `---` of a frontmatter block (the "no
 * fences around the file" rule gets read as "no --- fences"). Re-add the
 * fence when the remainder then parses as a YAML mapping.
 */
function restoreOpeningFence(content: string): string {
  if (content.trimStart().startsWith("---")) {
    return content;
  }
  const candidate = `---\n${content}`;
  return Object.keys(parseFrontmatter(candidate).data).length > 0
    ? candidate
    : content;
}

/**
 * Improved content must keep the asset's frontmatter — required fields like
 * `description` gate saving. Restore a dropped opening fence, or re-apply the
 * original block when the model removed it entirely.
 */
function preserveFrontmatter(before: string, after: string): string {
  const repaired = restoreOpeningFence(after);
  if (repaired.trimStart().startsWith("---")) {
    return repaired;
  }
  const original = parseFrontmatter(before);
  return Object.keys(original.data).length > 0
    ? stringifyFrontmatter(original.data, after)
    : after;
}

export async function generateAssetDraft(params: {
  config: AiConfig;
  secrets: AiSecrets;
  input: DraftAssetInput;
}): Promise<DraftAssetResult> {
  const { config, secrets, input } = params;
  const requestedKind = input.kind ?? "auto";

  let kind: AssetKind;
  let reason: string | undefined;
  let classifiedName: string | undefined;

  if (requestedKind === "auto") {
    const classificationRaw = await completeChat({
      config,
      secrets,
      system: CLASSIFY_SYSTEM,
      userMessage: `Intent: ${input.intent.trim()}`
    });
    const classified = parseClassification(classificationRaw);
    kind = classified.kind;
    reason = classified.reason;
    classifiedName = classified.suggestedName;
  } else {
    kind = requestedKind;
  }

  const content = restoreOpeningFence(
    await completeChat({
      config,
      secrets,
      system: systemPromptForKind(kind),
      userMessage: buildUserMessage({ intent: input.intent, kind, name: input.name })
    })
  );

  const suggestedName =
    classifiedName ||
    extractSuggestedNameFromContent(content) ||
    suggestNameFromIntent(input.intent) ||
    undefined;

  return {
    content,
    recommendedKind: kind,
    ...(reason ? { reason } : {}),
    ...(suggestedName ? { suggestedName } : {})
  };
}

export async function classifyExistingAsset(params: {
  config: AiConfig;
  secrets: AiSecrets;
  currentKind: AssetKind;
  name: string;
  content: string;
}): Promise<ClassifyAssetResult> {
  const { config, secrets, currentKind, name, content } = params;
  const truncated = content.trim().slice(0, MAX_ASSET_CHARS);
  const classificationRaw = await completeChat({
    config,
    secrets,
    system: CLASSIFY_EXISTING_SYSTEM,
    userMessage: [
      `Current kind: ${currentKind}`,
      `Name: ${name}`,
      "Content:",
      truncated
    ].join("\n")
  });
  const classified = parseClassification(classificationRaw);
  return {
    currentKind,
    recommendedKind: classified.kind,
    matchesCurrent: classified.kind === currentKind,
    reason: classified.reason,
    ...(classified.suggestedName ? { suggestedName: classified.suggestedName } : {})
  };
}


export async function auditExistingAsset(params: {
  config: AiConfig;
  secrets: AiSecrets;
  kind: AssetKind;
  name: string;
  content: string;
  /** Captured corrections, failures and notes for this asset; enables learning-sourced findings. */
  learnings?: CaptureEvent[];
}): Promise<AuditAssetResult> {
  const { config, secrets, kind, name, content, learnings = [] } = params;
  const fullLength = content.trim().length;
  const truncated = content.trim().slice(0, MAX_ASSET_CHARS);
  const hasLearnings = learnings.length > 0;
  const fieldReports = learnings.map(
    (event, index) => `${index + 1}. [${event.type}, ${event.capturedAt.slice(0, 10)}] ${event.summary}`
  );

  const auditRaw = await completeChat({
    config,
    secrets,
    system: hasLearnings ? AUDIT_EXISTING_SYSTEM + AUDIT_LEARNINGS_RULES : AUDIT_EXISTING_SYSTEM,
    userMessage: [
      `Kind: ${kind}`,
      `Name: ${name}`,
      ...(hasLearnings ? ["Field reports from real use:", ...fieldReports] : []),
      "Content:",
      truncated
    ].join("\n")
  });
  const result = parseAudit(auditRaw, { allowLearningSource: hasLearnings });
  if (fullLength > MAX_ASSET_CHARS) {
    // Never present a partial audit as a complete one.
    result.summary = `Audited the first ${MAX_ASSET_CHARS.toLocaleString("en-US")} of ${fullLength.toLocaleString("en-US")} characters. ${result.summary}`;
  }
  return result;
}

export async function improveExistingAsset(params: {
  config: AiConfig;
  secrets: AiSecrets;
  kind: AssetKind;
  name: string;
  content: string;
  summary?: string;
  findings: AuditAssetFinding[];
}): Promise<ImproveAssetResult> {
  const { config, secrets, kind, name, content, summary, findings } = params;
  const trimmed = content.trim();
  if (trimmed.length > MAX_ASSET_CHARS) {
    // A rewrite of a truncated asset would silently drop everything past the limit.
    throw new AiProviderError(
      `This asset is ${trimmed.length.toLocaleString("en-US")} characters; AI Improve handles up to ${MAX_ASSET_CHARS.toLocaleString("en-US")}. Split it into smaller assets or apply the findings by hand.`,
      400
    );
  }
  const findingsBlock = findings
    .map((finding, index) => {
      const origin = finding.source === "learning" ? " (from a field report)" : "";
      return `${index + 1}. [${finding.severity}]${origin} ${finding.title} — ${finding.detail}`;
    })
    .join("\n");

  const improved = await completeChat({
    config,
    secrets,
    system: systemPromptForImprove(kind),
    userMessage: [
      `Kind: ${kind}`,
      `Name: ${name}`,
      summary?.trim() ? `Audit summary: ${summary.trim()}` : null,
      "Findings to apply:",
      findingsBlock,
      "Current content:",
      trimmed
    ]
      .filter((line): line is string => Boolean(line))
      .join("\n")
  });

  const nextContent = preserveFrontmatter(trimmed, improved.trim());
  if (!nextContent) {
    throw new AiProviderError("AI returned empty improved content", 502);
  }

  return { content: nextContent };
}

/** Per-file cap for the security review payload; the model sees the start of each file. */
const MAX_SCAN_FILE_CHARS = 8_000;
/** Total payload cap across all files in one scan. */
const MAX_SCAN_TOTAL_CHARS = 60_000;

/**
 * AI layer of the security gate: reviews the installable file set for malicious
 * behavior and returns findings (engine "ai"). Used as the gate's extraScanner.
 */
export async function scanAssetForSecurity(params: {
  config: AiConfig;
  secrets: AiSecrets;
  kind: AssetKind;
  name: string;
  files: Array<{ path: string; content: string }>;
}): Promise<SecurityScanFinding[]> {
  const { config, secrets, kind, name, files } = params;

  let budget = MAX_SCAN_TOTAL_CHARS;
  const blocks: string[] = [];
  for (const file of files) {
    if (budget <= 0) {
      break;
    }
    const content = file.content.slice(0, Math.min(MAX_SCAN_FILE_CHARS, budget));
    if (!content.trim()) {
      continue;
    }
    budget -= content.length;
    blocks.push(`--- FILE: ${file.path} ---\n${content}`);
  }
  if (blocks.length === 0) {
    return [];
  }

  const raw = await completeChat({
    config,
    secrets,
    system: SECURITY_SCAN_SYSTEM,
    userMessage: [
      `Asset kind: ${kind}`,
      `Asset name: ${name}`,
      `Files (${files.length}):`,
      ...blocks
    ].join("\n")
  });
  return parseSecurityScan(raw).findings;
}

/** @deprecated Prefer generateAssetDraft */
export async function generatePromptDraft(params: {
  config: AiConfig;
  secrets: AiSecrets;
  input: DraftAssetInput;
}): Promise<DraftAssetResult> {
  return generateAssetDraft({
    ...params,
    input: { ...params.input, kind: params.input.kind ?? "prompts" }
  });
}
