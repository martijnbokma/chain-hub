import { spawnSync } from "child_process"
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "fs"
import { writeFile } from "fs/promises"
import { basename, dirname, join } from "path"
import { tmpdir } from "os"

export interface DownloadOptions {
  owner: string
  repo: string
  specificSkill?: string
  destDir: string
}

export function findSingleArchiveRoot(extractDir: string): string {
  const entries = readdirSync(extractDir, { withFileTypes: true })
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => join(extractDir, e.name))
  if (dirs.length !== 1) {
    throw new Error(`Expected one top-level directory in GitHub archive, found ${dirs.length}`)
  }
  return dirs[0]!
}

export async function extractGithubTarToTemp(owner: string, repo: string): Promise<{
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

export function cleanupExtractedArchive(tmpTar: string, tmpDir: string): void {
  rmSync(tmpTar, { force: true })
  rmSync(tmpDir, { recursive: true, force: true })
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
