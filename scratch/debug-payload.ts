import { listSkillsPayload } from "../cli/services/skills-service"
import { join } from "path"
import { homedir } from "os"

const chainHome = join(homedir(), "chain-hub")
const payload = listSkillsPayload(chainHome)

console.log("Total skills:", payload.skills.length)
console.log("Initialized:", payload.initialized)
if (payload.skills.length > 0) {
  console.log("First skill:", JSON.stringify(payload.skills[0], null, 2))
}
