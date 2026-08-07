import { assetKinds, type AiConfig, type AiProvider, type AiSecrets, type AssetKind, type DraftAssetInput, type DraftAssetResult } from "@chain-hub/contracts";

const SHARED_DRAFT_RULES = `Shared requirements:
- Always write the drafted asset content in English, even if the user's intent is in another language
- Concise, actionable language — no fluff or meta commentary
- Return ONLY the asset file content (markdown allowed). Do not wrap the entire response in code fences
- Do not apologize or explain what you wrote`;

const CLASSIFY_SYSTEM = `You classify user intent into the best Chain Hub asset kind.

Kinds and when to choose them:
- skills: reusable agent procedures with clear when-to-use triggers (SKILL.md style); multi-step how-to an agent follows
- agents: persistent personas / system prompts that define who the agent is across tasks
- workflows: ordered checklists or multi-step processes a human or agent runs end-to-end
- rules: standing constraints/conventions that should always (or often) apply in a project/editor
- prompts: one-shot reusable prompt text for a specific task, not a long-lived procedure or persona

Prefer the most specific fit. If intent is a single reusable instruction for one task → prompts.
If it is a reusable capability agents should discover and follow → skills.
If it is identity/tone/role → agents.
If it is a sequenced process → workflows.
If it is a durable do/don't convention → rules.

Respond with ONLY a JSON object (no markdown fences, no extra text):
{"kind":"skills|agents|workflows|rules|prompts","reason":"one short English sentence"}`;

const ASSET_DRAFT_SYSTEM: Record<AssetKind, string> = {
  prompts: `You are an expert prompt engineer. The user will describe what a reusable prompt asset should accomplish.
Write a single, high-quality prompt they can save and reuse.

Requirements:
- Clear role / persona when helpful
- Explicit goals, constraints, and success criteria
- Desired output format
- Do not include a title heading unless it strengthens the prompt
${SHARED_DRAFT_RULES}`,

  skills: `You are an expert at writing Agent Skills (SKILL.md files) for AI coding agents.
The user will describe what the skill should do. Draft a complete SKILL.md.

Requirements:
- Start with YAML frontmatter between --- fences including:
  - name: kebab-case slug matching the suggested asset name when provided
  - description: one or two sentences that say what the skill does AND when to use it (trigger phrases welcome)
- Body: clear markdown with purpose, when to use, workflow/steps, and constraints
- Keep it practical for an AI agent to follow
${SHARED_DRAFT_RULES}`,

  agents: `You are an expert at writing AI agent persona files.
The user will describe the agent they want. Draft a complete agent markdown file.

Requirements:
- Optional YAML frontmatter (name, description) when helpful
- Body = the agent system prompt / persona: role, tone, capabilities, boundaries, and how it should respond
- Make it reusable across coding tools
${SHARED_DRAFT_RULES}`,

  workflows: `You are an expert at writing reusable AI workflows as markdown.
The user will describe a workflow. Draft a complete workflow document.

Requirements:
- Clear title and goal
- Numbered or ordered steps an agent/user can follow
- Inputs, outputs, and decision points when relevant
- Keep steps concrete and checkable
${SHARED_DRAFT_RULES}`,

  rules: `You are an expert at writing project/editor rules for AI coding agents.
The user will describe the rule they want. Draft a complete rule markdown file.

Requirements:
- Optional frontmatter when useful (e.g. description, globs, alwaysApply)
- Body: clear, enforceable guidance — do/don't, conventions, examples
- Prefer precise constraints over vague advice
${SHARED_DRAFT_RULES}`
};

export class AiProviderError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AiProviderError";
    this.status = status;
  }
}

function extractProviderErrorMessage(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as {
      error?: { message?: string; type?: string; code?: string } | string;
      message?: string;
    };

    if (typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error.trim();
    }
    if (parsed.error && typeof parsed.error === "object") {
      const nested = parsed.error.message?.trim();
      if (nested) {
        return nested;
      }
    }
    if (typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message.trim();
    }
  } catch {
    // Not JSON — fall through to plain text.
  }

  const plain = trimmed.replace(/\s+/g, " ");
  return plain.length > 0 ? plain.slice(0, 180) : null;
}

