#!/usr/bin/env node

import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Command, CommanderError } from "commander";

import {
  captureHubEvent,
  connectEditors,
  createLibraryAsset,
  deleteLibraryAsset,
  discoverLibraryAssets,
  getDashboardOverview,
  getGuidedSetup,
  getHubReflectionReport,
  getLibrary,
  getLibraryAsset,
  importLibraryAsset,
  initializeChainHub,
  forkLibrarySkill,
  installLibrarySkill,
  migrateAgentsLibrarySkills,
  checkLibrarySkillUpdates,
  summarizeAgentsSkillSync,
  syncAgentsSkillsIntoHub,
  updateLibraryAsset,
  updateLibrarySkills,
  validateChainHub,
  writeHubReflection
} from "@chain-hub/domain";
import {
  assetKindSchema,
  captureInputSchema,
  checkSkillUpdatesInputSchema,
  forkSkillInputSchema,
  installSkillInputSchema,
  migrateAgentsSkillsInputSchema,
  updateSkillsInputSchema,
  type AssetKind
} from "@chain-hub/contracts";
import { runHubCommand } from "./commands/hub.js";
import { formatReflectionReport } from "./reflect-format.js";

// Resolves to packages/cli/package.json from both src/ and the published dist/.
const { version } = createRequire(import.meta.url)("../package.json") as { version: string };

/** Commands print their result as pretty JSON so scripts can pipe it. */
function printJson(value: unknown, write: (text: string) => void = console.log): void {
  write(JSON.stringify(value, null, 2));
}

