import kleur from "kleur"
import { getChainHomeResolution } from "../utils/chain-home"
import { validateProject } from "../utils/validation"

interface ValidateOptions {
  fix?: boolean
}

export async function runValidate(opts: ValidateOptions = {}): Promise<void> {
  const resolution = getChainHomeResolution()
  const chainHome = resolution.path
  
  console.log(kleur.bold("\n🔍 chain validate"))
  console.log(kleur.dim(`   CHAIN_HOME: ${chainHome} (${resolution.source})\n`))

  const result = validateProject(chainHome)

  console.log(kleur.bold("  Summary:"))
  console.log(`    Skills processed:   ${result.skillsProcessed}`)
  console.log(`    Workflows processed: ${result.workflowsProcessed}`)
  console.log(`    Agents processed:    ${result.agentsProcessed}`)
  console.log(`    Rules processed:     ${result.rulesProcessed}\n`)

  if (result.errors.length === 0) {
    if (result.warnings.length > 0) {
      console.log(kleur.yellow(`  ⚠  ${result.warnings.length} warning(s):`))
      result.warnings.forEach(warn => console.log(kleur.yellow(`    • ${warn}`)))
      console.log("")
    }
    console.log(kleur.green("  ✓ All quality checks passed!\n"))
  } else {
    console.log(kleur.red(`  ❌ Validation failed with ${result.errors.length} error(s):`))
    result.errors.forEach(err => console.log(kleur.red(`    • ${err}`)))
    console.log("")

    if (opts.fix) {
      console.log(kleur.cyan("  🛠  Running auto-fix..."))
      const { runFix } = await import("./fix")
      await runFix()
      
      console.log(kleur.bold("  Re-validating..."))
      return runValidate({ fix: false }) // Prevent infinite loop
    } else {
      const registryMissing =
        result.errors.length === 1 &&
        result.errors[0]?.includes("skills-registry.yaml") &&
        result.errors[0]?.includes("chain init")
      if (registryMissing) {
        console.log(
          kleur.dim(
            "  CHAIN_HOME must contain skills, workflows, and registry from `chain init` before validation.\n",
          ),
        )
      } else {
        console.log(kleur.dim("  Tip: Run 'chain validate --fix' to automatically resolve missing sections.\n"))
      }
      process.exit(1)
    }
  }
}