function formatProviderHttpError(providerLabel: string, status: number, rawBody: string): string {
  const extracted = extractProviderErrorMessage(rawBody);
  const lower = (extracted ?? "").toLowerCase();

  if (
    lower.includes("credit balance") ||
    lower.includes("insufficient") ||
    lower.includes("billing") ||
    lower.includes("payment") ||
    lower.includes("quota")
  ) {
    return `${providerLabel} can't run this request — your account needs more credits or an active plan. Check billing in your ${providerLabel} console.`;
  }

  if (
    status === 401 ||
    status === 403 ||
    lower.includes("invalid api key") ||
    lower.includes("incorrect api key") ||
    lower.includes("authentication") ||
    lower.includes("unauthorized")
  ) {
    return `${providerLabel} rejected the API key. Update it under Settings → AI.`;
  }

  if (status === 429 || lower.includes("rate limit") || lower.includes("too many requests")) {
    return `${providerLabel} rate limit hit. Wait a moment and try again.`;
  }

  if (
    status === 404 ||
    (lower.includes("model") &&
      (lower.includes("not found") || lower.includes("does not exist") || lower.includes("invalid")))
  ) {
    return `${providerLabel} doesn't recognize that model. Pick another model under Settings → AI.`;
  }

  if (extracted) {
    if (!extracted.startsWith("{") && extracted.length <= 160) {
      return `${providerLabel}: ${extracted}`;
    }
  }

  if (status >= 500) {
    return `${providerLabel} is temporarily unavailable. Try again in a moment.`;
  }

  return `${providerLabel} request failed. Check Settings → AI and try again.`;
}

function systemPromptForKind(kind: AssetKind): string {
  return ASSET_DRAFT_SYSTEM[kind];
}

function buildUserMessage(input: { intent: string; kind: AssetKind; name?: string }): string {
  const parts = [`Asset kind: ${input.kind}`, `Intent: ${input.intent.trim()}`];
  if (input.name?.trim()) {
    parts.push(`Suggested asset name: ${input.name.trim()}`);
  }
  return parts.join("\n");
}

function isAssetKind(value: string): value is AssetKind {
  return (assetKinds as readonly string[]).includes(value);
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? trimmed).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new AiProviderError("AI returned an unreadable kind classification", 502);
  }
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as unknown;
  } catch {
    throw new AiProviderError("AI returned an unreadable kind classification", 502);
  }
}

function parseClassification(raw: string): { kind: AssetKind; reason: string } {
  const parsed = extractJsonObject(raw) as { kind?: unknown; reason?: unknown };
  const kind = typeof parsed.kind === "string" ? parsed.kind.trim() : "";
  if (!isAssetKind(kind)) {
    throw new AiProviderError("AI recommended an unknown asset kind", 502);
  }
  const reason =
    typeof parsed.reason === "string" && parsed.reason.trim()
      ? parsed.reason.trim().slice(0, 200)
      : `Best fit as ${kind}`;
  return { kind, reason };
}

function suggestNameFromIntent(intent: string): string {
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
    "schrijf"
  ]);

  const words = intent
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]+/g, " ")
    .split(/[\s-]+/)
    .filter((word) => word.length > 0 && !stopWords.has(word));

  const slug = (words.length > 0 ? words : intent.trim().toLowerCase().split(/\s+/))
    .slice(0, 6)
    .join("-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug.slice(0, 48).replace(/-+$/g, "");
}

async function callAnthropic(params: {
  apiKey: string;
  model: string;
  system: string;
  userMessage: string;
}): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": params.apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: 4096,
      system: params.system,
      messages: [{ role: "user", content: params.userMessage }]
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new AiProviderError(formatProviderHttpError("Anthropic", response.status, detail), 502);
  }

  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = data.content?.find((block) => block.type === "text")?.text?.trim();
  if (!text) {
    throw new AiProviderError("Anthropic returned an empty response", 502);
  }
  return text;
}

