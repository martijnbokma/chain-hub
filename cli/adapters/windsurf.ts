import { join } from "path"
import { homedir } from "os"
import { exists } from "../utils/fs"
import type { IdeAdapter } from "./types"

const WINDSURF_DIR = join(homedir(), ".codeium", "windsurf")

export const windsurf: IdeAdapter = {
  name: "Windsurf",
  detect: () => exists(WINDSURF_DIR),
  links: (chainHome) => [
    { from: join(chainHome, "skills"), to: join(WINDSURF_DIR, "skills"), description: "skills" },
    { from: join(chainHome, "workflows"), to: join(WINDSURF_DIR, "global_workflows"), description: "workflows" },
    { from: join(chainHome, "rules", "global.md"), to: join(WINDSURF_DIR, "memories", "global_rules.md"), description: "rules" },
  ],
}
