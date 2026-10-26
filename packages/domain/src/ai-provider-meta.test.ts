import { describe, expect, it } from "vitest";

import { formatProviderHttpError, OPENAI_COMPATIBLE, PROVIDER_LABELS } from "./ai-provider-meta.js";

describe("formatProviderHttpError", () => {
  it("maps credit/billing failures to an actionable billing message", () => {
    const msg = formatProviderHttpError("Anthropic", 400, '{"error":{"message":"Your credit balance is too low"}}');
    expect(msg).toContain("credits or an active plan");
  });

  it("maps 401/403 and bad-key bodies to a re-auth message", () => {
    expect(formatProviderHttpError("OpenAI", 401, "{}")).toContain("rejected the API key");
    expect(formatProviderHttpError("Groq", 400, '{"error":{"message":"Incorrect API key provided"}}')).toContain("rejected the API key");
  });

  it("maps 429 to a rate-limit message", () => {
    expect(formatProviderHttpError("Gemini", 429, "{}")).toContain("rate limit");
  });

  it("maps unknown models to a pick-another-model message", () => {
    expect(formatProviderHttpError("Mistral", 404, "{}")).toContain("doesn't recognize that model");
    expect(formatProviderHttpError("Mistral", 400, '{"message":"model does not exist"}')).toContain("doesn't recognize that model");
  });

  it("surfaces short extracted provider messages verbatim", () => {
    expect(formatProviderHttpError("DeepSeek", 400, '{"error":{"message":"context length exceeded"}}')).toBe("DeepSeek: context length exceeded");
  });

  it("maps 5xx to a temporary-unavailable message", () => {
    expect(formatProviderHttpError("Cerebras", 503, "")).toContain("temporarily unavailable");
  });
});

describe("provider metadata", () => {
  it("gives every OpenAI-compatible provider an endpoint", () => {
    for (const [provider, meta] of Object.entries(OPENAI_COMPATIBLE)) {
      expect(meta.endpoint, provider).toMatch(/^https:\/\//);
    }
  });

  it("labels every cloud provider", () => {
    for (const label of Object.values(PROVIDER_LABELS)) {
      expect(label.length).toBeGreaterThan(0);
    }
  });
});
