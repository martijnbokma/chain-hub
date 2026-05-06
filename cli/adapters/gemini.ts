import { join } from "path"
import { homedir } from "os"
import { exists } from "../utils/fs"
import type { IdeAdapter } from "./types"

const GEMINI_DIR = join(homedir(), ".gemini")

export const gemini: IdeAdapter = {
  name: "Gemini CLI",
  infoUrl: "https://geminicli.com/",
  detect: () => exists(join(GEMINI_DIR, "settings.json")),
  links: (chainHome) => [
    // Skills live only under ~/.agents/skills (universal adapter) so Gemini CLI does not
    // index the same skill twice (~/.gemini/skills + ~/.agents/skills → conflict warnings).
    { from: join(chainHome, "workflows"), to: join(GEMINI_DIR, "workflows"), description: "workflows" },
  ],
}
