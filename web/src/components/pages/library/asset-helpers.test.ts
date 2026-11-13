import { describe, expect, it } from "vitest";

import type { AssetRecord, SkillLockEntry } from "@/types";
import {
  contentForClipboard,
  filterLibraryAssets,
  formatSkillSource,
  formatSkillSourceType,
  groupAssetsByKind,
  parseKindParam,
  parseSelectedAssetParams,
  parseOwnershipParam,
  resolveKindMeta,
  stripYamlFrontmatter
} from "./asset-helpers";
import { suggestAssetNameFromText } from "./asset-name";

function lockEntry(
  overrides: Partial<SkillLockEntry> & Pick<SkillLockEntry, "sourceType" | "source">
): SkillLockEntry {
  return {
    subdir: null,
    contentHash: null,
    installedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

const sampleAssets: AssetRecord[] = [
  {
    id: "1",
    name: "review-pr",
    kind: "skills",
    relativePath: "skills/review-pr/SKILL.md",
    updatedAt: "2026-01-01T00:00:00.000Z",
    provenance: null
  },
  {
    id: "2",
    name: "meeting-notes",
    kind: "prompts",
    relativePath: "prompts/meeting-notes.md",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "3",
    name: "design",
    kind: "skills",
    relativePath: "skills/design/SKILL.md",
    updatedAt: "2026-01-01T00:00:00.000Z",
    provenance: lockEntry({ sourceType: "git", source: "https://github.com/a/b" }),
    author: "Martijn Bokma"
  },
  {
    id: "4",
    name: "uploaded-skill",
    kind: "skills",
    relativePath: "skills/uploaded-skill/SKILL.md",
    updatedAt: "2026-01-01T00:00:00.000Z",
    provenance: lockEntry({ sourceType: "path", source: "upload://uploaded-skill" })
  }
];

describe("parseKindParam", () => {
  it("returns __all__ for missing or unknown values", () => {
    expect(parseKindParam(null)).toBe("__all__");
    expect(parseKindParam("nope")).toBe("__all__");
  });

  it("accepts known asset kinds", () => {
    expect(parseKindParam("prompts")).toBe("prompts");
    expect(parseKindParam("skills")).toBe("skills");
  });
});

describe("parseOwnershipParam", () => {
  it("returns all for missing or unknown values", () => {
    expect(parseOwnershipParam(null)).toBe("all");
    expect(parseOwnershipParam("mine")).toBe("all");
  });

  it("accepts editable and upstream", () => {
    expect(parseOwnershipParam("editable")).toBe("editable");
    expect(parseOwnershipParam("upstream")).toBe("upstream");
  });
});

describe("filterLibraryAssets", () => {
  it("filters by kind and search query", () => {
    expect(filterLibraryAssets(sampleAssets, "skills", "").map((asset) => asset.name)).toEqual([
      "review-pr",
      "design",
      "uploaded-skill"
    ]);
    expect(filterLibraryAssets(sampleAssets, "__all__", "meeting").map((asset) => asset.name)).toEqual([
      "meeting-notes"
    ]);
  });

  it("filters by ownership", () => {
    expect(
      filterLibraryAssets(sampleAssets, "__all__", "", "editable").map((asset) => asset.name)
    ).toEqual(["review-pr", "meeting-notes", "uploaded-skill"]);
    expect(
      filterLibraryAssets(sampleAssets, "__all__", "", "upstream").map((asset) => asset.name)
    ).toEqual(["design"]);
    expect(
      filterLibraryAssets(sampleAssets, "skills", "", "editable").map((asset) => asset.name)
    ).toEqual(["review-pr", "uploaded-skill"]);
  });

  it("matches author in search query", () => {
    expect(
      filterLibraryAssets(sampleAssets, "__all__", "Martijn").map((asset) => asset.name)
    ).toEqual(["design"]);
  });
});

describe("groupAssetsByKind", () => {
  it("groups records under their kind key", () => {
    const grouped = groupAssetsByKind(sampleAssets);
    expect(Object.keys(grouped).sort()).toEqual(["prompts", "skills"]);
    expect(grouped.skills).toHaveLength(3);
  });
});

describe("suggestAssetNameFromText", () => {
  it("derives a kebab slug from intent text", () => {
    expect(suggestAssetNameFromText("Review pull requests for security")).toContain("review");
  });
});

describe("resolveKindMeta", () => {
  it("returns the matching kind label", () => {
    expect(resolveKindMeta("agents").label).toBe("Agent");
    expect(resolveKindMeta("prompts").label).toBe("Prompt");
  });

  it("falls back to skills for unknown kinds", () => {
    expect(resolveKindMeta("unknown-kind").label).toBe("Skill");
  });
});

describe("formatSkillSource", () => {
  it("labels a missing lock entry as local", () => {
    expect(formatSkillSource(null)).toBe("Local hub (no lock entry)");
  });

  it("labels uploads distinctly from their raw source string", () => {
    expect(formatSkillSource(lockEntry({ sourceType: "path", source: "upload://foo" }))).toBe(
      "Uploaded via dashboard"
    );
  });

  it("includes the subdir for git sources when present", () => {
    expect(
      formatSkillSource(lockEntry({ sourceType: "git", source: "https://github.com/a/b", subdir: "skills/foo" }))
    ).toBe("https://github.com/a/b · skills/foo");
    expect(formatSkillSource(lockEntry({ sourceType: "git", source: "https://github.com/a/b" }))).toBe(
      "https://github.com/a/b"
    );
  });

  it("returns the raw source for non-git, non-upload entries", () => {
    expect(formatSkillSource(lockEntry({ sourceType: "path", source: "/local/path" }))).toBe("/local/path");
  });
});

describe("formatSkillSourceType", () => {
  it("returns local for a missing lock entry", () => {
    expect(formatSkillSourceType(null)).toBe("local");
  });

  it("returns upload for upload:// sources regardless of sourceType", () => {
    expect(formatSkillSourceType(lockEntry({ sourceType: "path", source: "upload://foo" }))).toBe("upload");
  });

  it("otherwise returns the raw sourceType", () => {
    expect(formatSkillSourceType(lockEntry({ sourceType: "git", source: "https://github.com/a/b" }))).toBe("git");
  });
});

describe("stripYamlFrontmatter", () => {
  it("removes a leading YAML frontmatter block", () => {
    expect(stripYamlFrontmatter("---\ntitle: Foo\n---\nBody text")).toBe("Body text");
  });

  it("returns the content unchanged when there is no frontmatter", () => {
    expect(stripYamlFrontmatter("Body text")).toBe("Body text");
  });

  it("returns the content unchanged when the frontmatter fence is unterminated", () => {
    expect(stripYamlFrontmatter("---\ntitle: Foo\nBody text")).toBe("---\ntitle: Foo\nBody text");
  });
});

describe("contentForClipboard", () => {
  it("strips frontmatter for prompts", () => {
    expect(contentForClipboard("---\ntitle: Foo\n---\nBody text", "prompts")).toBe("Body text");
  });

  it("leaves other kinds untouched", () => {
    expect(contentForClipboard("---\ntitle: Foo\n---\nBody text", "skills")).toBe(
      "---\ntitle: Foo\n---\nBody text"
    );
  });
});

describe("parseSelectedAssetParams", () => {
  it("returns the linked asset for a valid kind and name", () => {
    expect(parseSelectedAssetParams("skills", "review-pr")).toEqual({ kind: "skills", name: "review-pr" });
  });

  it("ignores links without a specific kind or name", () => {
    expect(parseSelectedAssetParams(null, "review-pr")).toBeNull();
    expect(parseSelectedAssetParams("unknown", "review-pr")).toBeNull();
    expect(parseSelectedAssetParams("skills", "  ")).toBeNull();
    expect(parseSelectedAssetParams("skills", null)).toBeNull();
  });
});
