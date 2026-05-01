import { join, basename } from "path"
import { readFileSync, existsSync } from "fs"
import yaml from "yaml"

interface ValidateSkillOptions {
  allowReservedName?: boolean
}

export function validateSkillContent(
  skillDir: string,
  errors: string[],
  warnings: string[],
  options: ValidateSkillOptions = {},
) {
  const skillFile = join(skillDir, "SKILL.md")
  const dirName = basename(skillDir)

  if (!existsSync(skillFile)) {
    errors.push(`Skill ${dirName}: Missing SKILL.md`)
    return
  }

  const fullContent = readFileSync(skillFile, "utf-8")
  const frontmatterMatch = fullContent.match(/^---\s*\n([\s\S]*?)\n---\s*\n/)
  
  if (!frontmatterMatch) {
    errors.push(`Skill ${dirName}: Missing YAML frontmatter in SKILL.md`)
    return
  }

  try {
    const data = yaml.parse(frontmatterMatch[1])
    const { name, description } = data

    // Name checks
    if (!name || typeof name !== "string") {
      errors.push(`Skill ${dirName}: 'name' must be a non-empty string`)
    } else {
      if (name.length > 64) errors.push(`Skill ${dirName}: 'name' exceeds 64 characters`)
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
        errors.push(`Skill ${dirName}: 'name' must be kebab-case (lowercase, numbers, hyphens only)`)
      }
      if (!options.allowReservedName && (name.includes("anthropic") || name.includes("claude"))) {
        errors.push(`Skill ${dirName}: 'name' contains reserved words (anthropic/claude)`)
      }
      if (name !== dirName) {
        warnings.push(`Skill ${dirName}: Frontmatter name '${name}' differs from directory name`)
      }
    }

    // Description checks
    if (!description || typeof description !== "string") {
      errors.push(`Skill ${dirName}: 'description' must be a non-empty string`)
    } else {
      if (description.length > 1024) errors.push(`Skill ${dirName}: 'description' exceeds 1024 characters`)
      if (description.length < 40) warnings.push(`Skill ${dirName}: 'description' is very short (< 40 chars)`)
      if (/^(I|I'm|I am|We|You|Your)\b/i.test(description.trim())) {
        warnings.push(`Skill ${dirName}: 'description' should be third person (e.g., "Processes X..." instead of "I help you...")`)
      }
    }

    // Body checks
    const body = fullContent.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "")
    const bodyLines = body.split("\n").length
    const bodyBytes = Buffer.byteLength(body, "utf-8")

    if (bodyLines > 500) warnings.push(`Skill ${dirName}: SKILL.md body is long (> 500 lines)`)
    if (bodyBytes > 50000) warnings.push(`Skill ${dirName}: SKILL.md body is large (> 50 KB)`)
    if (bodyBytes < 80) warnings.push(`Skill ${dirName}: SKILL.md body is very short`)

  } catch (e) {
    errors.push(`Skill ${dirName}: Invalid YAML in frontmatter`)
  }
}
