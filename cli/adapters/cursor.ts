import { join } from "path"
import { homedir } from "os"
import { exists } from "../utils/fs"
import type { IdeAdapter } from "./types"

const CURSOR_DIR = join(homedir(), ".cursor")

export const cursor: IdeAdapter = {
  name: "Cursor",
  infoUrl: "https://cursor.com/",
  detect: () => exists(CURSOR_DIR),
  links: (chainHome) => [
    { from: join(chainHome, "agents"), to: join(CURSOR_DIR, "agents"), description: "agents" },
    { from: join(chainHome, "skills"), to: join(CURSOR_DIR, "skills"), description: "skills" },
    { from: join(chainHome, "skills"), to: join(CURSOR_DIR, "skills-cursor"), description: "skills-cursor" },
    { from: join(chainHome, "rules", "cursor-global.mdc"), to: join(CURSOR_DIR, "rules", "global.mdc"), description: "rules (mdc)" },
    { from: join(chainHome, "rules", "global.md"), to: join(CURSOR_DIR, "rules", "global.md"), description: "rules (md)" },
  ],
}
