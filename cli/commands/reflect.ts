import kleur from "kleur"
import { join } from "path"
import { getChainHome } from "../utils/chain-home"
import { UserError } from "../utils/errors"
import { distillLearnings } from "../utils/learnings"

export async function runReflect(opts: { dryRun?: boolean; improve?: boolean }): Promise<void> {
  const chainHome = getChainHome()

  console.log(kleur.bold("\n  chain reflect\n"))

  let body: string | null
  try {
    body = distillLearnings(chainHome, opts.dryRun)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new UserError(`Could not distill learnings: ${msg}`)
  }

  if (body) {
    if (opts.dryRun) {
      console.log(body)
      console.log(kleur.yellow("\n  [Dry Run] Above is the content that would be distilled."))
    } else {
      console.log(kleur.green("  ✓ Learnings distilled into a draft."))
      console.log(kleur.cyan(`  Check ${join(chainHome, "learnings", "drafts")} for the latest draft.`))
    }
  } else if (!opts.dryRun) {
    console.log(kleur.yellow("  No new queued events (inbox empty)."))
  }

  if (opts.improve && !opts.dryRun) {
    console.log(kleur.bold("\n  🚀 Autonomous mode: Generating improvement proposals..."))
    const { generateImproveProposals } = await import("../services/improve-service")
    const result = generateImproveProposals(chainHome, { scopes: ["skills"] })
    console.log(kleur.green(`  ✓ Generated ${result.generated} proposal(s).`))
    console.log(kleur.cyan("  Review them in the Hub: http://localhost:2342/improve"))
  } else if (!body && !opts.dryRun) {
    // Already logged "No new queued events"
  } else if (!opts.dryRun && !opts.improve) {
    console.log(kleur.bold("\n  Next step: an agent should analyze the draft and propose changes."))
  }
}
