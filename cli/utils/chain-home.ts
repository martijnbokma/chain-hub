import { homedir } from "os"
import { join, resolve } from "path"
import { existsSync } from "fs"
import { spawnSync } from "child_process"

export function getChainHome(): string {
  if (process.env.CHAIN_HOME) return process.env.CHAIN_HOME

  let current = process.cwd()
  while (current !== "/" && current !== homedir()) {
    const skillsDir = join(current, "skills")
    if (existsSync(skillsDir)) {
      const repoRoot = current
      const canary = join(repoRoot, "skills", "chain-hub", "SKILL.md")
      if (!existsSync(canary)) {
        try {
          spawnSync("git", ["restore", "skills/", "workflows/", "rules/", "skills-registry.yaml"], { cwd: repoRoot })
        } catch {}
      }
      return repoRoot
    }
    current = resolve(current, "..")
  }
  return join(homedir(), ".chain")
}
