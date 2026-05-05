import { join } from "path"
import { mkdirSync } from "fs"
import { fetchRemoteIndex } from "../registry/remote"
import { addSkill } from "../registry/local"
import { downloadFromGithub, downloadSkillDirectoryFromGithub } from "../utils/providers/github"
import { UserError } from "../utils/errors"
import type { RemoteSkill } from "../registry/remote"
import type { InstallBucket } from "../registry/local"

export type { RemoteSkill }

export interface FetchRegistryResult {
  skills: RemoteSkill[]
  source: "live" | "bundled"
}

export async function fetchRegistry(): Promise<FetchRegistryResult> {
  const index = await fetchRemoteIndex()
  return { skills: index.skills, source: index.source ?? "live" }
}

export interface InstallSkillOpts {
  skill?: string
  pack?: boolean
}

export interface InstallSkillResult {
  installed: string[]
}

export async function installSkill(
  chainHome: string,
  slugOrGithubRef: string,
  opts: InstallSkillOpts = {},
): Promise<InstallSkillResult> {
  const skillsDir = join(chainHome, "skills")

  if (opts.pack && !slugOrGithubRef.startsWith("github:")) {
    throw new UserError("--pack is only valid with github:<owner>/<repo> installs.")
  }

  if (slugOrGithubRef.startsWith("github:")) {
    const [, ownerRepo] = slugOrGithubRef.split("github:")
    const parts = (ownerRepo ?? "").split("/")
    const owner = parts[0]
    const repo = parts[1]
    if (!owner || !repo) {
      throw new UserError(`Invalid github: format. Use github:<owner>/<repo>`)
    }

    const installed = await downloadFromGithub({
      owner,
      repo,
      specificSkill: opts.skill,
      destDir: skillsDir,
    })

    if (installed.length === 0) {
      throw new UserError(
        opts.skill ? `Skill '${opts.skill}' not found in ${slugOrGithubRef}.` : `No skills found in ${slugOrGithubRef}.`,
      )
    }

    const bucket: InstallBucket = opts.pack ? "packs" : "personal"
    for (const skill of installed) {
      addSkill({ slug: skill, source: slugOrGithubRef, version: "github-main", bucket, chainHome })
    }

    return { installed }
  }

  let index
  try {
    index = await fetchRemoteIndex()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new UserError(
      `Registry is unavailable: ${msg}\n  Tip: use github:<owner>/<repo> to install directly from GitHub`,
    )
  }

  const remoteSkill = index.skills.find((s) => s.slug === slugOrGithubRef)
  if (!remoteSkill) {
    throw new UserError(
      `Skill '${slugOrGithubRef}' not found in registry.\n  Tip: use github:<owner>/<repo> to install directly from GitHub`,
    )
  }

  const [, ownerRepo] = remoteSkill.source.split("github:")
  const parts = (ownerRepo ?? "").split("/")
  const owner = parts[0]
  const repo = parts[1]
  if (!owner || !repo) {
    throw new UserError(`Invalid registry source for '${slugOrGithubRef}': expected github:<owner>/<repo>`)
  }

  mkdirSync(skillsDir, { recursive: true })

  try {
    await downloadSkillDirectoryFromGithub({
      owner,
      repo,
      pathInRepo: remoteSkill.path,
      slug: slugOrGithubRef,
      destDir: skillsDir,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new UserError(`Failed to install '${slugOrGithubRef}' from ${remoteSkill.source}: ${msg}`)
  }

  const regSource = remoteSkill.source.startsWith("github:") ? remoteSkill.source : "chain-hub-registry"
  addSkill({ slug: slugOrGithubRef, source: regSource, version: remoteSkill.version, bucket: "chain_hub", chainHome })

  return { installed: [slugOrGithubRef] }
}
