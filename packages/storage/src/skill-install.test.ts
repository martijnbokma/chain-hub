import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type AssetDetail, hasSkillUpdate, isUpstreamOwnedSkill } from "@chain-hub/contracts";

import {
  checkSkillUpdatesFromLock,
  deleteAsset,
  detectAgentsSkillsDrift,
  forkSkillFromHub,
  getAsset,
  initializeHub,
  installSkillFromBundle,
  installSkillFromSource,
  listAssets,
  listHubIssues,
  listSkillUpstreamDirs,
  migrateAgentsSkillLock,
  projectSkillSidecars,
  readSkillFile,
  readSkillsLock,
  relinkSkill,
  unlinkSkill,
  updateAsset,
  updateSkillsFromLock,
  validateHub
} from "./index.js";

// Every test runs against an initialized tmpHub (see beforeEach), so these call the
// skill-install functions directly with the hub's own asset reader.
const readAsset = (home: string, kind: "skills", name: string): Promise<AssetDetail> => getAsset(home, kind, name);
const installSkill = (hub: string, input: Parameters<typeof installSkillFromSource>[1]) =>
  installSkillFromSource(hub, input, readAsset);
const installSkillBundle = (hub: string, input: Parameters<typeof installSkillFromBundle>[1]) =>
  installSkillFromBundle(hub, input, readAsset);
const updateSkills = (hub: string, input: Parameters<typeof updateSkillsFromLock>[1] = {}) =>
  updateSkillsFromLock(hub, input, readAsset);
const checkSkillUpdates = (hub: string, input: Parameters<typeof checkSkillUpdatesFromLock>[1] = {}) =>
  checkSkillUpdatesFromLock(hub, input);
const migrateAgentsSkills = (hub: string, input: Parameters<typeof migrateAgentsSkillLock>[1] = {}) =>
  migrateAgentsSkillLock(hub, input, readAsset);