export function createProgram(): Command {
  const program = new Command();
  program.exitOverride();

  program
  .name("chain")
  .description("Chain Hub local-first CLI")
  .version(version)
  .option("--chain-home <path>", "Override the default chain home");

program
  .command("init")
  .description("Initialize a local chain home")
  .action(async () => {
    const options = program.opts<{ chainHome?: string }>();
    const result = await initializeChainHub(options.chainHome);
    console.log(result.message);
  });

program
  .command("status")
  .description("Show current hub status")
  .action(async () => {
    const options = program.opts<{ chainHome?: string }>();
    const overview = await getDashboardOverview(options.chainHome);
    printJson(overview);
  });

program
  .command("setup")
  .description("Create editor links for supported integrations")
  .action(async () => {
    const options = program.opts<{ chainHome?: string }>();
    const integrations = await connectEditors(options.chainHome);
    const syncResult = await syncAgentsSkillsIntoHub(options.chainHome);
    printJson(integrations);
    if (syncResult.results.length > 0) {
      console.log(summarizeAgentsSkillSync(syncResult));
    }
  });

program
  .command("guide")
  .description("Show the guided setup checklist")
  .action(async () => {
    const options = program.opts<{ chainHome?: string }>();
    const guide = await getGuidedSetup(options.chainHome);
    printJson(guide);
  });

const assetCommand = program.command("asset").description("Manage local hub assets");

assetCommand
  .command("list")
  .option("--kind <kind>", "Filter by kind")
  .action(async (commandOptions: { kind?: AssetKind }) => {
    const options = program.opts<{ chainHome?: string }>();
    const kind = commandOptions.kind === undefined ? undefined : assetKindSchema.parse(commandOptions.kind);
    const assets = await getLibrary(options.chainHome, kind);
    printJson(assets);
  });

assetCommand
  .command("create")
  .requiredOption("--kind <kind>", "Asset kind")
  .requiredOption("--name <name>", "Asset name")
  .requiredOption("--content <content>", "Asset content")
  .action(async (commandOptions: { kind: AssetKind; name: string; content: string }) => {
    const options = program.opts<{ chainHome?: string }>();
    const asset = await createLibraryAsset(options.chainHome, commandOptions);
    printJson(asset);
  });

assetCommand
  .command("show")
  .requiredOption("--kind <kind>", "Asset kind")
  .requiredOption("--name <name>", "Asset name")
  .action(async (commandOptions: { kind: AssetKind; name: string }) => {
    const options = program.opts<{ chainHome?: string }>();
    const asset = await getLibraryAsset(options.chainHome, commandOptions.kind, commandOptions.name);
    printJson(asset);
  });

assetCommand
  .command("update")
  .requiredOption("--kind <kind>", "Asset kind")
  .requiredOption("--name <name>", "Asset name")
  .requiredOption("--content <content>", "Updated asset content")
  .action(async (commandOptions: { kind: AssetKind; name: string; content: string }) => {
    const options = program.opts<{ chainHome?: string }>();
    const asset = await updateLibraryAsset(
      options.chainHome,
      commandOptions.kind,
      commandOptions.name,
      commandOptions.content
    );
    printJson(asset);
  });

assetCommand
  .command("remove")
  .requiredOption("--kind <kind>", "Asset kind")
  .requiredOption("--name <name>", "Asset name")
  .action(async (commandOptions: { kind: AssetKind; name: string }) => {
    const options = program.opts<{ chainHome?: string }>();
    await deleteLibraryAsset(options.chainHome, commandOptions.kind, commandOptions.name);
    printJson({ ok: true, removed: `${commandOptions.kind}/${commandOptions.name}` });
  });

assetCommand
  .command("discover")
  .description("List native editor assets not yet in the hub")
  .action(async () => {
    const options = program.opts<{ chainHome?: string }>();
    const discovered = await discoverLibraryAssets(options.chainHome);
    printJson(discovered);
  });

assetCommand
  .command("import")
  .requiredOption("--editor <id>", "Editor id to import from (e.g. claude-code)")
  .requiredOption("--kind <kind>", "Asset kind")
  .requiredOption("--name <name>", "Asset name")
  .action(async (commandOptions: { editor: string; kind: AssetKind; name: string }) => {
    const options = program.opts<{ chainHome?: string }>();
    const asset = await importLibraryAsset(options.chainHome, {
      editorId: commandOptions.editor,
      kind: commandOptions.kind,
      name: commandOptions.name
    });
    printJson(asset);
  });

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

program
  .command("validate")
  .description("Validate the local chain home structure")
  .action(async () => {
    const options = program.opts<{ chainHome?: string }>();
    const validation = await validateChainHub(options.chainHome);

    if (!validation.ok) {
      printJson(validation, console.error);
      process.exitCode = 1;
      return;
    }

    printJson(validation);
  });

program
  .command("capture")
  .description("Append a learning event to the hub timeline")
  .requiredOption("--event <type>", "Event type: success, failure, correction, note")
  .requiredOption("--skill <slug>", "Skill or topic slug")
  .requiredOption("--summary <text>", "One-line summary of what happened")
  .action(async (commandOptions: { event: string; skill: string; summary: string }) => {
    const options = program.opts<{ chainHome?: string }>();
    const event = await captureHubEvent(
      options.chainHome,
      captureInputSchema.parse({
        type: commandOptions.event,
        skill: commandOptions.skill,
        summary: commandOptions.summary
      })
    );
    printJson(event);
  });

program
  .command("reflect")
  .description("Show a per-skill reflection report from the learnings timeline")
  .option("--json", "Output raw JSON instead of formatted text")
  .option("--write", "Write the reflection to memory/reflections/YYYY-MM-DD.md")
  .action(async (commandOptions: { json?: boolean; write?: boolean }) => {
    const options = program.opts<{ chainHome?: string }>();

    if (commandOptions.write) {
      const result = await writeHubReflection(options.chainHome);
      console.log(`Reflection written to: ${result.filePath}`);
      return;
    }

    const report = await getHubReflectionReport(options.chainHome);

    if (commandOptions.json) {
      printJson(report);
      return;
    }

    for (const line of formatReflectionReport(report)) {
      console.log(line);
    }
  });

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
