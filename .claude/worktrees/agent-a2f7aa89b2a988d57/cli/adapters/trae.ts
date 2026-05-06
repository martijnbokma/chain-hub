import { join } from "path"
import { homedir } from "os"
import { exists } from "../utils/fs"
import type { IdeAdapter } from "./types"

// Trae (ByteDance) — path based on community reports; verify at ~/.trae before first use
const TRAE_DIR = join(homedir(), ".trae")

export const trae: IdeAdapter = {
  name: "Trae",
  detect: () => exists(TRAE_DIR),
  links: (chainHome) => [
    { from: join(chainHome, "skills"), to: join(TRAE_DIR, "skills"), description: "skills" },
  ],
}
