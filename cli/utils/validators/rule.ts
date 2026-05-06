import { basename } from "path"
import { readFileSync } from "fs"

export function validateRuleContent(path: string, errors: string[], warnings: string[]) {
  const name = basename(path)
  const content = readFileSync(path, "utf-8")
  
  if (content.length > 50000) {
    errors.push(`Rule ${name}: Exceeds 50,000 character limit`)
  }

  // Rules don't strictly require frontmatter but we can check for minimum length
  if (content.trim().length < 10) {
    warnings.push(`Rule ${name}: Content is very short`)
  }
}
