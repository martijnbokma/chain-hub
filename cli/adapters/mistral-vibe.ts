import { join } from "path"
import { homedir } from "os"
import { exists } from "../utils/fs"
import type { IdeAdapter } from "./types"

// Mistral Vibe — https://docs.mistral.ai/mistral-vibe/agents-skills
// Global skills live under ~/.vibe/skills/ (SKILL.md per directory).
// ~/.vibe/agents/ expects .toml profiles, not Chain Hub's .md agents — do not symlink agents.
const VIBE_DIR = join(homedir(), ".vibe")

export const mistralVibe: IdeAdapter = {
  name: "Mistral Vibe",
  infoUrl: "https://mistral.ai/products/vibe",
  detect: () => exists(VIBE_DIR),
  links: (chainHome) => [
    { from: join(chainHome, "skills"), to: join(VIBE_DIR, "skills"), description: "skills" },
  ],
}
