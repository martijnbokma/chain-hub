import { spawnSync } from "child_process"
import { cpSync, existsSync, readdirSync, rmSync } from "fs"
import { writeFile } from "fs/promises"
import { basename, dirname, join } from "path"
import { tmpdir } from "os"

export interface DownloadOptions {
  owner: string
  repo: string
  specificSkill?: string
  destDir: string
}

export async function downloadFromGithub(opts: DownloadOptions): Promise<string[]> {
  const { owner, repo, specificSkill, destDir } = opts
  // HEAD resolves to the default branch (main, master, or any other)
  const archiveUrl = `https://codeload.github.com/${owner}/${repo}/tar.gz/HEAD`

  const res = await fetch(archiveUrl)
  if (!res.ok) {
    throw new Error(`Failed to download from GitHub: ${res.status}`)
  }

  const tmpTar = join(tmpdir(), `chain-${repo}-${Date.now()}.tar.gz`)
  const tmpDir = `${tmpTar}-extracted`
  await writeFile(tmpTar, Buffer.from(await res.arrayBuffer()))

  const extract = spawnSync("tar", ["-xzf", tmpTar, "-C", tmpdir(), "--one-top-level=" + basename(tmpDir)])
  if (extract.status !== 0) {
    throw new Error(`Failed to extract GitHub archive: ${extract.stderr.toString().trim()}`)
  }

  const extracted = findSkillFiles(tmpDir)
  const installedSkills: string[] = []

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

  // Cleanup
  rmSync(tmpTar, { force: true })
  rmSync(tmpDir, { recursive: true, force: true })

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