async function callOpenAiCompatible(params: {
  providerLabel: string;
  endpoint: string;
  apiKey: string;
  model: string;
  system: string;
  userMessage: string;
}): Promise<string> {
  const response = await fetch(params.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.userMessage }
      ]
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new AiProviderError(
      formatProviderHttpError(params.providerLabel, response.status, detail),
      502
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new AiProviderError(`${params.providerLabel} returned an empty response`, 502);
  }
  return text;
}

async function callOllama(params: {
  baseUrl: string;
  model: string;
  system: string;
  userMessage: string;
}): Promise<string> {
  const baseUrl = params.baseUrl.replace(/\/$/, "");
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: params.model,
        stream: false,
        messages: [
          { role: "system", content: params.system },
          { role: "user", content: params.userMessage }
        ]
      })
    });
  } catch {
    throw new AiProviderError(
      `Ollama is unreachable at ${baseUrl}. Start Ollama locally, or update the base URL under Settings → AI.`,
      502
    );
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new AiProviderError(formatProviderHttpError("Ollama", response.status, detail), 502);
  }

  const data = (await response.json()) as {
    message?: { content?: string };
  };
  const text = data.message?.content?.trim();
  if (!text) {
    throw new AiProviderError("Ollama returned an empty response", 502);
  }
  return text;
}

async function completeChat(params: {
  config: AiConfig;
  secrets: AiSecrets;
  system: string;
  userMessage: string;
}): Promise<string> {
  const provider: AiProvider = params.config.provider;

  switch (provider) {
    case "anthropic": {
      const apiKey = params.secrets.anthropicApiKey?.trim();
      if (!apiKey) {
        throw new AiProviderError(
          "Anthropic API key is not configured. Add it under Settings → AI.",
          400
        );
      }
      return callAnthropic({
        apiKey,
        model: params.config.models.anthropic,
        system: params.system,
        userMessage: params.userMessage
      });
    }
    case "openai": {
      const apiKey = params.secrets.openaiApiKey?.trim();
      if (!apiKey) {
        throw new AiProviderError("OpenAI API key is not configured. Add it under Settings → AI.", 400);
      }
      return callOpenAiCompatible({
        providerLabel: "OpenAI",
        endpoint: "https://api.openai.com/v1/chat/completions",
        apiKey,
        model: params.config.models.openai,
        system: params.system,
        userMessage: params.userMessage
      });
    }
    case "mistral": {
      const apiKey = params.secrets.mistralApiKey?.trim();
      if (!apiKey) {
        throw new AiProviderError("Mistral API key is not configured. Add it under Settings → AI.", 400);
      }
      return callOpenAiCompatible({
        providerLabel: "Mistral",
        endpoint: "https://api.mistral.ai/v1/chat/completions",
        apiKey,
        model: params.config.models.mistral,
        system: params.system,
        userMessage: params.userMessage
      });
    }
    case "ollama": {
      return callOllama({
        baseUrl: params.config.ollamaBaseUrl,
        model: params.config.models.ollama,
        system: params.system,
        userMessage: params.userMessage
      });
    }
    default: {
      const _exhaustive: never = provider;
      throw new AiProviderError(`Unsupported AI provider: ${String(_exhaustive)}`, 400);
    }
  }
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
  } else {
    kind = requestedKind;
  }

  const content = await completeChat({
    config,
    secrets,
    system: systemPromptForKind(kind),
    userMessage: buildUserMessage({ intent: input.intent, kind, name: input.name })
  });

  const suggestedName = input.name?.trim() ? undefined : suggestNameFromIntent(input.intent) || undefined;

  return {
    content,
    recommendedKind: kind,
    ...(reason ? { reason } : {}),
    ...(suggestedName ? { suggestedName } : {})
  };
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
