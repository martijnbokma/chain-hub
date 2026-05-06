import { join, basename } from "path"
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, lstatSync } from "fs"
import kleur from "kleur"
import { getChainHome } from "../utils/chain-home"

export async function runFix(): Promise<void> {
  const chainHome = getChainHome()
  const skillsDir = join(chainHome, "skills")
  const workflowsDir = join(chainHome, "workflows")

  console.log(kleur.bold("\n🔧 chain fix"))
  console.log(kleur.dim(`   CHAIN_HOME: ${chainHome}\n`))

  let fixedCount = 0

  // 1. Fix Skills
  if (existsSync(skillsDir)) {
    const skills = readdirSync(skillsDir)
    for (const skill of skills) {
      if (skill.startsWith("_")) continue
      const skillPath = join(skillsDir, skill)
      if (lstatSync(skillPath).isSymbolicLink()) continue
      if (statSync(skillPath).isDirectory()) {
        const skillFile = join(skillPath, "SKILL.md")
        if (existsSync(skillFile)) {
          if (fixFile(skillFile, "skill")) fixedCount++
        }
      }
    }
  }

  // 2. Fix Workflows
  if (existsSync(workflowsDir)) {
    const workflows = readdirSync(workflowsDir)
    for (const workflow of workflows) {
      if (workflow.startsWith("_") || !workflow.endsWith(".md")) continue
      const workflowPath = join(workflowsDir, workflow)
      if (statSync(workflowPath).isFile()) {
        if (fixFile(workflowPath, "workflow")) fixedCount++
      }
    }
  }

  console.log(kleur.green(`\n  ✓ Auto-fix complete: ${fixedCount} file(s) modified\n`))
}

function fixFile(filePath: string, type: "skill" | "workflow"): boolean {
  const originalContent = readFileSync(filePath, "utf-8")
  let content = originalContent
  let modified = false

  const name = type === "skill"
    ? basename(join(filePath, ".."))  // parent dir = skill slug (e.g. skills/bug-fix/SKILL.md → bug-fix)
    : basename(filePath).replace(".md", "")

  // Fix Frontmatter
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/)
  if (frontmatterMatch) {
    let fm = frontmatterMatch[1]
    let fmModified = false

    if (!fm.includes("version:")) { fm += "\nversion: 1.0.0"; fmModified = true }
    if (!fm.includes("last_updated:")) {
      const today = new Date().toISOString().split("T")[0]
      fm += `\nlast_updated: ${today}`
      fmModified = true
    }

    if (fmModified) {
      content = content.replace(frontmatterMatch[0], `---\n${fm}\n---\n`)
      modified = true
    }
  }

  // Fix Sections
  const skillRequiredSections: Record<string, string> = {
    "## When to Use": "Use this skill when:\n- [Add specific use cases]\n",
    "## NOT When to Use": "Do not use this skill when:\n- [Add alternative scenarios]\n", 
    "## Key Principles": "- [Principle 1]\n- [Principle 2]\n- [Principle 3]\n",
    "## Output Format": "```markdown\n[Output format template]\n```\n",
    "## Constraints": "- [Constraint 1]\n- [Constraint 2]\n",
    "## Examples": "### Success Example\n[Example description]\n\n### Common Pitfalls\n- [Pitfall]: [Description]\n"
  }

  const workflowRequiredSections: Record<string, string> = {
    "## When to Use": "Use this workflow when:\n- [Scenario 1]\n",
    "## NOT When to Use": "Do not use this workflow when:\n- [Scenario where alternative is better]\n", 
    "## AI Execution Guidelines": "### Style & Tone\n- [Rule 1]\n### Task Nuances\n- [Rule 2]\n",
    "## Process": "1. [Step 1]\n2. [Step 2]\n",
    "## Output": "### Format\n[Format description]\n### Delivery\n[Delivery method]\n",
    "## Verification Checklist": "- [ ] [Check 1]\n- [ ] [Check 2]\n",
    "## Related Skills": "- [Skill Name](../skill-slug/SKILL.md)\n",
    "## Related Workflows": "- [Workflow Name](../workflow-slug.md)\n"
  }

  const targetSections = type === "skill" ? skillRequiredSections : workflowRequiredSections

  for (const [section, template] of Object.entries(targetSections)) {
    if (!content.includes(section)) {
      content += `\n\n${section}\n\n${template}`
      modified = true
    }
  }

  // Workflow specific fixes
  if (type === "workflow") {
    if (!content.includes("Checkpoint:")) {
      content += `\n\n## Checkpoints\n\nCheckpoint: [Describe what the user should confirm before proceeding]\n`
      modified = true
    }
  }

  if (modified) {
    writeFileSync(filePath, content, "utf-8")
    console.log(kleur.green(`    ✓ Fixed: ${name}`))
    return true
  }

  return false
}
