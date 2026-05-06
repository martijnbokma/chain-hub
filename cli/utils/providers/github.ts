import { cpSync, existsSync, mkdirSync, rmSync } from "fs"
import { join, resolve, sep } from "path"

import { cleanupExtractedArchive, extractGithubTarToTemp } from "./github-tarball"

export type { DownloadOptions } from "./github-tarball"
export { downloadFromGithub } from "./github-tarball"

export interface DownloadSkillDirectoryOptions {
  owner: string
  repo: string
  /** Directory inside the repository root, e.g. core/skills/babysit */
  pathInRepo: string
  /** Directory name under destDir (registry slug) */
  slug: string
  destDir: string
}

/**
 * Copies a single skill directory from a GitHub repo tarball (full tree under pathInRepo),
 * matching registry `path` installs. Replaces destDir/slug entirely when present.
 */
export async function downloadSkillDirectoryFromGithub(opts: DownloadSkillDirectoryOptions): Promise<void> {
  const { owner, repo, pathInRepo, slug, destDir } = opts
  const { tmpTar, tmpDir, archiveRoot } = await extractGithubTarToTemp(owner, repo)
  try {
    const normalizedRepoPath = pathInRepo.replace(/^\/+/, "").replace(/\/+$/, "")
    const sourceDir = resolve(join(archiveRoot, normalizedRepoPath))
    const rootResolved = resolve(archiveRoot)
    if (!(sourceDir === rootResolved || sourceDir.startsWith(rootResolved + sep))) {
      throw new Error(`Refusing to install path outside archive: ${pathInRepo}`)
    }
    if (!existsSync(sourceDir)) {
      throw new Error(`Skill path not found in repository: ${pathInRepo}`)
    }
    if (!existsSync(join(sourceDir, "SKILL.md"))) {
      throw new Error(`SKILL.md missing under repository path: ${pathInRepo}`)
    }

    const dest = join(destDir, slug)
    if (existsSync(dest)) rmSync(dest, { recursive: true })
    mkdirSync(destDir, { recursive: true })
    cpSync(sourceDir, dest, { recursive: true })
  } finally {
    cleanupExtractedArchive(tmpTar, tmpDir)
  }
}
