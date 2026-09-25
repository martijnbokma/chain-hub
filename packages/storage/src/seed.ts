import path from "node:path";
import { promises as fs } from "node:fs";

import { ensureDir, pathExists } from "./shared.js";

// Starter assets written on a hub's first init. Existing files are never overwritten.

export async function seedWelcomeSkill(chainHome: string): Promise<void> {
  const skillDir = path.join(chainHome, "skills", "welcome");
  const skillFile = path.join(skillDir, "SKILL.md");

  if (await pathExists(skillFile)) {
    return;
  }

  await ensureDir(skillDir);
  await fs.writeFile(
    skillFile,
    [
      "---",
      "name: welcome",
      "description: Introduces Chain Hub. Use when the user asks what Chain Hub is or how its hub folder works.",
      "---",
      "",
      "# Welcome",
      "",
      "You are inside Chain Hub.",
      "",
      "- Keep AI guidance local and portable",
      "- Prefer clear workflows over hidden magic",
      "- Validate changes before syncing into editors"
    ].join("\n")
  );
}

export async function seedLearningsRule(chainHome: string): Promise<void> {
  const ruleFile = path.join(chainHome, "rules", "chain-hub-learnings.md");

  if (await pathExists(ruleFile)) {
    return;
  }

  await ensureDir(path.join(chainHome, "rules"));
  await fs.writeFile(
    ruleFile,
    [
      "# Learning capture",
      "",
      "Log what a skill should learn, not what you shipped:",
      "",
      '`chain capture --event <failure|correction|note|success> --skill <slug> --summary "<one line>"`',
      "",
      "- `correction`: the skill's guidance was wrong or incomplete and you had to deviate. Say what the skill should say instead.",
      "- `failure`: following the skill led to a broken or rejected result.",
      "- `note`: a reusable gotcha the skill does not mention yet.",
      "- `success`: only when the skill's specific guidance prevented a mistake you would otherwise have made.",
      "",
      "Write the summary about the skill, not the project (\"Skill misses SVG targets in click handlers\", not \"Shipped media actions\"). Skip routine work — most tasks need no capture."
    ].join("\n")
  );
}
