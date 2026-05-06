import { basename } from "path"
import { readFileSync } from "fs"
import yaml from "yaml"

export function validateAgentContent(path: string, errors: string[], warnings: string[]) {
  const name = basename(path)
  const content = readFileSync(path, "utf-8")
  
  if (content.length > 20000) {
    errors.push(`Agent ${name}: Exceeds 20,000 character limit`)
  }

  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/)
  if (!frontmatterMatch) {
    errors.push(`Agent ${name}: Missing YAML frontmatter`)
  } else {
    try {
      const parsed = yaml.parse(frontmatterMatch[1])
      if (!parsed.name) errors.push(`Agent ${name}: Missing 'name' in frontmatter`)
      if (!parsed.description) errors.push(`Agent ${name}: Missing 'description' in frontmatter`)
    } catch (e) {
      errors.push(`Agent ${name}: Invalid YAML in frontmatter`)
    }
  }
}
