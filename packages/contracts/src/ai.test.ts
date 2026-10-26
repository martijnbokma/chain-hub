import { describe, expect, it } from "vitest";

import {
  aiProviderSchema,
  aiProviders,
  aiConfigSchema,
  DEFAULT_AI_MODELS,
  updateAiSettingsInputSchema
} from "./ai.js";

describe("contracts/ai", () => {
  it("every provider has a default model", () => {
    for (const provider of aiProviders) {
      expect(DEFAULT_AI_MODELS[provider], provider).toBeTruthy();
    }
  });

  it("aiProviderSchema accepts known providers and rejects others", () => {
    expect(aiProviderSchema.safeParse("anthropic").success).toBe(true);
    expect(aiProviderSchema.safeParse("ollama").success).toBe(true);
    expect(aiProviderSchema.safeParse("chatgpt").success).toBe(false);
  });

  it("aiConfigSchema parses a minimal config", () => {
    const config = aiConfigSchema.parse({ version: 1 });
    expect(config.provider).toBeDefined();
    expect(config.models).toBeDefined();
  });

  it("updateAiSettingsInputSchema rejects unknown providers", () => {
    expect(updateAiSettingsInputSchema.safeParse({ provider: "nope" }).success).toBe(false);
    expect(updateAiSettingsInputSchema.safeParse({ provider: "groq" }).success).toBe(true);
  });
});
