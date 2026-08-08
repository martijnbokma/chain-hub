import { describe, expect, it } from "vitest";

import type { AssetRecord, SkillLockEntry } from "@/types";
import {
  filterLibraryAssets,
  groupAssetsByKind,
  parseKindParam,
  parseOwnershipParam,
  suggestAssetNameFromText
} from "./asset-helpers";

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
