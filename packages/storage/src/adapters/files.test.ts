import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { stringifyFrontmatter } from "./frontmatter.js";
import { FRONTMATTER_MARKER_KEY, HEADER_MARKER, markerSource } from "./marker.js";
import {
  buildIntegrationStatus,
  dirHasAnyFile,
  listFlatCandidates,
  listSkillCandidates,
  pathExists,
  readUnmanagedCandidates,
  removeEmptyDir,
  removeManagedFile,
  removeProjectedSkill,
  resyncSupportedAssets,
  writeManagedFile
} from "./files.js";

async function makeTmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-files-test-"));
}

describe("pathExists", () => {
  it("is true for an existing file and false for a missing one", async () => {
    const dir = await makeTmpDir();
    const filePath = path.join(dir, "present.md");
    await fs.writeFile(filePath, "content", "utf8");

    expect(await pathExists(filePath)).toBe(true);
    expect(await pathExists(path.join(dir, "missing.md"))).toBe(false);
  });
});

describe("writeManagedFile", () => {
  it("creates parent directories and writes the file when nothing exists yet", async () => {
    const dir = await makeTmpDir();
    const filePath = path.join(dir, "nested", "skill.md");
    const content = stringifyFrontmatter({ [FRONTMATTER_MARKER_KEY]: markerSource("skills", "demo") }, "Body");

    await writeManagedFile(filePath, content);

    expect(await fs.readFile(filePath, "utf8")).toBe(content);
  });

  it("overwrites a file that already carries the Chain Hub marker", async () => {
    const dir = await makeTmpDir();
    const filePath = path.join(dir, "skill.md");
    const original = stringifyFrontmatter({ [FRONTMATTER_MARKER_KEY]: markerSource("skills", "demo") }, "Old body");
    await fs.writeFile(filePath, original, "utf8");

    const updated = stringifyFrontmatter({ [FRONTMATTER_MARKER_KEY]: markerSource("skills", "demo") }, "New body");
    await writeManagedFile(filePath, updated);

    expect(await fs.readFile(filePath, "utf8")).toBe(updated);
  });

  it("refuses to clobber a pre-existing file that isn't Chain Hub managed", async () => {
    const dir = await makeTmpDir();
    const filePath = path.join(dir, "skill.md");
    const foreign = "# A user's own file\n\nUntouched.";
    await fs.writeFile(filePath, foreign, "utf8");

    await writeManagedFile(filePath, "generated content");

    expect(await fs.readFile(filePath, "utf8")).toBe(foreign);
  });

  it("force writes over a foreign file when force: true", async () => {
    const dir = await makeTmpDir();
    const filePath = path.join(dir, "skill.md");
    await fs.writeFile(filePath, "foreign content", "utf8");

    await writeManagedFile(filePath, "adopted content", "frontmatter", { force: true });

    expect(await fs.readFile(filePath, "utf8")).toBe("adopted content");
  });

  it("supports the header marker check for merge-kind files", async () => {
    const dir = await makeTmpDir();
    const filePath = path.join(dir, "AGENTS.md");
    const foreign = "# Hand-written agents file\n";
    await fs.writeFile(filePath, foreign, "utf8");

    await writeManagedFile(filePath, `${HEADER_MARKER}\ngenerated`, "header");

    expect(await fs.readFile(filePath, "utf8")).toBe(foreign);

    await fs.writeFile(filePath, `${HEADER_MARKER}\nold`, "utf8");
    await writeManagedFile(filePath, `${HEADER_MARKER}\nnew`, "header");
    expect(await fs.readFile(filePath, "utf8")).toBe(`${HEADER_MARKER}\nnew`);
  });
});

