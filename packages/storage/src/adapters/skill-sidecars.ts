import path from "node:path";
import { promises as fs } from "node:fs";

import { pathExists } from "../shared.js";
import { SIDECAR_MANIFEST, SKIPPED_SKILL_ENTRIES } from "../skill-copy.js";

// Projects a hub skill's sidecar files (scripts/, references/, …) into editor skill folders.

async function resolveEditorSkillDir(editorSkillDir: string): Promise<string> {
  if (!(await pathExists(editorSkillDir))) {
    return editorSkillDir;
  }

  try {
    return await fs.realpath(editorSkillDir);
  } catch {
    return editorSkillDir;
  }
}

async function copySidecarEntry(from: string, to: string): Promise<void> {
  await fs.rm(to, { recursive: true, force: true });

  try {
    await fs.cp(from, to, { recursive: true });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code !== "EEXIST") {
      throw error;
    }

    await fs.rm(to, { recursive: true, force: true });
    await fs.cp(from, to, { recursive: true });
  }
}

async function readSidecarManifest(editorSkillDir: string): Promise<string[]> {
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(path.join(editorSkillDir, SIDECAR_MANIFEST), "utf8"));
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Copies a hub skill's sidecar files into an editor skill folder and removes the ones
 * Chain Hub projected earlier that the hub skill no longer has. Only entries listed in
 * the folder's manifest are ever removed, so files a user added there are left alone.
 */
export async function projectSkillSidecars(chainHome: string, editorSkillDir: string, name: string): Promise<void> {
  const sourceDir = path.join(chainHome, "skills", name);

  if (!(await pathExists(sourceDir))) {
    return;
  }

  const resolvedEditorSkillDir = await resolveEditorSkillDir(editorSkillDir);
  await fs.mkdir(resolvedEditorSkillDir, { recursive: true });

  const projected: string[] = [];
  for (const entry of await fs.readdir(sourceDir, { withFileTypes: true })) {
    if (entry.name === "SKILL.md" || entry.name === "skill.md" || SKIPPED_SKILL_ENTRIES.has(entry.name)) {
      continue;
    }

    await copySidecarEntry(path.join(sourceDir, entry.name), path.join(resolvedEditorSkillDir, entry.name));
    projected.push(entry.name);
  }

  for (const stale of await readSidecarManifest(resolvedEditorSkillDir)) {
    const isPlainName = stale.length > 0 && stale !== "." && stale !== ".." && !/[\\/]/.test(stale);
    if (isPlainName && !projected.includes(stale)) {
      await fs.rm(path.join(resolvedEditorSkillDir, stale), { recursive: true, force: true });
    }
  }

  const manifestPath = path.join(resolvedEditorSkillDir, SIDECAR_MANIFEST);
  if (projected.length > 0) {
    await fs.writeFile(manifestPath, `${JSON.stringify(projected.sort(), null, 2)}\n`, "utf8");
  } else {
    await fs.rm(manifestPath, { force: true });
  }
}

export async function removeEditorSkillDirectory(editorSkillDir: string): Promise<void> {
  await fs.rm(editorSkillDir, { recursive: true, force: true });
}
