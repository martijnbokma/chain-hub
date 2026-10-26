import type { Command } from "commander";

import {
  createLibraryAsset,
  deleteLibraryAsset,
  discoverLibraryAssets,
  getLibrary,
  getLibraryAsset,
  importLibraryAsset,
  updateLibraryAsset
} from "@chain-hub/domain";
import { assetKindSchema, type AssetKind } from "@chain-hub/contracts";

import { printJson } from "./print.js";

/** `chain asset …` — list/create/show/update/remove/discover/import. */
export function registerAssetCommands(program: Command): void {
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
}
