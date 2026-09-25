import type { AiConfig, AiProvider, AiSecrets } from "@chain-hub/contracts";

// HTTP transport for Hub AI providers: one request/response shape per API family,
// with provider failures mapped to plain, user-facing AiProviderError messages.

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

const AI_REQUEST_TIMEOUT_MS = 60_000;
/** Room for a full rewrite of a MAX_ASSET_CHARS asset without being cut off. */
const ANTHROPIC_MAX_TOKENS = 16_000;
const CUT_OFF_MESSAGE =
  "The AI response was cut off before it finished. Try a shorter asset or a model with a larger output limit.";
// Local models on CPU can take minutes to rewrite a whole asset.
const OLLAMA_REQUEST_TIMEOUT_MS = 300_000;

interface ChatRequest {
  system: string;
  userMessage: string;
}

/** POSTs JSON and returns the parsed body; network, timeout and HTTP failures become AiProviderError. */
async function postJson(params: {
  providerLabel: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
  timeoutMs: number;
  timeoutMessage: string;
  unreachableMessage: string;
}): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(params.url, {
      method: "POST",
      signal: AbortSignal.timeout(params.timeoutMs),
      headers: { "Content-Type": "application/json", ...params.headers },
      body: JSON.stringify(params.body)
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new AiProviderError(params.timeoutMessage, 504);
    }
    throw new AiProviderError(params.unreachableMessage, 502);
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new AiProviderError(formatProviderHttpError(params.providerLabel, response.status, detail), 502);
  }

  return response.json() as Promise<unknown>;
}

function cloudRequestMessages(providerLabel: string): { timeoutMessage: string; unreachableMessage: string } {
  return {
    timeoutMessage: `${providerLabel} request timed out after 60 seconds`,
    unreachableMessage: `Could not reach ${providerLabel}. Check your internet connection and try again.`
  };
}

function requireText(text: string | null | undefined, providerLabel: string): string {
  const trimmed = text?.trim();
  if (!trimmed) {
    throw new AiProviderError(`${providerLabel} returned an empty response`, 502);
  }
  return trimmed;
}

async function callAnthropic(params: ChatRequest & { apiKey: string; model: string }): Promise<string> {
  const data = (await postJson({
    providerLabel: "Anthropic",
    url: "https://api.anthropic.com/v1/messages",
    headers: { "x-api-key": params.apiKey, "anthropic-version": "2023-06-01" },
    body: {
      model: params.model,
      max_tokens: ANTHROPIC_MAX_TOKENS,
      system: params.system,
      messages: [{ role: "user", content: params.userMessage }]
    },
    timeoutMs: AI_REQUEST_TIMEOUT_MS,
    ...cloudRequestMessages("Anthropic")
  })) as {
    content?: Array<{ type?: string; text?: string }>;
    stop_reason?: string;
  };

  if (data.stop_reason === "max_tokens") {
    throw new AiProviderError(CUT_OFF_MESSAGE, 502);
  }
  if (data.stop_reason === "refusal") {
    throw new AiProviderError("Anthropic declined this request. Rephrase it or try another model.", 400);
  }
  return requireText(data.content?.find((block) => block.type === "text")?.text, "Anthropic");
}

async function callOpenAiCompatible(
  params: ChatRequest & {
    providerLabel: string;
    endpoint: string;
    apiKey: string;
    model: string;
    extraHeaders?: Record<string, string>;
  }
): Promise<string> {
  const data = (await postJson({
    providerLabel: params.providerLabel,
    url: params.endpoint,
    headers: { Authorization: `Bearer ${params.apiKey}`, ...(params.extraHeaders ?? {}) },
    body: {
      model: params.model,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.userMessage }
      ]
    },
    timeoutMs: AI_REQUEST_TIMEOUT_MS,
    ...cloudRequestMessages(params.providerLabel)
  })) as {
    choices?: Array<{ message?: { content?: string | null }; finish_reason?: string | null }>;
  };

  if (data.choices?.[0]?.finish_reason === "length") {
    throw new AiProviderError(CUT_OFF_MESSAGE, 502);
  }
  return requireText(data.choices?.[0]?.message?.content, params.providerLabel);
}

async function callOllama(params: ChatRequest & { baseUrl: string; model: string }): Promise<string> {
  const baseUrl = params.baseUrl.replace(/\/$/, "");
  const data = (await postJson({
    providerLabel: "Ollama",
    url: `${baseUrl}/api/chat`,
    headers: {},
    body: {
      model: params.model,
      stream: false,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.userMessage }
      ]
    },
    timeoutMs: OLLAMA_REQUEST_TIMEOUT_MS,
    timeoutMessage: "Ollama request timed out after 5 minutes",
    unreachableMessage: `Ollama is unreachable at ${baseUrl}. Start Ollama locally, or update the base URL under Settings → AI.`
  })) as {
    message?: { content?: string };
    done_reason?: string;
  };

  if (data.done_reason === "length") {
    throw new AiProviderError(CUT_OFF_MESSAGE, 502);
  }
  return requireText(data.message?.content, "Ollama");
}

type CloudProvider = Exclude<AiProvider, "ollama">;

const PROVIDER_LABELS: Record<CloudProvider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  mistral: "Mistral",
  gemini: "Google Gemini",
  groq: "Groq",
  openrouter: "OpenRouter",
  deepseek: "DeepSeek",
  cerebras: "Cerebras"
};

/** Providers that speak the OpenAI chat-completions format. */
const OPENAI_COMPATIBLE: Record<Exclude<CloudProvider, "anthropic">, { endpoint: string; extraHeaders?: Record<string, string> }> = {
  openai: { endpoint: "https://api.openai.com/v1/chat/completions" },
  mistral: { endpoint: "https://api.mistral.ai/v1/chat/completions" },
  gemini: { endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" },
  groq: { endpoint: "https://api.groq.com/openai/v1/chat/completions" },
  openrouter: {
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    extraHeaders: { "HTTP-Referer": "https://chain-hub.dev", "X-Title": "Chain Hub" }
  },
  deepseek: { endpoint: "https://api.deepseek.com/chat/completions" },
  cerebras: { endpoint: "https://api.cerebras.ai/v1/chat/completions" }
};

/** Sends one system + user turn to the configured provider and returns the reply text. */
export async function completeChat(params: {
  config: AiConfig;
  secrets: AiSecrets;
  system: string;
  userMessage: string;
}): Promise<string> {
  const provider: AiProvider = params.config.provider;
  const request = { system: params.system, userMessage: params.userMessage };

  if (provider === "ollama") {
    return callOllama({ baseUrl: params.config.ollamaBaseUrl, model: params.config.models.ollama, ...request });
  }

  const label = PROVIDER_LABELS[provider];
  const apiKey = params.secrets[`${provider}ApiKey`]?.trim();
  if (!apiKey) {
    throw new AiProviderError(`${label} API key is not configured. Add it under Settings → AI.`, 400);
  }

  const model = params.config.models[provider];
  if (provider === "anthropic") {
    return callAnthropic({ apiKey, model, ...request });
  }

  const { endpoint, extraHeaders } = OPENAI_COMPATIBLE[provider];
  return callOpenAiCompatible({ providerLabel: label, endpoint, apiKey, model, extraHeaders, ...request });
}
