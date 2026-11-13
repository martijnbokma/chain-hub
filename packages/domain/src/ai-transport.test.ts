import { describe, expect, it } from "vitest";

import { AiProviderError, completeChat } from "./ai-transport.js";

const models = {
  anthropic: "claude-test",
  openai: "",
  mistral: "",
  ollama: "m",
  gemini: "",
  groq: "",
  openrouter: "",
  deepseek: "",
  cerebras: ""
};
const config = {
  version: 1 as const,
  provider: "anthropic" as const,
  models,
  ollamaBaseUrl: "http://localhost:11434"
};
const secrets = { version: 1 as const };

describe("AiProviderError", () => {
  it("carries a user-facing message and status", () => {
    const error = new AiProviderError("Nope", 502);
    expect(error.name).toBe("AiProviderError");
    expect(error.status).toBe(502);
    expect(error).toBeInstanceOf(Error);
  });
});

describe("completeChat", () => {
  it("rejects a cloud provider without a configured API key before any request", async () => {
    await expect(
      completeChat({ config, secrets, system: "s", userMessage: "u" })
    ).rejects.toMatchObject({ name: "AiProviderError", status: 400 });
  });

  it("surfaces an unreachable provider as a 502 AiProviderError", async () => {
    await expect(
      completeChat({
        config: { version: 1, provider: "ollama", models, ollamaBaseUrl: "http://127.0.0.1:1" },
        secrets,
        system: "s",
        userMessage: "u"
      })
    ).rejects.toMatchObject({ name: "AiProviderError" });
  });
});
