import kleur from "kleur"
import { getChainHome } from "../utils/chain-home"
import { captureLearning, type LearningRecord } from "../utils/learnings"

export async function runCapture(opts: { 
  event: string, 
  skill: string, 
  summary: string, 
  repo?: string 
}): Promise<void> {
  const chainHome = getChainHome()
  
  const record: LearningRecord = {
    event: opts.event as any,
    skill_slug: opts.skill,
    summary: opts.summary,
    repo_hint: opts.repo
  }

  captureLearning(chainHome, record)
  console.log(kleur.green(`  ✓ Captured ${opts.event} for skill '${opts.skill}'`))
}
