import { describe, expect, it } from "vitest";

import { auditAssetResultSchema, improveAssetInputSchema } from "./ai.js";

describe("audit finding source", () => {
  it("accepts learning-sourced findings and the learnings count", () => {
    const result = auditAssetResultSchema.parse({
      summary: "One field-reported gap.",
      findings: [{ severity: "medium", title: "SVG targets", detail: "Use Element.closest.", source: "learning" }],
      learningsConsidered: 3
    });

    expect(result.findings[0]?.source).toBe("learning");
    expect(result.learningsConsidered).toBe(3);
  });

  it("keeps source and learningsConsidered optional for existing clients", () => {
    const result = auditAssetResultSchema.parse({
      summary: "Meets the bar.",
      findings: [{ severity: "low", title: "Triggers", detail: "Add triggers." }]
    });

    expect(result.findings[0]?.source).toBeUndefined();
    expect(result.learningsConsidered).toBeUndefined();
  });

  it("rejects unknown sources and negative counts", () => {
    const finding = { severity: "low", title: "T", detail: "D" };
    expect(() => auditAssetResultSchema.parse({ summary: "S", findings: [{ ...finding, source: "guess" }] })).toThrow();
    expect(() => auditAssetResultSchema.parse({ summary: "S", findings: [], learningsConsidered: -1 })).toThrow();
  });

  it("passes finding sources through to improve input", () => {
    const input = improveAssetInputSchema.parse({
      kind: "skills",
      name: "frontend-ui-engineering",
      findings: [{ severity: "medium", title: "SVG targets", detail: "Use Element.closest.", source: "learning" }]
    });

    expect(input.findings[0]?.source).toBe("learning");
  });
});