describe("removeManagedFile", () => {
  it("removes a file that carries the Chain Hub marker", async () => {
    const dir = await makeTmpDir();
    const filePath = path.join(dir, "skill.md");
    const content = stringifyFrontmatter({ [FRONTMATTER_MARKER_KEY]: markerSource("skills", "demo") }, "Body");
    await fs.writeFile(filePath, content, "utf8");

    await removeManagedFile(filePath);

    expect(await pathExists(filePath)).toBe(false);
  });

  it("leaves a foreign, unmanaged file untouched", async () => {
    const dir = await makeTmpDir();
    const filePath = path.join(dir, "skill.md");
    await fs.writeFile(filePath, "# Not ours", "utf8");

    await removeManagedFile(filePath);

    expect(await pathExists(filePath)).toBe(true);
  });

  it("is a no-op when the file doesn't exist", async () => {
    const dir = await makeTmpDir();
    await expect(removeManagedFile(path.join(dir, "missing.md"))).resolves.toBeUndefined();
  });
});

describe("removeEmptyDir", () => {
  it("removes a directory only when it has no remaining entries", async () => {
    const dir = await makeTmpDir();
    const emptySub = path.join(dir, "empty");
    await fs.mkdir(emptySub);

    await removeEmptyDir(emptySub);
    expect(await pathExists(emptySub)).toBe(false);
  });

  it("leaves a non-empty directory in place", async () => {
    const dir = await makeTmpDir();
    const nonEmptySub = path.join(dir, "full");
    await fs.mkdir(nonEmptySub);
    await fs.writeFile(path.join(nonEmptySub, "file.txt"), "x", "utf8");

    await removeEmptyDir(nonEmptySub);
    expect(await pathExists(nonEmptySub)).toBe(true);
  });
});

describe("dirHasAnyFile", () => {
  it("is false for a missing directory and an empty one, true once a file exists", async () => {
    const dir = await makeTmpDir();
    const sub = path.join(dir, "sub");

    expect(await dirHasAnyFile(path.join(dir, "does-not-exist"))).toBe(false);

    await fs.mkdir(sub);
    expect(await dirHasAnyFile(sub)).toBe(false);

    await fs.writeFile(path.join(sub, "file.txt"), "x", "utf8");
    expect(await dirHasAnyFile(sub)).toBe(true);
  });
});

describe("listSkillCandidates", () => {
  it("finds only subdirectories that contain a SKILL.md", async () => {
    const dir = await makeTmpDir();
    await fs.mkdir(path.join(dir, "has-skill"));
    await fs.writeFile(path.join(dir, "has-skill", "SKILL.md"), "# Skill", "utf8");
    await fs.mkdir(path.join(dir, "no-skill"));

    const candidates = await listSkillCandidates(dir);

    expect(candidates).toEqual([
      { name: "has-skill", filePath: path.join(dir, "has-skill", "SKILL.md") }
    ]);
  });

  it("returns an empty list when the directory doesn't exist", async () => {
    const dir = await makeTmpDir();
    expect(await listSkillCandidates(path.join(dir, "missing"))).toEqual([]);
  });
});

describe("listFlatCandidates", () => {
  it("finds files matching the extension and strips it from the name", async () => {
    const dir = await makeTmpDir();
    await fs.writeFile(path.join(dir, "style.mdc"), "rule", "utf8");
    await fs.writeFile(path.join(dir, "notes.txt"), "ignored", "utf8");

    const candidates = await listFlatCandidates(dir, ".mdc");

    expect(candidates).toEqual([{ name: "style", filePath: path.join(dir, "style.mdc") }]);
  });
});

