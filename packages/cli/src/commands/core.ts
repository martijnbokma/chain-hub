import type { Command } from "commander";

import {
  autoSyncHubOnStart,
  connectEditors,
  getDashboardOverview,
  getGuidedSetup,
  initializeChainHub,
  summarizeAgentsSkillSync,
  syncAgentsSkillsIntoHub,
  validateChainHub
} from "@chain-hub/domain";

import { printJson } from "./print.js";

/** Top-level commands: init, status, setup, guide, validate. */
export function registerCoreCommands(program: Command): void {
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
      // Awaited (not fire-and-forget): a CLI action must finish before the process exits.
      await autoSyncHubOnStart(options.chainHome);
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
}
