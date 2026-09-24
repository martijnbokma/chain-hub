import { describe, expect, it } from "vitest";

import {
  assertSafeRelativeSkillPath,
  installSkillInputSchema,
  isEditableHubAsset,
  isUpstreamOwnedSkill,
  normalizeSkillName,
  subdirFromSkillPath,
  type SkillLockEntry
} from "./asset.js";

function lockEntry(overrides: Partial<SkillLockEntry> & Pick<SkillLockEntry, "sourceType" | "source">): SkillLockEntry {
  return {
    subdir: null,
    contentHash: null,
    installedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

describe("normalizeSkillName", () => {
  it("lowercases and kebab-cases names", () => {
    expect(normalizeSkillName("My Cool Skill")).toBe("my-cool-skill");
    expect(normalizeSkillName("  Foo_Bar.Baz  ")).toBe("foo-bar-baz");
  });

  it("strips leading and trailing separators", () => {
    expect(normalizeSkillName("---hello---")).toBe("hello");
  });

  it("returns empty string when nothing alphanumeric remains", () => {
    expect(normalizeSkillName("!!!")).toBe("");
  });
});

describe("subdirFromSkillPath", () => {
  it("returns parent directory for nested skill paths", () => {
    expect(subdirFromSkillPath("skills/design/SKILL.md")).toBe("skills/design");
    expect(subdirFromSkillPath("skills\\design\\SKILL.md")).toBe("skills/design");
  });

  it("returns undefined for missing, root, or bare filenames", () => {
    expect(subdirFromSkillPath(undefined)).toBeUndefined();
    expect(subdirFromSkillPath("SKILL.md")).toBeUndefined();
    expect(subdirFromSkillPath("/SKILL.md")).toBeUndefined();
  });
});

describe("isUpstreamOwnedSkill", () => {
  it("treats missing lock and uploads as not upstream", () => {
    expect(isUpstreamOwnedSkill(null)).toBe(false);
    expect(isUpstreamOwnedSkill(undefined)).toBe(false);
    expect(isUpstreamOwnedSkill(lockEntry({ sourceType: "path", source: "upload://demo" }))).toBe(false);
  });

  it("treats git and path locks as upstream", () => {
    expect(isUpstreamOwnedSkill(lockEntry({ sourceType: "git", source: "https://github.com/a/b" }))).toBe(true);
    expect(isUpstreamOwnedSkill(lockEntry({ sourceType: "path", source: "/tmp/skills/demo" }))).toBe(true);
  });
});

describe("isEditableHubAsset", () => {
  it("marks non-skills as editable", () => {
    expect(isEditableHubAsset({ kind: "prompts" })).toBe(true);
    expect(isEditableHubAsset({ kind: "agents", provenance: null })).toBe(true);
  });

  it("marks local and uploaded skills as editable", () => {
    expect(isEditableHubAsset({ kind: "skills", provenance: null })).toBe(true);
    expect(
      isEditableHubAsset({
        kind: "skills",
        provenance: lockEntry({ sourceType: "path", source: "upload://demo" })
      })
    ).toBe(true);
  });

  it("marks upstream-locked skills as not editable", () => {
    expect(
      isEditableHubAsset({
        kind: "skills",
        provenance: lockEntry({ sourceType: "git", source: "https://github.com/a/b" })
      })
    ).toBe(false);
  });
});

describe("assertSafeRelativeSkillPath", () => {
  it("normalizes relative paths", () => {
    expect(assertSafeRelativeSkillPath("SKILL.md")).toBe("SKILL.md");
    expect(assertSafeRelativeSkillPath("docs/guide.md")).toBe("docs/guide.md");
    expect(assertSafeRelativeSkillPath("docs\\guide.md")).toBe("docs/guide.md");
    expect(assertSafeRelativeSkillPath("/nested/file.md")).toBe("nested/file.md");
  });

  it("rejects traversal and drive-letter paths", () => {
    expect(() => assertSafeRelativeSkillPath("../secret.md")).toThrow(/Unsafe skill file path/);
    expect(() => assertSafeRelativeSkillPath("foo/../bar.md")).toThrow(/Unsafe skill file path/);
    expect(() => assertSafeRelativeSkillPath("C:/Windows/system32")).toThrow(/Unsafe skill file path/);
    expect(() => assertSafeRelativeSkillPath("")).toThrow(/Unsafe skill file path/);
  });
});

describe("installSkillInputSchema", () => {
  it("rejects a repo that would be parsed as a git option", () => {
    expect(installSkillInputSchema.safeParse({ repo: "--upload-pack=touch /tmp/x" }).success).toBe(false);
    expect(installSkillInputSchema.safeParse({ repo: " -c core.sshCommand=x" }).success).toBe(false);
  });

  it("accepts URLs and paths", () => {
    expect(installSkillInputSchema.safeParse({ repo: "https://github.com/acme/skills.git" }).success).toBe(true);
    expect(installSkillInputSchema.safeParse({ repo: "git@github.com:acme/skills.git" }).success).toBe(true);
    expect(installSkillInputSchema.safeParse({ repo: "/Users/me/skills" }).success).toBe(true);
  });
});
