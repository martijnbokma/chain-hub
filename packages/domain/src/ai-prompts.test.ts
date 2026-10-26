import { describe, expect, it } from "vitest";

import { buildUserMessage, systemPromptForImprove, systemPromptForKind } from "./ai-prompts.js";

describe("ai-prompts", () => {
  it("returns a system prompt per asset kind", () => {
    for (const kind of ["skills", "agents", "workflows", "rules", "prompts"] as const) {
      const prompt = systemPromptForKind(kind);
      expect(prompt.length).toBeGreaterThan(50);
    }
    expect(systemPromptForKind("skills")).not.toBe(systemPromptForKind("agents"));
  });

  it("builds improve prompts containing kind-specific rules", () => {
    const prompt = systemPromptForImprove("rules");
    expect(prompt).toContain("rules");
    expect(prompt).toContain(systemPromptForKind("rules"));
  });

  it("buildUserMessage includes kind, intent and optional name", () => {
    expect(buildUserMessage({ intent: "make a pr checklist", kind: "workflows", name: "pr-check" })).toBe(
      "Asset kind: workflows\nIntent: make a pr checklist\nSuggested asset name: pr-check"
    );
  });

  it("buildUserMessage trims and omits an empty name", () => {
    expect(buildUserMessage({ intent: "  lint rules  ", kind: "rules", name: " " })).toBe(
      "Asset kind: rules\nIntent: lint rules"
    );
  });
});
