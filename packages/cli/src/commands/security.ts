import type { Command } from "commander";

import { rescanHubAssets } from "@chain-hub/domain";
import { rescanAssetsInputSchema } from "@chain-hub/contracts";

import { printJson } from "./print.js";

/** `chain security …` — rescan installed assets with the security gate. */
export function registerSecurityCommands(program: Command): void {
  const securityCommand = program.command("security").description("Security scanning for hub assets");

  securityCommand
    .command("scan")
    .description("Re-scan installed assets for malicious behavior (updates each asset's scan record)")
    .option("--kind <kind>", "Asset kind (skills|agents|workflows|rules|prompts)")
    .option("--name <name>", "Rescan a single asset (requires --kind)")
    .action(async (commandOptions: { kind?: string; name?: string }) => {
      const options = program.opts<{ chainHome?: string }>();
      const input = rescanAssetsInputSchema.parse({
        kind: commandOptions.kind,
        name: commandOptions.name
      });
      const result = await rescanHubAssets(options.chainHome, input);
      printJson(result);
    });
}
