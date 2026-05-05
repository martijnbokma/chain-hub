import kleur from "kleur"
import { join } from "path"
import { mkdirSync } from "fs"
import { getChainHome } from "../utils/chain-home"
import { addSkill } from "../registry/local"
import { fetchRemoteIndex } from "../registry/remote"
import { downloadFromGithub, downloadSkillDirectoryFromGithub } from "../utils/providers/github"
import { UserError } from "../utils/errors"

export async function runAdd(slug: string, opts: { skill?: string; pack?: boolean } = {}): Promise<void> {
  const chainHome = getChainHome()
  const skillsDir = join(chainHome, "skills")

  if (opts.pack && !slug.startsWith("github:")) {
    throw new UserError("--pack is only valid with github:<owner>/<repo> installs.")
  }

  // Case 1: GitHub direct installation
  if (slug.startsWith("github:")) {
    const [, ownerRepo] = slug.split("github:")
    const [owner, repo] = ownerRepo.split("/")
    if (!owner || !repo) {
      throw new UserError(`Invalid github: format. Use github:<owner>/<repo>`)
    }

    console.log(kleur.bold(`\n  Installing from ${slug}...`))

    const installed = await downloadFromGithub({
      owner,
      repo,
      specificSkill: opts.skill,
      destDir: skillsDir,
    })

    if (installed.length === 0) {
      throw new UserError(opts.skill ? `Skill '${opts.skill}' not found in ${slug}.` : `No skills found in ${slug}.`)
    }

    const bucket = opts.pack ? ("packs" as const) : ("personal" as const)
    for (const skill of installed) {
      addSkill({ slug: skill, source: slug, version: "github-main", bucket })
      console.log(kleur.green(`  ✓ Installed ${skill}`))
    }

    if (opts.pack) {
      console.log(kleur.dim(`  Registered under packs — run chain update to refresh this GitHub bundle later.\n`))
    }

    console.log(kleur.green(`\n  ✓ Successfully installed ${installed.length} skill(s) from ${slug}\n`))
    return
  }

  // Case 2: Registry lookup
  console.log(kleur.bold(`\n  Looking up ${slug} in registry...`))
  let remoteSkill
  try {
    const index = await fetchRemoteIndex()
    if (index.source === "bundled") {
      console.warn(kleur.yellow(`  Warning: Remote registry unavailable; using bundled catalog — install results may be stale.`))
    }
    remoteSkill = index.skills.find((s) => s.slug === slug)
  } catch {
    console.error(kleur.yellow(`  Warning: Could not reach remote registry. Trying local only.`))
  }

  if (!remoteSkill) {
    throw new UserError(
      `Skill '${slug}' not found in registry.\n  Tip: use github:<owner>/<repo> to install directly from GitHub`,
    )
  }

  const [, ownerRepo] = remoteSkill.source.split("github:")
  const [owner, repo] = ownerRepo.split("/")
  if (!owner || !repo) {
    throw new UserError(`Invalid registry source for '${slug}': expected github:<owner>/<repo>`)
  }

  try {
    await downloadSkillDirectoryFromGithub({
      owner,
      repo,
      pathInRepo: remoteSkill.path,
      slug,
      destDir: skillsDir,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new UserError(`Failed to install '${slug}' from ${remoteSkill.source}: ${msg}`)
  }

  const regSource = remoteSkill.source.startsWith("github:") ? remoteSkill.source : "chain-hub-registry"
  addSkill({ slug, source: regSource, version: remoteSkill.version, bucket: "chain_hub" })
  console.log(kleur.green(`\n  ✓ Installed ${slug} v${remoteSkill.version}\n`))
}
