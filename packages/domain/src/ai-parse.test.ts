import { describe, expect, it } from "vitest";

import {
  extractSuggestedNameFromContent,
  parseAudit,
  parseClassification,
  suggestNameFromIntent
} from "./ai-parse.js";
import { AiProviderError } from "./ai-transport.js";

describe("parseClassification", () => {
  it("parses a fenced JSON classification", () => {
    const result = parseClassification('```json\n{"kind":"skills","reason":"reusable procedure","suggestedName":"Pr Review!"}\n```');
    expect(result).toEqual({ kind: "skills", reason: "reusable procedure", suggestedName: "pr-review" });
  });

  it("falls back to a default reason and drops bad names", () => {
    expect(parseClassification('{"kind":"rules"}')).toEqual({ kind: "rules", reason: "Best fit as rules" });
  });

  it("rejects unknown kinds and unreadable JSON", () => {
    expect(() => parseClassification('{"kind":"gizmo"}')).toThrow(AiProviderError);
    expect(() => parseClassification("no json here")).toThrow(AiProviderError);
  });
});

describe("extractSuggestedNameFromContent", () => {
  it("prefers frontmatter name over heading", () => {
    const content = '---\ndescription: x\nname: "my-skill"\n---\n# Other Title\n';
    expect(extractSuggestedNameFromContent(content)).toBe("my-skill");
  });

  it("falls back to the first heading", () => {
    expect(extractSuggestedNameFromContent("# Review Commits\n\nbody")).toBe("review-commits");
    expect(extractSuggestedNameFromContent("no heading")).toBeUndefined();
  });
});

describe("suggestNameFromIntent", () => {
  it("strips stop words and slugifies", () => {
    expect(suggestNameFromIntent("Please create a workflow for the PR review")).toBe("pr-review");
  });

  it("strips Dutch stop words and caps length", () => {
    expect(suggestNameFromIntent("maak een skill dat wordt uitgevoerd voor commits")).toBe("commits");
    const long = suggestNameFromIntent(`check ${"very ".repeat(30)}things`);
    expect(long.length).toBeLessThanOrEqual(48);
  });
});

describe("parseAudit", () => {
  it("parses findings and filters malformed rows", () => {
    const result = parseAudit(
      JSON.stringify({
        summary: "ok",
        findings: [
          { severity: "high", title: "Missing description", detail: "Zed needs one", source: "learning" },
          { severity: "bogus", title: "skipped", detail: "x" },
          { title: "no severity", detail: "x" },
          "not-an-object"
        ]
      }),
      { allowLearningSource: true }
    );
    expect(result.summary).toBe("ok");
    expect(result.findings).toEqual([
      { severity: "high", title: "Missing description", detail: "Zed needs one", source: "learning" }
    ]);
  });

  it("omits source when not allowed and defaults summary", () => {
    const result = parseAudit(
      JSON.stringify({ findings: [{ severity: "low", title: "t", detail: "d", source: "learning" }] }),
      { allowLearningSource: false }
    );
    expect(result.summary).toBe("Audit complete");
    expect(result.findings[0]).toEqual({ severity: "low", title: "t", detail: "d" });
  });

  it("throws when findings is not an array", () => {
    expect(() => parseAudit('{"summary":"x"}', { allowLearningSource: false })).toThrow(AiProviderError);
  });
});