const getAgentsSkillsDrift = (hub: string, lockPath?: string) => detectAgentsSkillsDrift(hub, lockPath);
const forkSkill = (hub: string, input: Parameters<typeof forkSkillFromHub>[1]) => forkSkillFromHub(hub, input, readAsset);

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

    const lock = JSON.parse(await fs.readFile(path.join(tmpHub, "system", "assets-lock.json"), "utf8")) as {
      entries: Record<string, { sourceType: string }>;
    };
    expect(lock.entries["skills/demo-skill"]?.sourceType).toBe("path");
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

  it("auto-discovers nested skill in git repo when subdir is omitted", async () => {
    const repo = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-repo-"));
    const nestedDir = path.join(repo, "plugin", "skills");
    await fs.mkdir(nestedDir, { recursive: true });
    await writeFixtureSkill(nestedDir, "nested-auto");
    await execFileAsync("git", ["init"], { cwd: repo });
    await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: repo });
    await execFileAsync("git", ["config", "user.name", "Test"], { cwd: repo });
    await execFileAsync("git", ["add", "."], { cwd: repo });
    await execFileAsync("git", ["commit", "-m", "init"], { cwd: repo });

    const result = await installSkill(tmpHub, { repo, name: "nested-auto" });
    expect(result.asset.name).toBe("nested-auto");
    expect(result.lockEntry.subdir).toBe("plugin/skills/nested-auto");
  });

  it("forgets the lock entry when a skill is deleted, so update does not bring it back", async () => {
    const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-fixture-"));
    await installSkill(tmpHub, { path: await writeFixtureSkill(fixtureRoot, "gone-skill") });

    await deleteAsset(tmpHub, "skills", "gone-skill");

    const lock = JSON.parse(await fs.readFile(path.join(tmpHub, "system", "assets-lock.json"), "utf8")) as {
      entries: Record<string, unknown>;
    };
    expect(lock.entries["skills/gone-skill"]).toBeUndefined();
    const updated = await updateSkills(tmpHub, { force: true });
    expect(updated.results.find((item) => item.name === "gone-skill")).toBeUndefined();
    await expect(fs.access(path.join(tmpHub, "skills", "gone-skill"))).rejects.toThrow();
  });

  it("updates a path skill when only a sidecar file changed", async () => {
    const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-fixture-"));
    const source = await writeFixtureSkill(fixtureRoot, "sidecar-skill");
    await installSkill(tmpHub, { path: source });

    expect((await updateSkills(tmpHub, { name: "sidecar-skill" })).results[0]?.status).toBe("skipped");

    await fs.writeFile(path.join(source, "scripts", "hello.sh"), "#!/bin/sh\necho changed\n", "utf8");
    expect((await updateSkills(tmpHub, { name: "sidecar-skill" })).results[0]?.status).toBe("updated");
    expect(await fs.readFile(path.join(tmpHub, "skills", "sidecar-skill", "scripts", "hello.sh"), "utf8")).toContain(
      "echo changed"
    );
  });

  it("skips a git skill whose repo did not change", async () => {
    const repo = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-repo-"));
    await writeFixtureSkill(repo, "stable-git");
    await execFileAsync("git", ["init"], { cwd: repo });
    await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: repo });
    await execFileAsync("git", ["config", "user.name", "Test"], { cwd: repo });
    await execFileAsync("git", ["add", "."], { cwd: repo });
    await execFileAsync("git", ["commit", "-m", "init"], { cwd: repo });
    await installSkill(tmpHub, { repo, subdir: "stable-git" });

    expect((await updateSkills(tmpHub, { name: "stable-git" })).results[0]?.status).toBe("skipped");
    expect((await updateSkills(tmpHub, { name: "stable-git", force: true })).results[0]?.status).toBe("updated");
  });

  it("checks for updates against git remote without cloning full repository", async () => {
    const repo = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-repo-"));
    await writeFixtureSkill(repo, "git-check-skill");
    await execFileAsync("git", ["init"], { cwd: repo });
    await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: repo });
    await execFileAsync("git", ["config", "user.name", "Test"], { cwd: repo });
    await execFileAsync("git", ["add", "."], { cwd: repo });
    await execFileAsync("git", ["commit", "-m", "init"], { cwd: repo });
    await installSkill(tmpHub, { repo, subdir: "git-check-skill" });

    // Initial check should be up_to_date
    const check1 = await checkSkillUpdates(tmpHub);
    const item1 = check1.results.find((r) => r.name === "git-check-skill");
    expect(item1?.status).toBe("up_to_date");
    expect(item1?.currentSha).toBeTruthy();
    expect(item1?.latestSha).toBe(item1?.currentSha);

    // Commit a change to the upstream repo
    await fs.writeFile(path.join(repo, "git-check-skill", "extra.txt"), "new content\n", "utf8");
    await execFileAsync("git", ["add", "."], { cwd: repo });
    await execFileAsync("git", ["commit", "-m", "upstream update"], { cwd: repo });

    // Check should now detect update_available with the new SHA
    const check2 = await checkSkillUpdates(tmpHub, { force: true });
    const item2 = check2.results.find((r) => r.name === "git-check-skill");
    expect(item2?.status).toBe("update_available");
    expect(item2?.latestSha).not.toBe(item2?.currentSha);

    // After updating, check is back to up_to_date
    const updateResult = await updateSkills(tmpHub, { name: "git-check-skill" });
    const updatedItem = updateResult.results.find((r) => r.name === "git-check-skill");
    expect(updatedItem?.status).toBe("updated");
    expect(updatedItem?.previousCommitSha).toBeTruthy();
    expect(updatedItem?.previousCommitSha).not.toBe(updatedItem?.lockEntry?.commitSha);
    const check3 = await checkSkillUpdates(tmpHub);
    const item3 = check3.results.find((r) => r.name === "git-check-skill");
    expect(item3?.status).toBe("up_to_date");
  });

  it("persists latestSha in the lock and reuses it inside the check TTL", async () => {
    const repo = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-repo-"));
    await writeFixtureSkill(repo, "ttl-skill");
    await execFileAsync("git", ["init"], { cwd: repo });
    await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: repo });
    await execFileAsync("git", ["config", "user.name", "Test"], { cwd: repo });
    await execFileAsync("git", ["add", "."], { cwd: repo });
    await execFileAsync("git", ["commit", "-m", "init"], { cwd: repo });
    await installSkill(tmpHub, { repo, subdir: "ttl-skill" });

    // Upstream moves on; a forced live check records the remote sha in the lock.
    await fs.writeFile(path.join(repo, "ttl-skill", "extra.txt"), "new\n", "utf8");
    await execFileAsync("git", ["add", "."], { cwd: repo });
    await execFileAsync("git", ["commit", "-m", "upstream update"], { cwd: repo });

    const check = await checkSkillUpdates(tmpHub, { force: true });
    const item = check.results.find((r) => r.name === "ttl-skill");
    expect(item?.status).toBe("update_available");

    const entry = (await readSkillsLock(tmpHub)).skills["ttl-skill"];
    expect(entry?.latestSha).toBe(item?.latestSha);
    expect(hasSkillUpdate(entry)).toBe(true);

    // Within the TTL the stored probe answers even when the remote is gone…
    await fs.rm(repo, { recursive: true, force: true });
    const cached = await checkSkillUpdates(tmpHub);
    expect(cached.results.find((r) => r.name === "ttl-skill")?.status).toBe("update_available");

    // …but force re-probes and surfaces the failure.
    const forced = await checkSkillUpdates(tmpHub, { force: true });
    expect(forced.results.find((r) => r.name === "ttl-skill")?.status).toBe("failed");
  });

  it("keeps every lock entry when skills are installed in parallel", async () => {
    const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-fixture-"));
    const names = ["par-a", "par-b", "par-c", "par-d", "par-e"];
    const sources = await Promise.all(names.map((name) => writeFixtureSkill(fixtureRoot, name)));

    await Promise.all(sources.map((source) => installSkill(tmpHub, { path: source })));

    const lock = JSON.parse(await fs.readFile(path.join(tmpHub, "system", "assets-lock.json"), "utf8")) as {
      entries: Record<string, unknown>;
    };
    expect(Object.keys(lock.entries).sort()).toEqual(expect.arrayContaining(names.map((name) => `skills/${name}`)));
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

    const lock = JSON.parse(await fs.readFile(path.join(tmpHub, "system", "assets-lock.json"), "utf8")) as {
      entries: Record<string, unknown>;
    };
    expect(lock.entries["skills/upstream-skill"]).toBeTruthy();
    expect(lock.entries["skills/upstream-skill-local"]).toBeUndefined();
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

describe("hub issues and error recovery", () => {
  it("skips uploaded skills on update instead of reporting them failed", async () => {
    const skillMd = "---\nname: uploaded-skill\n---\n\n# Uploaded\n";
    await installSkillBundle(tmpHub, {
      name: "uploaded-skill",
      files: [{ path: "SKILL.md", contentBase64: Buffer.from(skillMd, "utf8").toString("base64") }]
    });

    const result = await updateSkills(tmpHub, { name: "uploaded-skill" });
    expect(result.results[0]?.status).toBe("skipped");
    expect(result.results[0]?.error).toBeUndefined();
  });

  it("persists an update failure on the lock entry and clears it on success", async () => {
    const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-fixture-"));
    const source = await writeFixtureSkill(fixtureRoot, "vanishing-skill");
    await installSkill(tmpHub, { path: source });
    await fs.rm(source, { recursive: true, force: true });

    const failed = await updateSkills(tmpHub, { name: "vanishing-skill" });
    expect(failed.results[0]?.status).toBe("failed");
    expect((await readSkillsLock(tmpHub)).skills["vanishing-skill"]?.lastUpdateError).toContain(
      "missing SKILL.md"
    );

    await writeFixtureSkill(fixtureRoot, "vanishing-skill");
    const retried = await updateSkills(tmpHub, { name: "vanishing-skill", force: true });
    expect(retried.results[0]?.status).toBe("updated");
    expect((await readSkillsLock(tmpHub)).skills["vanishing-skill"]?.lastUpdateError).toBeNull();
  });

  it("fails the update check for a vanished path source and persists the error", async () => {
    const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-fixture-"));
    const source = await writeFixtureSkill(fixtureRoot, "path-check-skill");
    await installSkill(tmpHub, { path: source });
    await fs.rm(source, { recursive: true, force: true });

    const check = await checkSkillUpdates(tmpHub, { name: "path-check-skill", force: true });
    expect(check.results.find((item) => item.name === "path-check-skill")?.status).toBe("failed");
    expect((await readSkillsLock(tmpHub)).skills["path-check-skill"]?.lastCheckError).toContain(
      "missing SKILL.md"
    );

    await writeFixtureSkill(fixtureRoot, "path-check-skill");
    const recovered = await checkSkillUpdates(tmpHub, { name: "path-check-skill", force: true });
    expect(recovered.results.find((item) => item.name === "path-check-skill")?.status).toBe("up_to_date");
    expect((await readSkillsLock(tmpHub)).skills["path-check-skill"]?.lastCheckError).toBeNull();
  });

  it("restricts the update check to one skill when a name is given", async () => {
    const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-fixture-"));
    await installSkill(tmpHub, { path: await writeFixtureSkill(fixtureRoot, "scoped-a") });
    await installSkill(tmpHub, { path: await writeFixtureSkill(fixtureRoot, "scoped-b") });

    const check = await checkSkillUpdates(tmpHub, { name: "scoped-a" });
    expect(check.results.map((item) => item.name)).toEqual(["scoped-a"]);
  });

  it("reports a persisted check failure inside the TTL without re-probing", async () => {
    const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-fixture-"));
    const source = await writeFixtureSkill(fixtureRoot, "cached-fail");
    await installSkill(tmpHub, { path: source });
    await fs.rm(source, { recursive: true, force: true });
    await checkSkillUpdates(tmpHub, { name: "cached-fail", force: true });

    const cached = await checkSkillUpdates(tmpHub, { name: "cached-fail" });
    const item = cached.results.find((entry) => entry.name === "cached-fail");
    expect(item?.status).toBe("failed");
    expect(item?.error).toContain("missing SKILL.md");
  });

  it("relinks a git skill to a moved upstream subdir", async () => {
    const repo = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-repo-"));
    await writeFixtureSkill(repo, "moved-skill");
    await execFileAsync("git", ["init"], { cwd: repo });
    await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: repo });
    await execFileAsync("git", ["config", "user.name", "Test"], { cwd: repo });
    await execFileAsync("git", ["add", "."], { cwd: repo });
    await execFileAsync("git", ["commit", "-m", "init"], { cwd: repo });
    await installSkill(tmpHub, { repo, subdir: "moved-skill" });

    // Upstream renames the skill folder; the recorded subdir goes stale and no
    // name-hint fallback can find it, so the update run fails.
    await fs.mkdir(path.join(repo, "skills"), { recursive: true });
    await fs.rename(path.join(repo, "moved-skill"), path.join(repo, "skills", "renamed-skill"));
    await execFileAsync("git", ["add", "-A"], { cwd: repo });
    await execFileAsync("git", ["commit", "-m", "move skill"], { cwd: repo });

    const update = await updateSkills(tmpHub, { name: "moved-skill", force: true });
    expect(update.results[0]?.status).toBe("failed");

    const dirs = await listSkillUpstreamDirs(tmpHub, "moved-skill");
    expect(dirs.dirs).toEqual(["skills/renamed-skill"]);

    const relinked = await relinkSkill(tmpHub, { name: "moved-skill", subdir: "skills/renamed-skill" }, readAsset);
    expect(relinked.lockEntry.subdir).toBe("skills/renamed-skill");
    expect((await readSkillsLock(tmpHub)).skills["moved-skill"]?.lastUpdateError).toBeNull();
  });

  it("unlinks a skill: keeps provenance marked detached, editable, out of update/check", async () => {
    const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-fixture-"));
    await installSkill(tmpHub, { path: await writeFixtureSkill(fixtureRoot, "unlinked-skill") });
    await fs.rm(path.join(fixtureRoot, "unlinked-skill"), { recursive: true, force: true });
    await updateSkills(tmpHub, { name: "unlinked-skill" }); // fails → lastUpdateError set

    await unlinkSkill(tmpHub, "unlinked-skill", "source-missing");

    const asset = await getAsset(tmpHub, "skills", "unlinked-skill");
    expect(asset.provenance?.unlinkedAt).toBeTruthy();
    expect(asset.provenance?.unlinkedReason).toBe("source-missing");
    expect(asset.provenance?.lastUpdateError).toBeNull();
    expect(isUpstreamOwnedSkill(asset.provenance)).toBe(false);

    // Editable like a local skill, skipped by update and check.
    await updateAsset(tmpHub, "skills", "unlinked-skill", "# local edit\n");
    const update = await updateSkills(tmpHub, { force: true });
    expect(update.results.find((item) => item.name === "unlinked-skill")?.status).toBe("skipped");
    const check = await checkSkillUpdates(tmpHub, { force: true });
    expect(check.results.find((item) => item.name === "unlinked-skill")?.status).toBe("not_applicable");

    const { issues } = await listHubIssues(tmpHub);
    expect(issues.find((issue) => issue.assetName === "unlinked-skill")).toBeUndefined();
  });

  it("re-tracks a previously unlinked skill when it is reinstalled", async () => {
    const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-fixture-"));
    const source = await writeFixtureSkill(fixtureRoot, "retracked-skill");
    await installSkill(tmpHub, { path: source });
    await unlinkSkill(tmpHub, "retracked-skill");

    await installSkill(tmpHub, { path: source, force: true });

    const entry = (await readSkillsLock(tmpHub)).skills["retracked-skill"];
    expect(entry?.unlinkedAt).toBeNull();
    expect(entry?.unlinkedReason).toBeNull();
  });

  it("collects lock errors and compat findings as hub issues", async () => {
    const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-fixture-"));
    const source = await writeFixtureSkill(fixtureRoot, "issue-skill");
    await installSkill(tmpHub, { path: source });
    // Written directly: createAsset would inject frontmatter that has a description.
    await fs.mkdir(path.join(tmpHub, "skills", "bare-skill"), { recursive: true });
    await fs.writeFile(path.join(tmpHub, "skills", "bare-skill", "SKILL.md"), "# No frontmatter\n", "utf8");
    await fs.rm(source, { recursive: true, force: true });
    await checkSkillUpdates(tmpHub, { name: "issue-skill", force: true });

    const { issues } = await listHubIssues(tmpHub);

    const checkIssue = issues.find((issue) => issue.id === "skill-check:issue-skill");
    expect(checkIssue?.severity).toBe("error");
    expect(checkIssue?.actions).toEqual(expect.arrayContaining(["retry-check", "open-asset", "unlink"]));
    expect(checkIssue?.actions).not.toContain("relink");

    const compatIssue = issues.find((issue) => issue.id === "compat:skills/bare-skill:missing_description");
    expect(compatIssue?.severity).toBe("error");
    expect(compatIssue?.actions).toEqual(["open-asset"]);
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

describe("projectSkillSidecars", () => {
  it("removes sidecars dropped from the hub skill but keeps files the user added", async () => {
    const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-fixture-"));
    await installSkill(tmpHub, { path: await writeFixtureSkill(fixtureRoot, "sidecar-sync") });
    await fs.mkdir(path.join(tmpHub, "skills", "sidecar-sync", "references"), { recursive: true });
    await fs.writeFile(path.join(tmpHub, "skills", "sidecar-sync", "references", "guide.md"), "guide\n", "utf8");

    const editorDir = path.join(tmpHome, ".claude", "skills", "sidecar-sync");
    await projectSkillSidecars(tmpHub, editorDir, "sidecar-sync");
    await fs.writeFile(path.join(editorDir, "my-notes.md"), "mine\n", "utf8");
    expect((await fs.readdir(editorDir)).sort()).toEqual([".chain-hub-sidecars.json", "my-notes.md", "references", "scripts"]);

    await fs.rm(path.join(tmpHub, "skills", "sidecar-sync", "references"), { recursive: true });
    await projectSkillSidecars(tmpHub, editorDir, "sidecar-sync");

    expect((await fs.readdir(editorDir)).sort()).toEqual([".chain-hub-sidecars.json", "my-notes.md", "scripts"]);
  });
});

describe("readSkillsLock", () => {
  it("sets an unreadable lock aside instead of overwriting it, and validate reports it", async () => {
    const lockPath = path.join(tmpHub, "system", "skills-lock.json");
    await fs.writeFile(lockPath, "{ not json", "utf8");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-fixture-"));
    await installSkill(tmpHub, { path: await writeFixtureSkill(fixtureRoot, "after-corrupt") });

    const systemFiles = await fs.readdir(path.join(tmpHub, "system"));
    const corrupt = systemFiles.find((name) => name.startsWith("skills-lock.json.corrupt-"));
    expect(corrupt).toBeDefined();
    expect(await fs.readFile(path.join(tmpHub, "system", corrupt!), "utf8")).toBe("{ not json");
    expect(warn).toHaveBeenCalled();

    const validation = await validateHub(tmpHub);
    expect(validation.ok).toBe(false);
    expect(validation.checks.find((check) => check.id === "skills-lock")?.status).toBe("fail");
    warn.mockRestore();
  });

  it("keeps a lock whose entries have extra or missing optional fields", async () => {
    const lockPath = path.join(tmpHub, "system", "skills-lock.json");
    const lock = { version: 1, skills: { old: { sourceType: "git", source: "https://example.com/x.git", subdir: null, installedAt: "2025-01-01", updatedAt: "2025-01-01", extra: true } } };
    await fs.writeFile(lockPath, JSON.stringify(lock), "utf8");

    expect((await readSkillsLock(tmpHub)).skills.old?.source).toBe("https://example.com/x.git");
    expect((await fs.readdir(path.join(tmpHub, "system"))).some((name) => name.includes("corrupt"))).toBe(false);
  });
});
