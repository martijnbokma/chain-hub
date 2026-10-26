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

import { OPENAI_COMPATIBLE, PROVIDER_LABELS, formatProviderHttpError } from "./ai-provider-meta.js";

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
