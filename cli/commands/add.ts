import kleur from "kleur"
import { join } from "path"
import { mkdirSync } from "fs"
import { writeFile } from "fs/promises"
import { getChainHome } from "../utils/chain-home"
import { addSkill } from "../registry/local"
import { fetchRemoteIndex } from "../registry/remote"
import { downloadFromGithub } from "../utils/providers/github"
import { UserError } from "../utils/errors"

export async function runAdd(slug: string, opts: { skill?: string } = {}): Promise<void> {
  const chainHome = getChainHome()
  const skillsDir = join(chainHome, "skills")

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

    for (const skill of installed) {
      addSkill({ slug: skill, source: slug, version: "github-main", bucket: "personal" })
      console.log(kleur.green(`  ✓ Installed ${skill}`))
    }

    console.log(kleur.green(`\n  ✓ Successfully installed ${installed.length} skill(s) from ${slug}\n`))
    return
  }

  // Case 2: Registry lookup
  console.log(kleur.bold(`\n  Looking up ${slug} in registry...`))
  let remoteSkill
  try {
    const index = await fetchRemoteIndex()
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
  const fileUrl = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${remoteSkill.path}/SKILL.md`
  const res = await fetch(fileUrl)
  if (!res.ok) throw new UserError(`Failed to fetch SKILL.md: ${res.status}`)

  const dest = join(skillsDir, slug)
  mkdirSync(dest, { recursive: true })
  await writeFile(join(dest, "SKILL.md"), await res.text(), "utf8")

  const regSource = remoteSkill.source.startsWith("github:") ? remoteSkill.source : "chain-hub-registry"
  addSkill({ slug, source: regSource, version: remoteSkill.version, bucket: "chain_hub" })
  console.log(kleur.green(`\n  ✓ Installed ${slug} v${remoteSkill.version}\n`))
}
