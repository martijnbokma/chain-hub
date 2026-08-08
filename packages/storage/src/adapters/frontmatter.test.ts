import { describe, expect, it } from "vitest";

import {
  deriveDescription,
  ensureExplicitDescription,
  extractAssetAuthor,
  getExplicitDescription,
  parseFrontmatter,
  stringifyFrontmatter
} from "./frontmatter.js";

describe("parseFrontmatter", () => {
  it("returns empty data and original body when no frontmatter fence is present", () => {
    const result = parseFrontmatter("# Title\n\nSome body text.");
    expect(result.data).toEqual({});
    expect(result.body).toBe("# Title\n\nSome body text.");
  });

  it("parses string, boolean, and array fields", () => {
    const raw = [
      "---",
      "description: A test rule",
      "alwaysApply: true",
      "globs: [src/**/*.ts, lib/**/*.js]",
      "---",
      "",
      "Body content here."
    ].join("\n");

    const result = parseFrontmatter(raw);
    expect(result.data.description).toBe("A test rule");
    expect(result.data.alwaysApply).toBe(true);
    expect(result.data.globs).toEqual(["src/**/*.ts", "lib/**/*.js"]);
    expect(result.body).toBe("Body content here.");
  });

  it("strips quotes from quoted scalar values", () => {
    const raw = ['---', 'description: "Has: a colon"', '---', '', 'Body'].join("\n");
    const result = parseFrontmatter(raw);
    expect(result.data.description).toBe("Has: a colon");
  });

  it("parses folded block scalar descriptions", () => {
    const raw = [
      "---",
      "name: bundle-strategy-audit",
      "description: >-",
      "  Audits code splitting and lazy-loading.",
      "  Use when the user asks about bundle size.",
      "metadata:",
      "  author: Martijn Bokma",
      "---",
      "",
      "# Bundle Strategy Audit"
    ].join("\n");

    const result = parseFrontmatter(raw);
    expect(result.data.description).toBe(
      "Audits code splitting and lazy-loading. Use when the user asks about bundle size."
    );
    expect(result.data.author).toBe("Martijn Bokma");
    expect(result.body).toBe("# Bundle Strategy Audit");
  });

  it("treats an empty block scalar description as empty string", () => {
    const raw = ["---", "name: demo", "description: >-", "---", "", "# Demo"].join("\n");
    const result = parseFrontmatter(raw);
    expect(result.data.description).toBe("");
  });

  it("treats unterminated fences as no frontmatter", () => {
    const result = parseFrontmatter("---\ndescription: x\nBody without closing fence");
    expect(result.data).toEqual({});
  });
});

describe("extractAssetAuthor", () => {
  it("returns null when author is absent", () => {
    expect(extractAssetAuthor("# Title\n\nBody")).toBeNull();
    expect(extractAssetAuthor("---\nname: demo\n---\n\nBody")).toBeNull();
  });

  it("reads top-level and nested metadata author fields", () => {
    expect(extractAssetAuthor("---\nauthor: Martijn Bokma\n---\n\nBody")).toBe("Martijn Bokma");
    expect(
      extractAssetAuthor(["---", "metadata:", "  author: Martijn Bokma", "maintained_by: self", "---", "", "Body"].join("\n"))
    ).toBe("Martijn Bokma");
  });
});

describe("stringifyFrontmatter", () => {
  it("returns body unchanged when there is no data", () => {
    expect(stringifyFrontmatter({}, "Just body")).toBe("Just body");
  });

  it("round-trips through parseFrontmatter", () => {
    const data = { description: "Has: a colon", alwaysApply: true, globs: ["a/*.ts", "b/*.ts"] };
    const written = stringifyFrontmatter(data, "Body here.");
    const parsed = parseFrontmatter(written);
    expect(parsed.data).toEqual(data);
    expect(parsed.body).toBe("Body here.");
  });
});

describe("deriveDescription", () => {
  it("prefers an explicit description frontmatter field", () => {
    const content = ["---", "description: Explicit description", "---", "", "# Heading instead"].join("\n");
    const result = deriveDescription(content, "fallback-name");
    expect(result.description).toBe("Explicit description");
  });

  it("uses folded block scalar descriptions instead of the literal >- marker", () => {
    const content = [
      "---",
      "description: >-",
      "  Real description text for editors.",
      "---",
      "",
      "# Heading"
    ].join("\n");
    const result = deriveDescription(content, "fallback-name");
    expect(result.description).toBe("Real description text for editors.");
  });

  it("falls back to the first heading when description is an empty block scalar", () => {
    const content = ["---", "description: >-", "---", "", "# Bundle Strategy Audit"].join("\n");
    const result = deriveDescription(content, "fallback-name");
    expect(result.description).toBe("Bundle Strategy Audit");
  });

  it("falls back to the first heading when no description field exists", () => {
    const result = deriveDescription("# My Heading\n\nBody text.", "fallback-name");
    expect(result.description).toBe("My Heading");
  });

  it("falls back to the asset name when neither is present", () => {
    const result = deriveDescription("Just plain text, no heading.", "fallback-name");
    expect(result.description).toBe("fallback-name");
  });
});

describe("getExplicitDescription / ensureExplicitDescription", () => {
  it("returns null when description is missing or blank", () => {
    expect(getExplicitDescription("# Title\n\nBody")).toBeNull();
    expect(getExplicitDescription("---\ndescription: >-\n---\n\n# Title")).toBeNull();
  });

  it("returns trimmed explicit descriptions", () => {
    expect(getExplicitDescription("---\ndescription: Hello editors\n---\n\n# Title")).toBe("Hello editors");
  });

  it("injects a heading-based description when missing", () => {
    const ensured = ensureExplicitDescription("# Bundle Strategy Audit\n\nBody.", "bundle-strategy-audit");
    expect(getExplicitDescription(ensured)).toBe("Bundle Strategy Audit");
    expect(ensured).toContain("# Bundle Strategy Audit");
  });

  it("leaves content unchanged when an explicit description already exists", () => {
    const content = "---\ndescription: Keep me\n---\n\n# Title\n";
    expect(ensureExplicitDescription(content, "demo")).toBe(content);
  });
});
