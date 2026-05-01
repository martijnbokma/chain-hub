import kleur from "kleur"
import { join } from "path"
import { mkdirSync } from "fs"
import { writeFile } from "fs/promises"
import { getChainHome } from "../utils/chain-home"
import { readRegistry, addSkill } from "../registry/local"
import { fetchRemoteIndex } from "../registry/remote"
import { downloadFromGithub } from "../utils/providers/github"

export async function runUpdate(): Promise<void> {
  const chainHome = getChainHome()
  const skillsDir = join(chainHome, "skills")
  const registry = readRegistry()

  console.log(kleur.bold("\n  chain update\n"))

  let updatedCount = 0
  let skippedCount = 0

  // Update chain_hub skills via remote registry version check
  const chainHubSlugs = registry.chain_hub ?? []
  if (chainHubSlugs.length > 0) {
    console.log(kleur.bold(`  Checking ${chainHubSlugs.length} registry skill(s)...`))

    let remoteIndex
    try {
      remoteIndex = await fetchRemoteIndex()
    } catch {
      console.error(kleur.yellow("  Warning: Could not reach remote registry. Skipping registry skills."))
    }

    if (remoteIndex) {
      for (const slug of chainHubSlugs) {
        const remote = remoteIndex.skills.find((s) => s.slug === slug)
        if (!remote) {
          console.log(kleur.dim(`  - ${slug.padEnd(32)} not in remote registry (skipped)`))
          skippedCount++
          continue
        }

        const [, ownerRepo] = remote.source.split("github:")
        const [owner, repo] = ownerRepo.split("/")
        const fileUrl = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${remote.path}/SKILL.md`
        const res = await fetch(fileUrl)
        if (!res.ok) {
          console.error(kleur.red(`  ✗ ${slug}: failed to fetch (${res.status})`))
          continue
        }

        const dest = join(skillsDir, slug)
        mkdirSync(dest, { recursive: true })
        await writeFile(join(dest, "SKILL.md"), await res.text(), "utf8")
        addSkill({ slug, source: remote.source, version: remote.version, bucket: "chain_hub" })
        console.log(kleur.green(`  ✓ ${slug.padEnd(32)} → v${remote.version}`))
        updatedCount++
      }
    }
  }

  // Re-download GitHub-bundled skills (no version pinning, always refresh)
  const bundles = registry.github_sources ?? []
  if (bundles.length > 0) {
    console.log(kleur.bold(`\n  Refreshing ${bundles.length} GitHub bundle(s)...`))

    for (const bundle of bundles) {
      const [, ownerRepo] = bundle.github.split("github:")
      const [owner, repo] = ownerRepo.split("/")

      try {
        const installed = await downloadFromGithub({
          owner,
          repo,
          destDir: skillsDir,
        })

        const refreshed = installed.filter((s) => bundle.skills.includes(s))
        for (const skill of refreshed) {
          console.log(kleur.green(`  ✓ ${skill.padEnd(32)} (${bundle.github})`))
          updatedCount++
        }
      } catch (err) {
        console.error(kleur.red(`  ✗ ${bundle.github}: ${err instanceof Error ? err.message : String(err)}`))
      }
    }
  }

  // Personal skills are user-authored — never touch them automatically
  const personalCount = (registry.personal ?? []).filter(
    (s) => !bundles.some((b) => b.skills.includes(s)),
  ).length
  if (personalCount > 0) {
    console.log(kleur.dim(`\n  Skipped ${personalCount} personal skill(s) (user-authored, not updated automatically).`))
    skippedCount += personalCount
  }

  console.log(
    kleur.green(`\n  ✓ Done — ${updatedCount} updated, ${skippedCount} skipped.\n`),
  )
}
