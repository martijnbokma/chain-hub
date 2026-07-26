import { describe, expect, it } from "vitest";

import { parseFrontmatter, stringifyFrontmatter } from "./frontmatter.js";
import { FRONTMATTER_MARKER_KEY, HEADER_MARKER, hasFrontmatterMarker, hasHeaderMarker, markerSource } from "./marker.js";

describe("markerSource", () => {
  it("formats kind and name as a slash-joined source", () => {
    expect(markerSource("rules", "my-rule")).toBe("rules/my-rule");
  });
});

describe("hasFrontmatterMarker", () => {
  it("is false when no marker field is present", () => {
    expect(hasFrontmatterMarker({})).toBe(false);
  });

  it("is true when the marker field is present", () => {
    expect(hasFrontmatterMarker({ [FRONTMATTER_MARKER_KEY]: "rules/my-rule" })).toBe(true);
  });

  it("round-trips through stringify/parse frontmatter", () => {
    const written = stringifyFrontmatter({ [FRONTMATTER_MARKER_KEY]: markerSource("skills", "demo") }, "Body");
    const { data } = parseFrontmatter(written);
    expect(hasFrontmatterMarker(data)).toBe(true);
  });
});

describe("hasHeaderMarker", () => {
  it("is false for content without the header marker", () => {
    expect(hasHeaderMarker("# Some user-written file\n\nContent.")).toBe(false);
  });

  it("is true when the header marker is the first non-empty line", () => {
    expect(hasHeaderMarker(`${HEADER_MARKER}\n\n# Rules\n`)).toBe(true);
  });

  it("ignores leading blank lines", () => {
    expect(hasHeaderMarker(`\n\n${HEADER_MARKER}\nRest`)).toBe(true);
  });
});
