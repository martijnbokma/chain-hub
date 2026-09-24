import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  forkSkill,
  getAgentsSkillsDrift,
  getAsset,
  initializeHub,
  installSkill,
  installSkillBundle,
  listAssets,
  migrateAgentsSkills,
  readSkillFile,
  updateAsset,
  updateSkills
} from "./index.js";

const execFileAsync = promisify(execFile);

const originalHome = process.env.HOME;
let tmpHome: string;
let tmpHub: string;

beforeEach(async () => {
  tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-home-"));
  tmpHub = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-hub-"));
  process.env.HOME = tmpHome;
  await initializeHub(tmpHub);
});

afterEach(() => {
  process.env.HOME = originalHome;
});

async function writeFixtureSkill(root: string, name: string): Promise<string> {
  const skillRoot = path.join(root, name);
  await fs.mkdir(path.join(skillRoot, "scripts"), { recursive: true });
  await fs.writeFile(
    path.join(skillRoot, "SKILL.md"),
    `---\nname: ${name}\ndescription: Fixture skill\n---\n\n# ${name}\n\nBody.\n`,
    "utf8"
  );
  await fs.writeFile(path.join(skillRoot, "scripts", "hello.sh"), "#!/bin/sh\necho hi\n", "utf8");
  return skillRoot;
}

