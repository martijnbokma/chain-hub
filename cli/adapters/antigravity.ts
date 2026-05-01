import { join } from "path"
import { homedir } from "os"
import { exists } from "../utils/fs"
import type { IdeAdapter } from "./types"

const ANTIGRAVITY_DIR = join(homedir(), ".gemini", "antigravity")

export const antigravity: IdeAdapter = {
  name: "Antigravity",
  detect: () => exists(ANTIGRAVITY_DIR),
  links: (chainHome) => [
    { from: join(chainHome, "skills"), to: join(ANTIGRAVITY_DIR, "skills"), description: "skills" },
    { from: join(chainHome, "workflows"), to: join(ANTIGRAVITY_DIR, "workflows"), description: "workflows" },
  ],
}
