#!/usr/bin/env node

import path from "node:path";
import { Command } from "commander";

import {
  captureHubEvent,
  connectEditors,
  createLibraryAsset,
  deleteLibraryAsset,
  getDashboardOverview,
  getGuidedSetup,
  getHubReflectionReport,
  getLibrary,
  getLibraryAsset,
  initializeChainHub,
  updateLibraryAsset,
  validateChainHub,
  writeHubReflection
} from "@chain-hub/domain";
import type { AssetKind } from "@chain-hub/contracts";
import { resolveChainHome } from "@chain-hub/storage";
import { startServer } from "@chain-hub/server";

const program = new Command();

program
  .name("chain")
  .description("Chain Hub v2 local-first CLI")
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
    console.log(JSON.stringify(overview, null, 2));
  });

program
  .command("setup")
  .description("Create editor links for supported integrations")
  .action(async () => {
    const options = program.opts<{ chainHome?: string }>();
    const integrations = await connectEditors(options.chainHome);
    console.log(JSON.stringify(integrations, null, 2));
  });

program
  .command("guide")
  .description("Show the guided setup checklist")
  .action(async () => {
    const options = program.opts<{ chainHome?: string }>();
    const guide = await getGuidedSetup(options.chainHome);
    console.log(JSON.stringify(guide, null, 2));
  });

const assetCommand = program.command("asset").description("Manage local hub assets");

assetCommand
  .command("list")
  .option("--kind <kind>", "Filter by kind")
  .action(async (commandOptions: { kind?: AssetKind }) => {
    const options = program.opts<{ chainHome?: string }>();
    const assets = await getLibrary(options.chainHome, commandOptions.kind);
    console.log(JSON.stringify(assets, null, 2));
  });

assetCommand
  .command("create")
  .requiredOption("--kind <kind>", "Asset kind")
  .requiredOption("--name <name>", "Asset name")
  .requiredOption("--content <content>", "Asset content")
  .action(async (commandOptions: { kind: AssetKind; name: string; content: string }) => {
    const options = program.opts<{ chainHome?: string }>();
    const asset = await createLibraryAsset(options.chainHome, commandOptions);
    console.log(JSON.stringify(asset, null, 2));
  });

assetCommand
  .command("show")
  .requiredOption("--kind <kind>", "Asset kind")
  .requiredOption("--name <name>", "Asset name")
  .action(async (commandOptions: { kind: AssetKind; name: string }) => {
    const options = program.opts<{ chainHome?: string }>();
    const asset = await getLibraryAsset(options.chainHome, commandOptions.kind, commandOptions.name);
    console.log(JSON.stringify(asset, null, 2));
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
    console.log(JSON.stringify(asset, null, 2));
  });

assetCommand
  .command("remove")
  .requiredOption("--kind <kind>", "Asset kind")
  .requiredOption("--name <name>", "Asset name")
  .action(async (commandOptions: { kind: AssetKind; name: string }) => {
    const options = program.opts<{ chainHome?: string }>();
    await deleteLibraryAsset(options.chainHome, commandOptions.kind, commandOptions.name);
    console.log(JSON.stringify({ ok: true, removed: `${commandOptions.kind}/${commandOptions.name}` }, null, 2));
  });

program
  .command("validate")
  .description("Validate the local chain home structure")
  .action(async () => {
    const options = program.opts<{ chainHome?: string }>();
    const validation = await validateChainHub(options.chainHome);

    if (!validation.ok) {
      console.error(JSON.stringify(validation, null, 2));
      process.exitCode = 1;
      return;
    }

    console.log(JSON.stringify(validation, null, 2));
  });

program
  .command("capture")
  .description("Append a learning event to the hub timeline")
  .requiredOption("--event <type>", "Event type: success, failure, correction, note")
  .requiredOption("--skill <slug>", "Skill or topic slug")
  .requiredOption("--summary <text>", "One-line summary of what happened")
  .action(async (commandOptions: { event: string; skill: string; summary: string }) => {
    const options = program.opts<{ chainHome?: string }>();
    const validTypes = ["success", "failure", "correction", "note"];
    if (!validTypes.includes(commandOptions.event)) {
      console.error(`Invalid event type: ${commandOptions.event}. Must be one of: ${validTypes.join(", ")}`);
      process.exitCode = 1;
      return;
    }
    const event = await captureHubEvent(options.chainHome, {
      type: commandOptions.event as "success" | "failure" | "correction" | "note",
      skill: commandOptions.skill,
      summary: commandOptions.summary
    });
    console.log(JSON.stringify(event, null, 2));
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
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    console.log(`\nReflection report — ${new Date(report.generatedAt).toLocaleString()}`);
    console.log(`${report.totalEvents} events across ${report.totalSkills} skills\n`);

    if (report.skills.length === 0) {
      console.log("No events captured yet. Run: chain capture --event note --skill <slug> --summary <text>");
      return;
    }

    for (const skill of report.skills) {
      const trendIcon = ({ improving: "↑", struggling: "↓", stable: "→", new: "★" } as Record<string, string>)[skill.trend] ?? "?";
      console.log(`  ${trendIcon} ${skill.skill}  [${skill.trend}]`);
      console.log(`    ${skill.totalEvents} events: ${skill.successCount} success / ${skill.failureCount} failure / ${skill.correctionCount} correction / ${skill.noteCount} note`);
      for (const e of skill.recentEvents) {
        const ts = new Date(e.capturedAt).toLocaleDateString();
        console.log(`    · [${e.type}] ${e.summary}  (${ts})`);
      }
      console.log();
    }
  });

program
  .command("hub")
  .description("Start the local Chain Hub v2 dashboard")
  .option("--port <port>", "Port for the local dashboard", "2342")
  .option("--no-open", "Do not automatically open the browser")
  .action(async (commandOptions: { port: string; open: boolean }) => {
    const options = program.opts<{ chainHome?: string }>();
    const chainHome = resolveChainHome(options.chainHome);

    const { isFirstRun } = await initializeChainHub(chainHome);

    if (isFirstRun) {
      console.log(`\nChain Hub initialized at: ${chainHome}`);
      console.log("First run complete — hub structure created.\n");
    }

    const staticRoot = path.resolve(process.cwd(), "apps", "hub-web", "dist");
    startServer({
      chainHome,
      port: Number(commandOptions.port),
      staticRoot
    });

    const url = `http://127.0.0.1:${commandOptions.port}`;
    console.log(`Chain Hub v2 running at ${url}`);
    console.log(`Chain home: ${chainHome}`);

    if (commandOptions.open !== false) {
      const { exec } = await import("node:child_process");
      const opener = process.platform === "win32" ? "start" : process.platform === "darwin" ? "open" : "xdg-open";
      exec(`${opener} ${url}`);
    }
  });

program.parseAsync(process.argv);
