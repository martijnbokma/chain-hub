#!/usr/bin/env node
import { Command } from "commander"
import { readCliVersion } from "./utils/cli-version"

;(async () => {
  const program = new Command()
    .name("chain")
    .description("Manage AI agent skills across IDEs")
    .version(readCliVersion())

  program
    .command("init")
    .description("Initialize protected Chain core assets")
    .action(async () => {
      const { runInit } = await import("./commands/init")
      await runInit()
    })

  program
    .command("setup")
    .description("Create symlinks for all detected IDEs")
    .option("--ide <name>", "Only set up a specific IDE")
    .action(async (opts) => {
      const { runSetup } = await import("./commands/setup")
      await runSetup(opts)
    })

  program
    .command("status")
    .description("Show symlink health per IDE")
    .action(async () => {
      const { runStatus } = await import("./commands/status")
      await runStatus()
    })

  program
    .command("add <slug>")
    .description("Install a skill from registry or github:<owner>/<repo>")
    .option("--skill <name>", "Install only a specific skill from the source")
    .action(async (slug, opts) => {
      const { runAdd } = await import("./commands/add")
      await runAdd(slug, opts)
    })

  program
    .command("remove <slug>")
    .description("Remove an installed skill")
    .action(async (slug) => {
      const { runRemove } = await import("./commands/remove")
      await runRemove(slug)
    })

  program
    .command("list")
    .description("List all skills with source label")
    .action(async () => {
      const { runList } = await import("./commands/list")
      await runList()
    })

  program
    .command("search <query>")
    .description("Search skills in all registries")
    .action(async (query) => {
      const { runSearch } = await import("./commands/search")
      await runSearch(query)
    })

  program
    .command("new <slug>")
    .description("Scaffold a new skill from template")
    .action(async (slug) => {
      const { runNew } = await import("./commands/new")
      await runNew(slug)
    })

  program
    .command("validate")
    .description("Validate skills and workflows")
    .option("--fix", "Try to auto-fix issues after validation")
    .action(async (opts) => {
      const { runValidate } = await import("./commands/validate")
      await runValidate(opts)
    })

  program
    .command("update")
    .description("Update installed skills from their source (registry or GitHub)")
    .action(async () => {
      const { runUpdate } = await import("./commands/update")
      await runUpdate()
    })

  program
    .command("fix")
    .description("Auto-fix missing sections and frontmatter in skills and workflows")
    .action(async () => {
      const { runFix } = await import("./commands/fix")
      await runFix()
    })

  program
    .command("reflect")
    .description("Analyze recent learnings and propose improvements")
    .option("--dry-run", "Only show what would be analyzed")
    .action(async (opts) => {
      const { runReflect } = await import("./commands/reflect")
      await runReflect(opts)
    })

  program
    .command("capture")
    .description("Record a learning event (success, failure, correction, note)")
    .requiredOption("--event <type>", "Event type (success|failure|correction|note)")
    .requiredOption("--skill <slug>", "Skill slug (e.g. bug-fix)")
    .requiredOption("--summary <text>", "Short summary of what was learned")
    .option("--repo <hint>", "Repository or path hint")
    .action(async (opts) => {
      const { runCapture } = await import("./commands/capture")
      await runCapture(opts)
    })

  program
    .command("fetch-prompts")
    .description("Download design-style prompts from designprompts.dev")
    .action(async () => {
      const { runFetchPrompts } = await import("./commands/fetch-prompts")
      await runFetchPrompts()
    })

  try {
    await program.parseAsync()
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
