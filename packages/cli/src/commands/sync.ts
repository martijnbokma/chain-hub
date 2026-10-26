import type { Command } from "commander";

import {
  connectHubSync,
  disconnectHubSync,
  getHubSyncStatus,
  resolveHubSyncConflicts,
  syncHubNow
} from "@chain-hub/domain";
import {
  resolveConflictsInputSchema,
  syncConnectInputSchema,
  type ResolveConflictsInput
} from "@chain-hub/contracts";

import { printJson } from "./print.js";

/** `chain sync …` — now/connect/status/disconnect/resolve. */
export function registerSyncCommands(program: Command): void {
  const syncCommand = program
    .command("sync")
    .description("Back up and sync the hub via a private GitHub repo")
    .action(async () => {
      const options = program.opts<{ chainHome?: string }>();
      printJson(await syncHubNow(options.chainHome));
    });

  syncCommand
    .command("connect")
    .description("Connect the hub to a private GitHub repo (creates it when missing)")
    .option("--repo <name>", "Repo name (default: chain-hub-sync)")
    .option("--method <method>", "Auth method: gh or pat")
    .option("--token <token>", "Fine-grained PAT (implies --method pat)")
    .option("--adopt", "Take over an existing repo without the Chain Hub manifest", false)
    .option("--no-auto-sync", "Disable automatic sync on `chain hub` start")
    .action(
      async (commandOptions: {
        repo?: string;
        method?: string;
        token?: string;
        adopt: boolean;
        autoSync: boolean;
      }) => {
        const options = program.opts<{ chainHome?: string }>();
        const payload = syncConnectInputSchema.parse({
          repo: commandOptions.repo,
          method: commandOptions.token ? "pat" : (commandOptions.method ?? "gh"),
          token: commandOptions.token,
          adopt: commandOptions.adopt,
          autoSync: commandOptions.autoSync
        });
        printJson(await connectHubSync(options.chainHome, payload));
      }
    );

  syncCommand
    .command("status")
    .description("Show sync connection, ahead/behind and conflicts")
    .action(async () => {
      const options = program.opts<{ chainHome?: string }>();
      printJson(await getHubSyncStatus(options.chainHome));
    });

  syncCommand
    .command("disconnect")
    .description("Remove the sync remote (local files and history are kept)")
    .action(async () => {
      const options = program.opts<{ chainHome?: string }>();
      printJson(await disconnectHubSync(options.chainHome));
    });

  syncCommand
    .command("resolve")
    .description("Resolve sync conflicts and finish the merge")
    .option("--local <paths...>", "Keep the local version of the given conflicted paths")
    .option("--remote <paths...>", "Keep the remote version of the given conflicted paths")
    .option("--all <side>", "Resolve every conflict to 'local' or 'remote'")
    .option("--done", "Conflicts were edited manually — finish the merge")
    .action(
      async (commandOptions: {
        local?: string[];
        remote?: string[];
        all?: string;
        done?: boolean;
      }) => {
        const options = program.opts<{ chainHome?: string }>();
        const status = await getHubSyncStatus(options.chainHome);
        const conflicted = status.conflicts.map((conflict) => conflict.path);

        const resolutions: ResolveConflictsInput["resolutions"] = [];
        if (commandOptions.all === "local" || commandOptions.all === "remote") {
          for (const filePath of conflicted) {
            resolutions.push({ path: filePath, strategy: commandOptions.all });
          }
        }
        if (commandOptions.done) {
          for (const filePath of conflicted) {
            resolutions.push({ path: filePath, strategy: "manual" });
          }
        }
        for (const filePath of commandOptions.local ?? []) {
          resolutions.push({ path: filePath, strategy: "local" });
        }
        for (const filePath of commandOptions.remote ?? []) {
          resolutions.push({ path: filePath, strategy: "remote" });
        }
        if (resolutions.length === 0) {
          console.error(
            conflicted.length > 0
              ? `Unresolved conflicts: ${conflicted.join(", ")}\nPass --local/--remote <paths>, --all <side>, or --done.`
              : "No conflicts to resolve."
          );
          process.exitCode = 1;
          return;
        }

        const payload = resolveConflictsInputSchema.parse({ resolutions });
        printJson(await resolveHubSyncConflicts(options.chainHome, payload));
      }
    );
}
