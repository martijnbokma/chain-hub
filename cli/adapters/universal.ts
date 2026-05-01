import { join } from "path"
import { homedir } from "os"
import type { IdeAdapter } from "./types"

export const universal: IdeAdapter = {
  name: "Universal (Internal & Agents)",
  detect: () => true,
  links: (chainHome) => [
    { from: join(chainHome, "agents"), to: join(homedir(), ".agents", "agents"), description: "Universal agents" },
    { from: join(chainHome, "skills"), to: join(homedir(), ".agents", "skills"), description: "Universal skills" },
    { from: chainHome, to: join(homedir(), ".chain"), description: "Internal CLI config (~/.chain)" },
  ],
}
