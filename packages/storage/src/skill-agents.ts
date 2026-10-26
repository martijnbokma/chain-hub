import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  type AgentsSkillsDrift,
  type MigrateAgentsSkillsInput,
  type MigrateAgentsSkillsResult,
  normalizeSkillName,
  NotFoundError,
  type SkillBatchItemResult,
  subdirFromSkillPath
} from "@chain-hub/contracts";

import { pathExists } from "./shared.js";
import { installSkillFromSource } from "./skill-install.js";
import { type ReadAsset, skillFile } from "./skills-lock.js";

interface AgentsLockEntry {
  sourceType?: string;
  sourceUrl?: string;
  skillPath?: string;
  source?: string;
}

interface AgentsLockFile {
  version?: number;
  skills?: Record<string, AgentsLockEntry>;
}

function defaultAgentsLockPath(): string {
  return path.join(os.homedir(), ".agents", ".skill-lock.json");
}

export async function detectAgentsSkillsDrift(
  chainHome: string,
  lockPathInput?: string
): Promise<AgentsSkillsDrift> {
  const lockPath = path.resolve(lockPathInput ?? defaultAgentsLockPath());

  if (!(await pathExists(lockPath))) {
    return { lockPath: null, missingNames: [], missingCount: 0 };
  }

  let parsed: AgentsLockFile;
  try {
    const raw = await fs.readFile(lockPath, "utf8");
    parsed = JSON.parse(raw) as AgentsLockFile;
  } catch {
    return { lockPath, missingNames: [], missingCount: 0 };
  }

  const missingNames: string[] = [];
  for (const rawName of Object.keys(parsed.skills ?? {})) {
    const name = normalizeSkillName(rawName);
    if (!(await pathExists(skillFile(chainHome, name)))) {
      missingNames.push(name);
    }
  }

  missingNames.sort();
  return { lockPath, missingNames, missingCount: missingNames.length };
}

export async function migrateAgentsSkillLock(
  chainHome: string,
  input: MigrateAgentsSkillsInput,
  readAsset: ReadAsset
): Promise<MigrateAgentsSkillsResult> {
  const lockPath = path.resolve(input.lockPath ?? defaultAgentsLockPath());

  if (!(await pathExists(lockPath))) {
    throw new NotFoundError(`Agents skill lock not found: ${lockPath}`);
  }

  const raw = await fs.readFile(lockPath, "utf8");
  const parsed = JSON.parse(raw) as AgentsLockFile;
  const entries = parsed.skills ?? {};
  const results: SkillBatchItemResult[] = [];

  for (const [rawName, entry] of Object.entries(entries)) {
    const name = normalizeSkillName(rawName);
    const repo = entry.sourceUrl ?? (entry.source?.includes("://") ? entry.source : undefined);

    if (!repo) {
      results.push({
        name,
        status: "failed",
        error: "Lock entry has no sourceUrl (or git source)"
      });
      continue;
    }

    const hubSkillExists = await pathExists(skillFile(chainHome, name));
    if (hubSkillExists && !input.force) {
      results.push({ name, status: "skipped" });
      continue;
    }

    try {
      const installed = await installSkillFromSource(
        chainHome,
        {
          repo,
          subdir: subdirFromSkillPath(entry.skillPath),
          name,
          force: Boolean(input.force) || hubSkillExists
        },
        readAsset
      );
      results.push({ name, status: "migrated", lockEntry: installed.lockEntry });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ name, status: "failed", error: message });
    }
  }

  return { lockPath, results };
}
