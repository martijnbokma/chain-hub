import path from "node:path";
import { promises as fs } from "node:fs";

import { CORE_DIRS, LEGACY_INDEX_FILES, readMeta, resolveChainHome, writeMeta } from "./asset-paths.js";
import { seedLearningsRule, seedWelcomeSkill } from "./seed.js";
import { ensureDir } from "./shared.js";

export async function initializeHub(chainHomeInput?: string): Promise<{ chainHome: string; isFirstRun: boolean }> {
  const chainHome = resolveChainHome(chainHomeInput);

  await ensureDir(chainHome);

  for (const dirName of CORE_DIRS) {
    await ensureDir(path.join(chainHome, dirName));
  }

  const meta = await readMeta(chainHome);
  const isFirstRun = !meta.initializedAt;

  // Seed only on first init — otherwise deleting welcome is undone by every listAssets call.
  if (isFirstRun) {
    await seedWelcomeSkill(chainHome);
    await seedLearningsRule(chainHome);
    await writeMeta(chainHome, { initializedAt: new Date().toISOString() });
  }

  for (const fileName of LEGACY_INDEX_FILES) {
    await fs.rm(path.join(chainHome, "system", fileName), { force: true });
  }

  return { chainHome, isFirstRun };
}
