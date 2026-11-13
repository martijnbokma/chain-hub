import path from "node:path";
import { promises as fs } from "node:fs";

import type { ValidationResult } from "@chain-hub/contracts";

import { CORE_DIRS, resolveChainHome } from "./asset-paths.js";
import { listAssets } from "./assets.js";
import { initializeHub } from "./hub-init.js";
import { CORRUPT_ASSETS_LOCK_PREFIX } from "./install-lock.js";
import { CORRUPT_LOCK_PREFIX } from "./skills-lock.js";
import { pathExists } from "./shared.js";

export async function validateHub(chainHomeInput?: string): Promise<ValidationResult> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);
  const issues: string[] = [];
  const checks: ValidationResult["checks"] = [];

  for (const dirName of CORE_DIRS) {
    const dirPath = path.join(chainHome, dirName);
    const exists = await pathExists(dirPath);
    if (exists) {
      checks.push({
        id: `dir:${dirName}`,
        label: `Directory exists: ${dirName}`,
        status: "pass",
        detail: dirPath
      });
    } else {
      const detail = `Missing directory: ${dirName}`;
      issues.push(detail);
      checks.push({
        id: `dir:${dirName}`,
        label: `Directory exists: ${dirName}`,
        status: "fail",
        detail
      });
    }
  }

  const corruptLocks = (await fs.readdir(path.join(chainHome, "system")).catch(() => [] as string[])).filter(
    (name) => name.startsWith(CORRUPT_LOCK_PREFIX) || name.startsWith(CORRUPT_ASSETS_LOCK_PREFIX)
  );
  if (corruptLocks.length > 0) {
    const detail = `system/skills-lock.json could not be read and was moved to system/${corruptLocks.sort().at(-1)}; installed skills now show as local. Restore or delete that file.`;
    issues.push(detail);
    checks.push({ id: "skills-lock", label: "Skills lock is readable", status: "fail", detail });
  }

  const indexedAssets = await listAssets(chainHome);

  if (indexedAssets.length === 0) {
    const detail = "No assets indexed";
    issues.push(detail);
    checks.push({ id: "assets-indexed", label: "At least one asset indexed", status: "fail", detail });
  } else {
    checks.push({
      id: "assets-indexed",
      label: "At least one asset indexed",
      status: "pass",
      detail: `${indexedAssets.length} asset${indexedAssets.length === 1 ? "" : "s"} indexed`
    });
  }

  return {
    ok: issues.length === 0,
    issues,
    checks
  };
}
