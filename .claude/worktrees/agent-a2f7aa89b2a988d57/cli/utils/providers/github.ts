import { spawnSync } from "child_process"
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "fs"
import { writeFile } from "fs/promises"
import { basename, dirname, join, resolve, sep } from "path"
import { tmpdir } from "os"

export interface DownloadOptions {
  owner: string
  repo: string
  specificSkill?: string
  destDir: string
}

export interface DownloadSkillDirectoryOptions {
  owner: string
  repo: string
  /** Directory inside the repository root, e.g. core/skills/babysit */
  pathInRepo: string
  /** Directory name under destDir (registry slug) */
  slug: string
  destDir: string
}

function findSingleArchiveRoot(extractDir: string): string {
  const entries = readdirSync(extractDir, { withFileTypes: true })
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => join(extractDir, e.name))
  if (dirs.length !== 1) {
    throw new Error(`Expected one top-level directory in GitHub archive, found ${dirs.length}`)
  }
  return dirs[0]!
}

async function extractGithubTarToTemp(owner: string, repo: string): Promise<{
  tmpTar: string
  tmpDir: string
  archiveRoot: string
}> {
  const archiveUrl = `https://codeload.github.com/${owner}/${repo}/tar.gz/HEAD`
  const res = await fetch(archiveUrl)
  if (!res.ok) {
    throw new Error(`Failed to download from GitHub: ${res.status}`)
  }

  const tmpTar = join(tmpdir(), `chain-${repo}-${Date.now()}.tar.gz`)
  const tmpDir = `${tmpTar}-extracted`
  await writeFile(tmpTar, Buffer.from(await res.arrayBuffer()))

  mkdirSync(tmpDir, { recursive: true })
  const extract = spawnSync("tar", ["-xzf", tmpTar, "-C", tmpDir])
  if (extract.status !== 0) {
    rmSync(tmpTar, { force: true })
    rmSync(tmpDir, { recursive: true, force: true })
    throw new Error(`Failed to extract GitHub archive: ${extract.stderr.toString().trim()}`)
  }

  const archiveRoot = findSingleArchiveRoot(tmpDir)
  return { tmpTar, tmpDir, archiveRoot }
}

function cleanupExtractedArchive(tmpTar: string, tmpDir: string): void {
  rmSync(tmpTar, { force: true })
  rmSync(tmpDir, { recursive: true, force: true })
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

export async function downloadFromGithub(opts: DownloadOptions): Promise<string[]> {
  const { owner, repo, specificSkill, destDir } = opts
  const { tmpTar, tmpDir, archiveRoot } = await extractGithubTarToTemp(owner, repo)
  const installedSkills: string[] = []

  try {
    const extracted = findSkillFiles(archiveRoot)
    for (const skillFile of extracted) {
      if (!skillFile) continue
      const skillSourceDir = dirname(skillFile)
      const skillName = basename(skillSourceDir)

      if (specificSkill && skillName !== specificSkill) continue

      const dest = join(destDir, skillName)
      if (existsSync(dest)) rmSync(dest, { recursive: true })
      cpSync(skillSourceDir, dest, { recursive: true })
      installedSkills.push(skillName)
    }
  } finally {
    cleanupExtractedArchive(tmpTar, tmpDir)
  }

  return installedSkills
}

function findSkillFiles(rootDir: string): string[] {
  const files: string[] = []

  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    const entryPath = join(rootDir, entry.name)
    if (entry.isDirectory()) {
      files.push(...findSkillFiles(entryPath))
      continue
    }

    if (entry.isFile() && entry.name === "SKILL.md") {
      files.push(entryPath)
    }
  }

  return files
}
