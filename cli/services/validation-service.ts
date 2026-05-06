import { validateProject } from "../utils/validation"
import type { ValidationResult } from "../utils/validation"

export type { ValidationResult }
export type ValidationContentKind = "skills" | "rules" | "agents" | "workflows"

export function messageMatchesSlug(message: string, slug: string): boolean {
  const q = `'${slug}'`
  return (
    message.startsWith(`Skill ${slug}: `) ||
    message.includes(`Registry slug ${q}`) ||
    message.includes(`Directory ${q} in skills/`) ||
    message.includes(`Duplicate registry slug ${q}`) ||
    message.includes(`authorship.self slug ${q}`) ||
    message.includes(`github_sources skill ${q}`) ||
    message.includes(`Skill ${q} appears in more than one`) ||
    message.includes(`Core skill ${q}`)
  )
}

export function validateHub(chainHome: string): ValidationResult {
  return validateProject(chainHome)
}

export function validateSkill(chainHome: string, slug: string): { errors: string[]; warnings: string[]; skillsProcessed: number } {
  const result = validateContent(chainHome, "skills", slug)
  return {
    errors: result.errors,
    warnings: result.warnings,
    skillsProcessed: result.processed,
  }
}

export function validateContent(
  chainHome: string,
  kind: ValidationContentKind,
  slug: string,
): { errors: string[]; warnings: string[]; processed: number } {
  const result = validateProject(chainHome)
  const matcher = kind === "skills" ? messageMatchesSlug : messageMatchesContent
  return {
    errors: result.errors.filter((e) => matcher(e, slug, kind)),
    warnings: result.warnings.filter((w) => matcher(w, slug, kind)),
    processed: kind === "workflows" ? result.workflowsProcessed : result.skillsProcessed,
  }
}

function messageMatchesContent(message: string, slug: string, kind: Exclude<ValidationContentKind, "skills">): boolean {
  const q = `'${slug}'`
  if (kind === "rules") {
    return message.includes(`Core rule ${q}`)
  }
  if (kind === "agents") {
    return message.includes(`Core agent ${q}`)
  }
  return message.includes(`Core workflow ${q}`) || message.startsWith(`Workflow ${slug}:`)
}