describe("installSkill", () => {
  it("installs from a local path into the hub and records a lock entry", async () => {
    const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-fixture-"));
    const source = await writeFixtureSkill(fixtureRoot, "demo-skill");

    const result = await installSkill(tmpHub, { path: source });

    expect(result.asset.name).toBe("demo-skill");
    expect(result.lockEntry.sourceType).toBe("path");
    expect(result.lockEntry.source).toBe(path.resolve(source));
    expect(result.asset.provenance?.source).toBe(path.resolve(source));

    const listed = await listAssets(tmpHub, "skills");
    expect(listed.find((asset) => asset.name === "demo-skill")?.provenance?.sourceType).toBe("path");

    const hubSkill = path.join(tmpHub, "skills", "demo-skill");
    expect(await fs.readFile(path.join(hubSkill, "SKILL.md"), "utf8")).toContain("Fixture skill");
    expect(await fs.readFile(path.join(hubSkill, "scripts", "hello.sh"), "utf8")).toContain("echo hi");

    const lock = JSON.parse(await fs.readFile(path.join(tmpHub, "system", "skills-lock.json"), "utf8")) as {
      skills: Record<string, { sourceType: string }>;
    };
    expect(lock.skills["demo-skill"]?.sourceType).toBe("path");
  });

  it("refuses to overwrite without force", async () => {
    const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-fixture-"));
    const source = await writeFixtureSkill(fixtureRoot, "locked-skill");
    await installSkill(tmpHub, { path: source });
    await expect(installSkill(tmpHub, { path: source })).rejects.toThrow(/already exists/);
  });

  it("installs from a local git repo", async () => {
    const repo = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-repo-"));
    await writeFixtureSkill(repo, "git-skill");
    await execFileAsync("git", ["init"], { cwd: repo });
    await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: repo });
    await execFileAsync("git", ["config", "user.name", "Test"], { cwd: repo });
    await execFileAsync("git", ["add", "."], { cwd: repo });
    await execFileAsync("git", ["commit", "-m", "init"], { cwd: repo });

    const result = await installSkill(tmpHub, { repo, subdir: "git-skill" });
    expect(result.asset.name).toBe("git-skill");
    expect(result.lockEntry.sourceType).toBe("git");
    expect(result.lockEntry.subdir).toBe("git-skill");
    const asset = await getAsset(tmpHub, "skills", "git-skill");
    expect(asset.content).toContain("git-skill");
  });

  it("does not copy .git or symlinks that leave the skill folder", async () => {
    const repo = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-repo-"));
    const secret = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-secret-")), "secret.txt");
    await fs.writeFile(secret, "top secret\n", "utf8");
    await fs.writeFile(path.join(repo, "SKILL.md"), "---\nname: root-skill\ndescription: Root\n---\n# Root\n", "utf8");
    await fs.writeFile(path.join(repo, "notes.md"), "notes\n", "utf8");
    await fs.symlink(secret, path.join(repo, "leak.txt"));
    await fs.symlink("notes.md", path.join(repo, "alias.md"));
    await fs.symlink(os.tmpdir(), path.join(repo, "tmp-dir"));
    await execFileAsync("git", ["init"], { cwd: repo });
    await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: repo });
    await execFileAsync("git", ["config", "user.name", "Test"], { cwd: repo });
    await execFileAsync("git", ["add", "."], { cwd: repo });
    await execFileAsync("git", ["commit", "-m", "init"], { cwd: repo });

    await installSkill(tmpHub, { repo: `file://${repo}`, name: "root-skill" });

    const entries = (await fs.readdir(path.join(tmpHub, "skills", "root-skill"))).sort();
    expect(entries).toEqual(["SKILL.md", "alias.md", "notes.md"]);
    const alias = await fs.lstat(path.join(tmpHub, "skills", "root-skill", "alias.md"));
    expect(alias.isSymbolicLink()).toBe(false);
  });

  it("rejects a subdir that escapes the cloned repo", async () => {
    const repo = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-repo-"));
    await writeFixtureSkill(repo, "inner-skill");
    await execFileAsync("git", ["init"], { cwd: repo });
    await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: repo });
    await execFileAsync("git", ["config", "user.name", "Test"], { cwd: repo });
    await execFileAsync("git", ["add", "."], { cwd: repo });
    await execFileAsync("git", ["commit", "-m", "init"], { cwd: repo });

    await expect(installSkill(tmpHub, { repo, subdir: "../../etc" })).rejects.toThrow(/Unsafe skill file path/);
  });

  it("installs from an uploaded file bundle", async () => {
    const skillMd = "---\nname: browsed-skill\n---\n\n# Browsed\n";
    const result = await installSkillBundle(tmpHub, {
      name: "browsed-skill",
      files: [
        { path: "SKILL.md", contentBase64: Buffer.from(skillMd, "utf8").toString("base64") },
        { path: "scripts/hi.sh", contentBase64: Buffer.from("echo hi\n", "utf8").toString("base64") }
      ]
    });

    expect(result.asset.name).toBe("browsed-skill");
    expect(await fs.readFile(path.join(tmpHub, "skills", "browsed-skill", "scripts", "hi.sh"), "utf8")).toContain(
      "echo hi"
    );
  });

  it("skips path updates when content hash is unchanged", async () => {
    const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-fixture-"));
    const source = await writeFixtureSkill(fixtureRoot, "stable-skill");
    await installSkill(tmpHub, { path: source });

    const updated = await updateSkills(tmpHub, { name: "stable-skill" });
    expect(updated.results).toHaveLength(1);
    expect(updated.results[0]?.status).toBe("skipped");
  });

  it("refuses direct edits on upstream-owned skills and allows forks", async () => {
    const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-fixture-"));
    const source = await writeFixtureSkill(fixtureRoot, "upstream-skill");
    await installSkill(tmpHub, { path: source });

    await expect(updateAsset(tmpHub, "skills", "upstream-skill", "# hacked\n")).rejects.toThrow(
      /upstream-owned/
    );

    const forked = await forkSkill(tmpHub, { name: "upstream-skill" });
    expect(forked.name).toBe("upstream-skill-local");
    expect(forked.provenance).toBeNull();

    const edited = await updateAsset(tmpHub, "skills", "upstream-skill-local", "# local fork\n");
    expect(edited.content).toContain("local fork");

    const lock = JSON.parse(await fs.readFile(path.join(tmpHub, "system", "skills-lock.json"), "utf8")) as {
      skills: Record<string, unknown>;
    };
    expect(lock.skills["upstream-skill"]).toBeTruthy();
    expect(lock.skills["upstream-skill-local"]).toBeUndefined();
  });

  it("migrates entries from an agents-style skill lock", async () => {
    const repo = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-agents-repo-"));
    await writeFixtureSkill(repo, "migrated-skill");
    await execFileAsync("git", ["init"], { cwd: repo });
    await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: repo });
    await execFileAsync("git", ["config", "user.name", "Test"], { cwd: repo });
    await execFileAsync("git", ["add", "."], { cwd: repo });
    await execFileAsync("git", ["commit", "-m", "init"], { cwd: repo });

    const lockPath = path.join(repo, "agents-skill-lock.json");
    await fs.writeFile(
      lockPath,
      JSON.stringify(
        {
          version: 3,
          skills: {
            "migrated-skill": {
              sourceType: "github",
              sourceUrl: repo,
              skillPath: "migrated-skill/SKILL.md"
            }
          }
        },
        null,
        2
      ),
      "utf8"
    );

    const result = await migrateAgentsSkills(tmpHub, { lockPath });
    expect(result.results[0]?.status).toBe("migrated");
    expect(await getAsset(tmpHub, "skills", "migrated-skill")).toMatchObject({ name: "migrated-skill" });
  });

  it("detects agents skills missing from the hub", async () => {
    const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-drift-fixture-"));
    const present = await writeFixtureSkill(fixtureRoot, "present-skill");
    await installSkill(tmpHub, { path: present });

    const lockPath = path.join(fixtureRoot, "agents-skill-lock.json");
    await fs.writeFile(
      lockPath,
      JSON.stringify(
        {
          version: 3,
          skills: {
            "present-skill": {
              sourceType: "github",
              sourceUrl: "https://example.com/present.git",
              skillPath: "present-skill/SKILL.md"
            },
            "missing-skill": {
              sourceType: "github",
              sourceUrl: "https://example.com/missing.git",
              skillPath: "missing-skill/SKILL.md"
            }
          }
        },
        null,
        2
      ),
      "utf8"
    );

    const drift = await getAgentsSkillsDrift(tmpHub, lockPath);
    expect(drift.lockPath).toBe(lockPath);
    expect(drift.missingCount).toBe(1);
    expect(drift.missingNames).toEqual(["missing-skill"]);
  });
});

describe("readSkillFile", () => {
  it("refuses symlinks that point outside the skill folder", async () => {
    const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-fixture-"));
    await installSkill(tmpHub, { path: await writeFixtureSkill(fixtureRoot, "linked-skill") });
    const secret = path.join(fixtureRoot, "secret.txt");
    await fs.writeFile(secret, "top secret\n", "utf8");
    // Simulates a link left behind by an older install.
    await fs.symlink(secret, path.join(tmpHub, "skills", "linked-skill", "leak.txt"));

    await expect(readSkillFile(tmpHub, "linked-skill", "leak.txt")).rejects.toThrow(/Unsafe skill file path/);
    await expect(readSkillFile(tmpHub, "linked-skill", "missing.txt")).rejects.toThrow(/not found/);
    expect((await readSkillFile(tmpHub, "linked-skill", "scripts/hello.sh")).content).toContain("echo hi");
  });
});
