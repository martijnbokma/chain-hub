import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// resolveGitSkillDir performs the shallow clone. Spying on it proves the update
// path answers from the cheap ls-remote probe when the remote did not move.
vi.mock("./skill-git.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("./skill-git.js")>();
  return { ...original, resolveGitSkillDir: vi.fn(original.resolveGitSkillDir) };
});

import { type AssetDetail } from "@chain-hub/contracts";

import { getAsset, initializeHub, installSkillFromSource, updateSkillsFromLock } from "./index.js";
import { resolveGitSkillDir } from "./skill-git.js";

const execFileAsync = promisify(execFile);
const readAsset = (home: string, kind: "skills", name: string): Promise<AssetDetail> => getAsset(home, kind, name);

const originalHome = process.env.HOME;
let tmpHome: string;
let tmpHub: string;

beforeEach(async () => {
  tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-home-"));
  tmpHub = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-hub-"));
  process.env.HOME = tmpHome;
  await initializeHub(tmpHub);
  vi.mocked(resolveGitSkillDir).mockClear();
});

afterEach(() => {
  process.env.HOME = originalHome;
});

async function initRepoWithSkill(skillName: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-repo-"));
  const skillRoot = path.join(repo, skillName);
  await fs.mkdir(skillRoot, { recursive: true });
  await fs.writeFile(
    path.join(skillRoot, "SKILL.md"),
    `---\nname: ${skillName}\ndescription: Fixture skill\n---\n\n# ${skillName}\n`,
    "utf8"
  );
  await execFileAsync("git", ["init"], { cwd: repo });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: repo });
  await execFileAsync("git", ["config", "user.name", "Test"], { cwd: repo });
  await execFileAsync("git", ["add", "."], { cwd: repo });
  await execFileAsync("git", ["commit", "-m", "init"], { cwd: repo });
  return repo;
}

describe("updateSkillsFromLock remote probe", () => {
  it("skips an unchanged git skill without cloning the repo", async () => {
    const repo = await initRepoWithSkill("probe-skill");
    await installSkillFromSource(tmpHub, { repo, subdir: "probe-skill" }, readAsset);
    vi.mocked(resolveGitSkillDir).mockClear();

    const result = await updateSkillsFromLock(tmpHub, { name: "probe-skill" }, readAsset);

    expect(result.results[0]?.status).toBe("skipped");
    expect(resolveGitSkillDir).not.toHaveBeenCalled();
  });

  it("still clones and updates when the remote moved", async () => {
    const repo = await initRepoWithSkill("moved-remote");
    await installSkillFromSource(tmpHub, { repo, subdir: "moved-remote" }, readAsset);
    vi.mocked(resolveGitSkillDir).mockClear();

    await fs.writeFile(path.join(repo, "moved-remote", "extra.txt"), "new\n", "utf8");
    await execFileAsync("git", ["add", "."], { cwd: repo });
    await execFileAsync("git", ["commit", "-m", "upstream update"], { cwd: repo });

    const result = await updateSkillsFromLock(tmpHub, { name: "moved-remote" }, readAsset);

    expect(result.results[0]?.status).toBe("updated");
    expect(resolveGitSkillDir).toHaveBeenCalledTimes(1);
  });

  it("bypasses the probe and reinstalls when force is set", async () => {
    const repo = await initRepoWithSkill("forced-skill");
    await installSkillFromSource(tmpHub, { repo, subdir: "forced-skill" }, readAsset);
    vi.mocked(resolveGitSkillDir).mockClear();

    const result = await updateSkillsFromLock(tmpHub, { name: "forced-skill", force: true }, readAsset);

    expect(result.results[0]?.status).toBe("updated");
    expect(resolveGitSkillDir).toHaveBeenCalledTimes(1);
  });
});
