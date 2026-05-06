import { join } from "path"
import { homedir } from "os"
import { exists } from "../utils/fs"
import type { IdeAdapter } from "./types"

// Kiro (AWS) — path based on early documentation; verify ~/.kiro structure before first use
const KIRO_DIR = join(homedir(), ".kiro")

export const kiro: IdeAdapter = {
  name: "Kiro",
  infoUrl: "https://kiro.dev/",
  detect: () => exists(KIRO_DIR),
  links: (chainHome) => [
    { from: join(chainHome, "skills"), to: join(KIRO_DIR, "hooks", "skills"), description: "skills" },
    { from: join(chainHome, "workflows"), to: join(KIRO_DIR, "hooks", "workflows"), description: "workflows" },
  ],
}