describe("readUnmanagedCandidates", () => {
  it("skips candidates that already carry the frontmatter marker", async () => {
    const dir = await makeTmpDir();
    const managedPath = path.join(dir, "managed.md");
    await fs.writeFile(
      managedPath,
      stringifyFrontmatter({ [FRONTMATTER_MARKER_KEY]: markerSource("skills", "managed") }, "Body"),
      "utf8"
    );

    const results = await readUnmanagedCandidates([{ name: "managed", filePath: managedPath }], "skills");

    expect(results).toEqual([]);
  });

  it("falls back to the candidate name and adds no heading when the body has none", async () => {
    const dir = await makeTmpDir();
    const filePath = path.join(dir, "plain.md");
    await fs.writeFile(filePath, "Just body text, no heading.", "utf8");

    const [result] = await readUnmanagedCandidates([{ name: "plain", filePath }], "rules");

    expect(result).toMatchObject({
      kind: "rules",
      name: "plain",
      sourcePath: filePath,
      content: "Just body text, no heading."
    });
  });

  it("keeps the source frontmatter so nothing is lost on import", async () => {
    const dir = await makeTmpDir();
    const filePath = path.join(dir, "plain.md");
    const raw = "---\ndescription: A Nicer Title\nglobs: \"*.ts\"\n---\n\nBody text, no heading.";
    await fs.writeFile(filePath, raw, "utf8");

    const [result] = await readUnmanagedCandidates([{ name: "plain", filePath }], "rules");

    expect(result.content).toBe(raw);
  });

  it("leaves the body untouched when it already starts with a heading", async () => {
    const dir = await makeTmpDir();
    const filePath = path.join(dir, "titled.md");
    await fs.writeFile(filePath, "# Already Titled\n\nBody.", "utf8");

    const [result] = await readUnmanagedCandidates([{ name: "titled", filePath }], "rules");

    expect(result.content).toBe("# Already Titled\n\nBody.");
  });
});

describe("removeProjectedSkill", () => {
  it("removes a managed SKILL.md together with its folder and sidecars", async () => {
    const dir = await makeTmpDir();
    const skillDir = path.join(dir, "demo");
    const filePath = path.join(skillDir, "SKILL.md");
    await fs.mkdir(path.join(skillDir, "scripts"), { recursive: true });
    await fs.writeFile(path.join(skillDir, "scripts", "run.sh"), "echo hi", "utf8");
    await fs.writeFile(
      filePath,
      stringifyFrontmatter({ [FRONTMATTER_MARKER_KEY]: markerSource("skills", "demo") }, "Body"),
      "utf8"
    );

    await removeProjectedSkill(filePath);

    expect(await pathExists(skillDir)).toBe(false);
  });

  it("keeps a hand-written SKILL.md and its folder", async () => {
    const dir = await makeTmpDir();
    const filePath = path.join(dir, "mine", "SKILL.md");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "# Mine", "utf8");

    await removeProjectedSkill(filePath);

    expect(await pathExists(filePath)).toBe(true);
  });
});

describe("resyncSupportedAssets", () => {
  it("force-writes only assets of supported kinds", async () => {
    const written: string[] = [];
    const asset = (kind: "skills" | "agents", name: string) =>
      ({ kind, name, content: "" }) as unknown as Parameters<typeof resyncSupportedAssets>[1][number];

    await resyncSupportedAssets(["skills"], [asset("skills", "a"), asset("agents", "b")], async (item, options) => {
      written.push(`${item.kind}/${item.name}:${options.force}`);
    });

    expect(written).toEqual(["skills/a:true"]);
  });
});

describe("buildIntegrationStatus", () => {
  it("reports connected when any target directory has files", async () => {
    const dir = await makeTmpDir();
    const empty = path.join(dir, "empty");
    const filled = path.join(dir, "filled");
    await fs.mkdir(empty);
    await fs.mkdir(filled);
    await fs.writeFile(path.join(filled, "rule.md"), "x", "utf8");

    const status = await buildIntegrationStatus({
      id: "demo",
      label: "Demo",
      targetPaths: [empty, filled],
      supportedKinds: ["rules"]
    });

    expect(status).toMatchObject({ id: "demo", connected: true, mode: "managed", supportedKinds: ["rules"] });
    expect(status.unsupportedKinds).toEqual(["skills", "agents", "workflows", "prompts"]);
  });

  it("reports missing when no target directory has files", async () => {
    const dir = await makeTmpDir();
    const status = await buildIntegrationStatus({
      id: "demo",
      label: "Demo",
      targetPaths: [path.join(dir, "nope")],
      supportedKinds: ["rules"]
    });

    expect(status).toMatchObject({ connected: false, mode: "missing" });
  });
});
