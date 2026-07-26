import { describe, expect, it } from "vitest";

import { deriveDescription, parseFrontmatter, stringifyFrontmatter } from "./frontmatter.js";

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

  it("treats unterminated fences as no frontmatter", () => {
    const result = parseFrontmatter("---\ndescription: x\nBody without closing fence");
    expect(result.data).toEqual({});
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

  it("falls back to the first heading when no description field exists", () => {
    const result = deriveDescription("# My Heading\n\nBody text.", "fallback-name");
    expect(result.description).toBe("My Heading");
  });

  it("falls back to the asset name when neither is present", () => {
    const result = deriveDescription("Just plain text, no heading.", "fallback-name");
    expect(result.description).toBe("fallback-name");
  });
});
