import { join, basename } from "path"
import { readFileSync } from "fs"
import yaml from "yaml"

export function validateWorkflowContent(path: string, errors: string[], warnings: string[]) {
  const name = basename(path)
  const content = readFileSync(path, "utf-8")
  
  if (content.length > 12000) {
    errors.push(`Workflow ${name}: Exceeds 12,000 character limit`)
  }

  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/)
  if (!frontmatterMatch) {
    errors.push(`Workflow ${name}: Missing YAML frontmatter`)
  } else {
    try {
      const parsed = yaml.parse(frontmatterMatch[1])
      if (!parsed.description) errors.push(`Workflow ${name}: Missing 'description' in frontmatter`)
      if (!parsed.version) errors.push(`Workflow ${name}: Missing 'version' in frontmatter`)
    } catch (e) {
      errors.push(`Workflow ${name}: Invalid YAML in frontmatter`)
    }
  }

  const requiredSections = [
    "## When to Use",
    "## NOT When to Use",
    "## AI Execution Guidelines",
    "## Process",
    "## Output",
    "## Verification Checklist",
    "## Related Skills",
    "## Related Workflows"
  ]

  for (const section of requiredSections) {
    if (!content.includes(section)) {
      errors.push(`Workflow ${name}: Missing required section '${section}'`)
    }
  }

  if (!content.includes("Checkpoint:")) {
    warnings.push(`Workflow ${name}: No 'Checkpoint:' found for user confirmation`)
  }
}
