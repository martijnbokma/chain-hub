import type { AiProvider } from "@chain-hub/contracts";

// Provider-facing metadata for the AI transport: display labels, endpoint maps and
// plain-language error formatting. Transport lives in ai-transport.ts.

export type CloudProvider = Exclude<AiProvider, "ollama">;

export const PROVIDER_LABELS: Record<CloudProvider, string> = {
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
export const OPENAI_COMPATIBLE: Record<Exclude<CloudProvider, "anthropic">, { endpoint: string; extraHeaders?: Record<string, string> }> = {
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

export function formatProviderHttpError(providerLabel: string, status: number, rawBody: string): string {
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
