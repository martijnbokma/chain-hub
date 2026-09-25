import type {
  AiConfig,
  AiSecrets,
  AssetKind,
  AuditAssetFinding,
  AuditAssetResult,
  CaptureEvent,
  ClassifyAssetResult,
  DraftAssetInput,
  DraftAssetResult,
  ImproveAssetResult
} from "@chain-hub/contracts";

import { extractSuggestedNameFromContent, parseAudit, parseClassification, suggestNameFromIntent } from "./ai-parse.js";
import {
  AUDIT_EXISTING_SYSTEM,
  AUDIT_LEARNINGS_RULES,
  CLASSIFY_EXISTING_SYSTEM,
  CLASSIFY_SYSTEM,
  buildUserMessage,
  systemPromptForImprove,
  systemPromptForKind
} from "./ai-prompts.js";
import { AiProviderError, completeChat } from "./ai-transport.js";

export { AiProviderError };

/** Longest asset sent to a model. Classification only needs the start; audits say when they saw less. */
const MAX_ASSET_CHARS = 12_000;

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

  const content = await completeChat({
    config,
    secrets,
    system: systemPromptForKind(kind),
    userMessage: buildUserMessage({ intent: input.intent, kind, name: input.name })
  });

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

  const nextContent = improved.trim();
  if (!nextContent) {
    throw new AiProviderError("AI returned empty improved content", 502);
  }

  return { content: nextContent };
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
