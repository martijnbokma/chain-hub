#!/usr/bin/env node

import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Command, CommanderError } from "commander";

import { registerAssetCommands } from "./commands/asset.js";
import { registerCatalogCommands } from "./commands/catalog.js";
import { registerCoreCommands } from "./commands/core.js";
import { runHubCommand } from "./commands/hub.js";
import { registerLearningsCommands } from "./commands/learnings.js";
import { registerSkillCommands } from "./commands/skill.js";
import { registerSyncCommands } from "./commands/sync.js";

// Resolves to packages/cli/package.json from both src/ and the published dist/.
const { version } = createRequire(import.meta.url)("../package.json") as { version: string };

export function createProgram(): Command {
  const program = new Command();
  program.exitOverride();

  program
    .name("chain")
    .description("Chain Hub local-first CLI")
    .version(version)
    .option("--chain-home <path>", "Override the default chain home");

  registerCoreCommands(program);
  registerAssetCommands(program);
  registerSkillCommands(program);
  registerCatalogCommands(program);
  registerSyncCommands(program);
  registerLearningsCommands(program);

  program
    .command("hub")
    .description("Start the local Chain Hub dashboard")
    .option("--port <port>", "Port for the local dashboard", "2342")
    .option("--no-open", "Do not automatically open the browser")
    .action(async (commandOptions: { port: string; open: boolean }) => {
      const options = program.opts<{ chainHome?: string }>();
      await runHubCommand({
        chainHome: options.chainHome,
        port: commandOptions.port,
        open: commandOptions.open,
        cliDir: path.dirname(fileURLToPath(import.meta.url))
      });
    });

  return program;
}

export async function runCli(argv: string[] = process.argv): Promise<Command> {
  const program = createProgram();
  await program.parseAsync(argv);
  return program;
}

/** npm installs `chain` as a symlink to dist/index.js, so compare real paths. */
function resolveEntryPath(argvPath: string | undefined): string {
  if (!argvPath) {
    return "";
  }
  try {
    return fs.realpathSync(argvPath);
  } catch {
    return path.resolve(argvPath);
  }
}

const entryPath = resolveEntryPath(process.argv[1]);
const isDirectRun = entryPath.length > 0 && fs.realpathSync(fileURLToPath(import.meta.url)) === entryPath;

/** Turns thrown errors into one readable line instead of a stack trace. */
export function formatCliError(error: unknown): string {
  if (typeof error === "object" && error !== null && "issues" in error && Array.isArray(error.issues)) {
    return (error.issues as Array<{ message: string; path?: Array<string | number> }>)
      .map((issue) => (issue.path && issue.path.length > 0 ? `${issue.path.join(".")}: ${issue.message}` : issue.message))
      .join("; ");
  }
  return error instanceof Error ? error.message : String(error);
}

if (isDirectRun) {
  try {
    await runCli(process.argv);
  } catch (error) {
    // Commander already printed its own message (unknown option, --help, --version).
    if (error instanceof CommanderError) {
      process.exitCode = error.exitCode;
    } else {
      console.error(`Error: ${formatCliError(error)}`);
      process.exitCode = 1;
    }
  }
}
