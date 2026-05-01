import {
  existsSync,
  lstatSync,
  readlinkSync,
  mkdirSync,
  symlinkSync,
  renameSync,
  unlinkSync,
  realpathSync,
} from "fs"
import { dirname, join } from "path"
import { homedir } from "os"

export type RelinkResult = "created" | "skipped" | "backed-up"

export function forceRelink(target: string, linkPath: string): RelinkResult {
  mkdirSync(dirname(linkPath), { recursive: true })

  const stat = lstatSync(linkPath, { throwIfNoEntry: false })

  if (stat?.isSymbolicLink()) {
    if (readlinkSync(linkPath) === target) return "skipped"
    unlinkSync(linkPath)
    symlinkSync(target, linkPath)
    return "created"
  }

  if (stat) {
    const backup = `${linkPath}.backup`
    if (existsSync(backup)) return "skipped"
    renameSync(linkPath, backup)
    symlinkSync(target, linkPath)
    return "backed-up"
  }

  symlinkSync(target, linkPath)
  return "created"
}

/** Remove ~/.gemini/skills when it is a symlink to chain/skills (legacy duplicate of ~/.agents/skills). */
export function removeRedundantGeminiSkillsSymlink(chainHome: string): boolean {
  const geminiSkills = join(homedir(), ".gemini", "skills")
  const chainSkills = join(chainHome, "skills")
  try {
    const st = lstatSync(geminiSkills, { throwIfNoEntry: false })
    if (!st?.isSymbolicLink()) return false
    if (realpathSync(geminiSkills) === realpathSync(chainSkills)) {
      unlinkSync(geminiSkills)
      return true
    }
  } catch {
    /* missing path or permission */
  }
  return false
}
