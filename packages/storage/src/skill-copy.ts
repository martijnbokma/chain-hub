import path from "node:path";
import { promises as fs } from "node:fs";

// Safe copying of skill folders from untrusted sources into the hub.

/** Lists the sidecar entries Chain Hub projected into an editor skill folder. */
export const SIDECAR_MANIFEST = ".chain-hub-sidecars.json";

/** Version-control folders never belong in an installed skill (or in every editor it is projected to). */
export const SKIPPED_SKILL_ENTRIES = new Set([".git", ".hg", ".svn", SIDECAR_MANIFEST]);

function isInside(parent: string, target: string): boolean {
  return target === parent || target.startsWith(parent + path.sep);
}

/**
 * Copy filter for untrusted skill sources. Symlinks are only followed when they point
 * to a regular file inside the skill folder; anything else (links to ~/.ssh, /etc,
 * directories that could loop) is skipped so it cannot leak into the hub or editors.
 */
export async function createSkillCopyFilter(sourceDir: string): Promise<(source: string) => Promise<boolean>> {
  const realRoot = await fs.realpath(sourceDir);

  return async (source: string) => {
    if (SKIPPED_SKILL_ENTRIES.has(path.basename(source))) {
      return false;
    }

    const stats = await fs.lstat(source);
    if (!stats.isSymbolicLink()) {
      return true;
    }

    try {
      const target = await fs.realpath(source);
      if (isInside(realRoot, target) && (await fs.stat(target)).isFile()) {
        return true;
      }
    } catch {
      // Dangling link.
    }

    console.warn(`[chain-hub] skipping symlink in skill source: ${source}`);
    return false;
  };
}

/** Copies a skill folder's files other than SKILL.md (scripts/, references/, …) with the same safety filter as installs. */
export async function copySkillSidecars(sourceDir: string, destinationDir: string): Promise<void> {
  const filter = await createSkillCopyFilter(sourceDir);
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === "SKILL.md" || entry.name === "skill.md") {
      continue;
    }

    const from = path.join(sourceDir, entry.name);
    if (!(await filter(from))) {
      continue;
    }

    await fs.cp(from, path.join(destinationDir, entry.name), { recursive: true, dereference: true, filter });
  }
}

/** Copies into a staging sibling first so a failed copy never destroys the installed skill. */
export async function copySkillTree(sourceDir: string, destinationDir: string): Promise<void> {
  await fs.mkdir(path.dirname(destinationDir), { recursive: true });
  const stagingDir = `${destinationDir}.staging-${process.pid}-${Date.now()}`;

  try {
    await fs.cp(sourceDir, stagingDir, {
      recursive: true,
      dereference: true,
      filter: await createSkillCopyFilter(sourceDir)
    });
    await fs.rm(destinationDir, { recursive: true, force: true });
    await fs.rename(stagingDir, destinationDir);
  } finally {
    await fs.rm(stagingDir, { recursive: true, force: true });
  }
}
