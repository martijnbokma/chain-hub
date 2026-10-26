import type { Command } from "commander";

import {
  getLibraryCatalog,
  installLibraryCatalogEntry,
  refreshLibraryCatalog
} from "@chain-hub/domain";
import { installCatalogEntryInputSchema } from "@chain-hub/contracts";

import { printJson } from "./print.js";

/** `chain catalog …` — list/install/refresh. */
export function registerCatalogCommands(program: Command): void {
  const catalogCommand = program.command("catalog").description("Browse and install curated catalog assets");

  catalogCommand
    .command("list")
    .description("List catalog entries with install state")
    .option("--refresh", "Force re-fetch of catalog indexes", false)
    .option("--kind <kind>", "Filter by asset kind (skills|agents|workflows)")
    .action(async (commandOptions: { refresh?: boolean; kind?: string }) => {
      const options = program.opts<{ chainHome?: string }>();
      const result = await getLibraryCatalog(options.chainHome, { force: commandOptions.refresh });
      const entries = commandOptions.kind ? result.entries.filter((entry) => entry.kind === commandOptions.kind) : result.entries;
      printJson({ ...result, entries });
    });

  catalogCommand
    .command("install <entryId>")
    .description("Install a catalog entry into the hub")
    .option("--source <sourceId>", "Catalog source id", "chain-hub")
    .option("--force", "Replace an existing asset", false)
    .action(async (entryId: string, commandOptions: { source: string; force?: boolean }) => {
      const options = program.opts<{ chainHome?: string }>();
      const input = installCatalogEntryInputSchema.parse({
        sourceId: commandOptions.source,
        entryId,
        force: commandOptions.force
      });
      const result = await installLibraryCatalogEntry(options.chainHome, input);
      printJson(result);
    });

  catalogCommand
    .command("refresh")
    .description("Re-fetch all catalog indexes")
    .action(async () => {
      const options = program.opts<{ chainHome?: string }>();
      const result = await refreshLibraryCatalog(options.chainHome, { force: true });
      printJson(result);
    });
}
