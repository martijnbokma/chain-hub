#!/usr/bin/env node
import { Command } from "commander"
import { readCliVersion } from "./utils/cli-version"

function withChainHomeOption<T extends Command>(command: T): T {
  return command.option("--chain-home <path>", "Override CHAIN_HOME for this command")
}

function applyChainHomeOverrideFromArgv(argv: string[]): string[] {
  const nextArgv: string[] = []
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--chain-home") {
      const value = argv[i + 1]
      if (value && !value.startsWith("-")) {
        process.env.CHAIN_HOME = value
        i++
        continue
      }
    }

    if (arg.startsWith("--chain-home=")) {
      process.env.CHAIN_HOME = arg.slice("--chain-home=".length)
      continue
    }

    nextArgv.push(arg)
  }
  return nextArgv
}

async function runChainRegistrySearch(
  query: string,
  opts: { hubOnly?: boolean },
): Promise<void> {
  const { runSearch } = await import("./commands/search")
  await runSearch(query, { hubOnly: Boolean(opts.hubOnly) })
}

;(async () => {
  const argv = applyChainHomeOverrideFromArgv(process.argv)

  const program = new Command()
    .name("chain")
    .description("Chain Hub — manage AI agent skills across IDEs")
    .version(readCliVersion())
    .addHelpText(
      "after",
      `
Hub location resolution:
  1) --chain-home <path>     (per command override)
  2) CHAIN_HOME env var
  3) chain config set chain_home <path>
  4) ~/chain-hub (default)
`,
    )

  withChainHomeOption(
    program.command("init")
    .description("Initialize Chain Hub: core assets, user skills/ directory, and skills-registry.yaml")
    .action(async () => {
      const { runInit } = await import("./commands/init")
      await runInit()
    }),
  )

  withChainHomeOption(
    program.command("setup")
    .description("Create symlinks for all detected IDEs")
    .option("--ide <name>", "Only set up a specific IDE")
    .action(async (opts) => {
      const { runSetup } = await import("./commands/setup")
      await runSetup(opts)
    }),
  )

  withChainHomeOption(
    program.command("status")
    .description("Show symlink health per IDE")
    .action(async () => {
      const { runStatus } = await import("./commands/status")
      await runStatus()
    }),
  )

  withChainHomeOption(
    program.command("add <slug>")
    .description("Install a skill from registry or github:<owner>/<repo>")
    .option("--skill <name>", "Install only a specific skill from the source")
    .option(
      "--pack",
      "For github: installs — register skills under the packs bucket (curated bundles; chain update refreshes via github_sources)",
    )
    .action(async (slug, opts) => {
      const { runAdd } = await import("./commands/add")
      await runAdd(slug, opts)
    }),
  )

  withChainHomeOption(
    program.command("remove <slug>")
    .description("Remove an installed skill")
    .action(async (slug) => {
      const { runRemove } = await import("./commands/remove")
      await runRemove(slug)
    }),
  )

  withChainHomeOption(
    program.command("list")
    .description("List all skills with source label")
    .action(async () => {
      const { runList } = await import("./commands/list")
      await runList()
    }),
  )

  withChainHomeOption(
    program
      .command("search <query>")
      .description(
        "Search Chain Hub registry and the skills.sh open directory (set SKILLS_API_URL to override)",
      )
      .option("--hub-only", "Only search the Chain Hub registry index (skip skills.sh)")
      .action(runChainRegistrySearch),
  )

  withChainHomeOption(
    program
      .command("find <query>")
      .description("Same as `chain search` — alias for users of `npx skills find`")
      .option("--hub-only", "Only search the Chain Hub registry index (skip skills.sh)")
      .action(runChainRegistrySearch),
  )

  withChainHomeOption(
    program.command("new <slug>")
    .description("Scaffold a new skill from template")
    .action(async (slug) => {
      const { runNew } = await import("./commands/new")
      await runNew(slug)
    }),
  )

  withChainHomeOption(
    program.command("validate")
    .description("Validate skills and workflows")
    .option("--fix", "Try to auto-fix issues after validation")
    .action(async (opts) => {
      const { runValidate } = await import("./commands/validate")
      await runValidate(opts)
    }),
  )

  withChainHomeOption(
    program.command("update")
    .description("Update installed skills from their source (registry or GitHub)")
    .action(async () => {
      const { runUpdate } = await import("./commands/update")
      await runUpdate()
    }),
  )

  withChainHomeOption(
    program.command("fix")
    .description("Auto-fix missing sections and frontmatter in skills and workflows")
    .action(async () => {
      const { runFix } = await import("./commands/fix")
      await runFix()
    }),
  )

  withChainHomeOption(
    program.command("reflect")
    .description("Analyze recent learnings and propose improvements")
    .option("--dry-run", "Only show what would be analyzed")
    .action(async (opts) => {
      const { runReflect } = await import("./commands/reflect")
      await runReflect(opts)
    }),
  )

  withChainHomeOption(
    program.command("capture")
    .description("Record a learning event (success, failure, correction, note)")
    .requiredOption("--event <type>", "Event type (success|failure|correction|note)")
    .requiredOption("--skill <slug>", "Skill slug (e.g. bug-fix)")
    .requiredOption("--summary <text>", "Short summary of what was learned")
    .option("--repo <hint>", "Repository or path hint")
    .action(async (opts) => {
      const { runCapture } = await import("./commands/capture")
      await runCapture(opts)
    }),
  )

  withChainHomeOption(
    program.command("hub")
    .description("Start the local Chain Hub web dashboard server")
    .option(
      "--port <number>",
      "Port to bind (defaults to 2342; without --port it auto-selects an available port if 2342 is busy; use 0 to always pick an available port)",
    )
    .action(async (opts) => {
      const { runHub } = await import("./commands/hub")
      await runHub({ port: opts.port })
    }),
  )

  withChainHomeOption(
    program.command("fetch-prompts")
    .description("Download design-style prompts from designprompts.dev")
    .action(async () => {
      const { runFetchPrompts } = await import("./commands/fetch-prompts")
      await runFetchPrompts()
    }),
  )

  const configProgram = program.command("config").description("Manage Chain Hub configuration")

  configProgram
    .command("get <key>")
    .description("Get a config value (supported: chain_home)")
    .action(async (key) => {
      const { runConfigGet } = await import("./commands/config")
      await runConfigGet(key)
    })

  configProgram
    .command("set <key> <value>")
    .description("Set a config value (supported: chain_home)")
    .action(async (key, value) => {
      const { runConfigSet } = await import("./commands/config")
      await runConfigSet(key, value)
    })

  configProgram
    .command("unset <key>")
    .description("Unset a config value (supported: chain_home)")
    .action(async (key) => {
      const { runConfigUnset } = await import("./commands/config")
      await runConfigUnset(key)
    })

  try {
    await program.parseAsync(argv)
  } catch (error) {
    const { default: kleur } = await import("kleur")
    const { UserError } = await import("./utils/errors")
    if (error instanceof UserError) {
      console.error(kleur.red(`\n  Error: ${error.message}\n`))
    } else {
      console.error(kleur.red(`Error: ${error instanceof Error ? error.message : String(error)}`))
      if (error instanceof Error && error.stack) console.error(kleur.dim(error.stack))
    }
    process.exit(1)
  }
})()
