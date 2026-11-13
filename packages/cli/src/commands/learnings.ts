import type { Command } from "commander";

import {
  captureHubEvent,
  foldHubLearnings,
  getHubReflectionReport,
  resolveHubSkillLearnings,
  writeHubReflection
} from "@chain-hub/domain";
import { captureInputSchema } from "@chain-hub/contracts";

import { formatReflectionReport } from "../reflect-format.js";
import { printJson } from "./print.js";

const OUTCOME_LABELS: Record<string, string> = {
  applied: "improved in place",
  "reviewed-clean": "reports considered, nothing actionable",
  "upstream-proposal": "upstream-locked → contribution artifact",
  "to-source": "written back to the source directory",
  "findings-only": "too large to rewrite — findings saved as artifact",
  orphan: "no skill in the hub — reports stay open",
  failed: "fold failed"
};

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
      if (!event.knownSkill) {
        console.error(
          `Note: no skill named "${event.skill}" in the hub — stored as a topic report that cannot be folded or audited.`
        );
      }
      printJson(event);
    });

  program
    .command("reflect")
    .description("Show a per-skill reflection report from the learnings timeline")
    .option("--json", "Output raw JSON instead of formatted text")
    .option("--write", "Write the reflection to memory/reflections/YYYY-MM-DD.md")
    .option("--apply", "Fold open field reports into skills via AI audit + improve, then mark them addressed")
    .option("--dry-run", "Preview --apply outcomes without writing skills, artifacts or markers")
    .option("--skill <slug>", "Restrict --apply to one skill")
    .option("--to-source", "With --apply: write path-sourced upstream skills back to their origin directory")
    .action(
      async (commandOptions: {
        json?: boolean;
        write?: boolean;
        apply?: boolean;
        dryRun?: boolean;
        skill?: string;
        toSource?: boolean;
      }) => {
        const options = program.opts<{ chainHome?: string }>();

        if (commandOptions.apply) {
          const result = await foldHubLearnings(options.chainHome, {
            skill: commandOptions.skill,
            dryRun: commandOptions.dryRun ?? false,
            toSource: commandOptions.toSource ?? false
          });
          if (commandOptions.json) {
            printJson(result);
            return;
          }
          console.log(
            `\nFold ${result.dryRun ? "preview" : "applied"} — ${result.results.length} skill(s) with open reports`
          );
          if (result.results.length === 0) {
            console.log("  Nothing to fold: no open field reports.");
          }
          for (const item of result.results) {
            console.log(`  ${item.skill}  →  ${OUTCOME_LABELS[item.outcome] ?? item.outcome}`);
            if (item.artifactPath) {
              console.log(`    artifact: ${item.artifactPath}`);
            }
            if (item.error) {
              console.log(`    ${item.error}`);
            }
          }
          if (result.results.some((item) => item.outcome === "to-source")) {
            console.log("\n  Run `chain skill update <name>` to refresh installed copies from their sources.");
          }
          return;
        }

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
      }
    );

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
