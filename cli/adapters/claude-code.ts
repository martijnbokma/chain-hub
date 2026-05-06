import { join } from "path"
import { homedir } from "os"
import { exists } from "../utils/fs"
import type { IdeAdapter } from "./types"

const CLAUDE_DIR = join(homedir(), ".claude")

export const claudeCode: IdeAdapter = {
  name: "Claude Code",
  infoUrl: "https://www.anthropic.com/claude-code",
  detect: () => exists(CLAUDE_DIR),
  links: (chainHome) => {
    const links = [
      { from: join(chainHome, "agents"), to: join(CLAUDE_DIR, "agents"), description: "agents" },
      { from: join(chainHome, "skills"), to: join(CLAUDE_DIR, "skills"), description: "skills" },
      { from: join(chainHome, "rules", "global.md"), to: join(CLAUDE_DIR, "CLAUDE.md"), description: "CLAUDE.md" },
      { from: join(chainHome, "workflows"), to: join(CLAUDE_DIR, "commands"), description: "commands" },
    ]

    // Memory linking requires the source directory to exist.
    // Claude Code derives the project ID by replacing path separators with dashes.
    const memorySrc = join(chainHome, "memory")
    if (exists(memorySrc)) {
      const projectId = homedir().replace(/\//g, "-").replace(/^-/, "")
      links.push({
        from: memorySrc,
        to: join(CLAUDE_DIR, "projects", projectId, "memory"),
        description: "memory",
      })
    }

    return links
  },
}
