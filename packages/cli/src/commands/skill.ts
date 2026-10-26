import type { Command } from "commander";

import {
  checkLibrarySkillUpdates,
  forkLibrarySkill,
  installLibrarySkill,
  migrateAgentsLibrarySkills,
  updateLibrarySkills
} from "@chain-hub/domain";
import {
  checkSkillUpdatesInputSchema,
  forkSkillInputSchema,
  installSkillInputSchema,
  migrateAgentsSkillsInputSchema,
  updateSkillsInputSchema
} from "@chain-hub/contracts";

import { printJson } from "./print.js";

/** `chain skill …` — install/update/check-updates/migrate-agents/fork. */
export function registerSkillCommands(program: Command): void {
  const skillCommand = program.command("skill").description("Install and manage skills in the hub");

  skillCommand
    .command("install")
    .description("Install a skill into the hub from a local path or git repo, then project to editors")
    .option("--path <dir>", "Local skill directory containing SKILL.md")
    .option("--repo <url>", "Git repository URL or path")
    .option("--subdir <path>", "Skill folder inside the git repo")
    .option("--name <name>", "Override skill name")
    .option("--force", "Replace an existing hub skill", false)
    .action(
      async (commandOptions: {
        path?: string;
        repo?: string;
        subdir?: string;
        name?: string;
        force?: boolean;
      }) => {
        const options = program.opts<{ chainHome?: string }>();
        const input = installSkillInputSchema.parse({
          path: commandOptions.path,
          repo: commandOptions.repo,
          subdir: commandOptions.subdir,
          name: commandOptions.name,
          force: commandOptions.force
        });
        const result = await installLibrarySkill(options.chainHome, input);
        printJson(result);
      }
    );

  skillCommand
    .command("update")
    .description("Reinstall hub skills from their recorded upstream sources")
    .option("--name <name>", "Update a single skill (default: all locked skills)")
    .option("--force", "Update even when the content hash is unchanged", false)
    .action(async (commandOptions: { name?: string; force?: boolean }) => {
      const options = program.opts<{ chainHome?: string }>();
      const input = updateSkillsInputSchema.parse({
        name: commandOptions.name,
        force: commandOptions.force
      });
      const result = await updateLibrarySkills(options.chainHome, input);
      printJson(result);
    });

  skillCommand
    .command("check-updates")
    .description("Check for updates of installed git skills via git ls-remote")
    .option("--force", "Force refresh", false)
    .action(async (commandOptions: { force?: boolean }) => {
      const options = program.opts<{ chainHome?: string }>();
      const input = checkSkillUpdatesInputSchema.parse({
        force: commandOptions.force
      });
      const result = await checkLibrarySkillUpdates(options.chainHome, input);
      printJson(result);
    });

  skillCommand
    .command("migrate-agents")
    .description("Import skills from ~/.agents/.skill-lock.json into the hub")
    .option("--lock-path <path>", "Override agents skill-lock path")
    .option("--force", "Replace skills that already exist in the hub", false)
    .action(async (commandOptions: { lockPath?: string; force?: boolean }) => {
      const options = program.opts<{ chainHome?: string }>();
      const input = migrateAgentsSkillsInputSchema.parse({
        lockPath: commandOptions.lockPath,
        force: commandOptions.force
      });
      const result = await migrateAgentsLibrarySkills(options.chainHome, input);
      printJson(result);
    });

  skillCommand
    .command("fork")
    .description("Copy an upstream-owned skill into a local editable skill (no lock entry)")
    .requiredOption("--name <name>", "Upstream skill name in the hub")
    .option("--as <name>", "Name for the local fork (default: <name>-local)")
    .action(async (commandOptions: { name: string; as?: string }) => {
      const options = program.opts<{ chainHome?: string }>();
      const input = forkSkillInputSchema.parse({
        name: commandOptions.name,
        as: commandOptions.as
      });
      const asset = await forkLibrarySkill(options.chainHome, input);
      printJson(asset);
    });
}
