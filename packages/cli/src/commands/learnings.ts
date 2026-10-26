import type { Command } from "commander";

import {
  captureHubEvent,
  getHubReflectionReport,
  resolveHubSkillLearnings,
  writeHubReflection
} from "@chain-hub/domain";
import { captureInputSchema } from "@chain-hub/contracts";

import { formatReflectionReport } from "../reflect-format.js";
import { printJson } from "./print.js";

/** Learnings commands: capture, reflect, resolve. */
export function registerLearningsCommands(program: Command): void {
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
    .command("resolve")
    .description("Mark a skill's captured corrections and failures as addressed")
    .argument("<slug>", "Skill slug")
    .action(async (slug: string) => {
      const options = program.opts<{ chainHome?: string }>();
      const result = await resolveHubSkillLearnings(options.chainHome, slug);
      printJson(result);
    });
}
