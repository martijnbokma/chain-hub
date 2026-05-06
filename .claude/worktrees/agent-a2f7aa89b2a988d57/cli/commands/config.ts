import kleur from "kleur"
import { getChainConfigPath, readChainConfig, writeChainConfig } from "../utils/chain-config"
import { getChainHomeResolution } from "../utils/chain-home"
import { homedir } from "os"
import { join, resolve } from "path"

function normalizeChainHomePath(input: string): string {
  const trimmed = input.trim()
  if (trimmed.startsWith("~/")) return resolve(join(homedir(), trimmed.slice(2)))
  return resolve(trimmed)
}

export async function runConfigGet(key: string): Promise<void> {
  if (key !== "chain_home") {
    console.log(kleur.red(`\n  Unsupported key: ${key}\n`))
    process.exit(1)
  }

  const resolution = getChainHomeResolution()
  const config = readChainConfig()

  console.log(kleur.bold("\n⚙ chain config get"))
  console.log(`  chain_home: ${resolution.path}`)
  console.log(kleur.dim(`  source: ${resolution.source}`))
  if (config.chain_home) {
    console.log(kleur.dim(`  stored value: ${config.chain_home}`))
  }
  console.log("")
}

export async function runConfigSet(key: string, value: string): Promise<void> {
  if (key !== "chain_home") {
    console.log(kleur.red(`\n  Unsupported key: ${key}\n`))
    process.exit(1)
  }

  const nextValue = normalizeChainHomePath(value)
  const config = readChainConfig()
  config.chain_home = nextValue
  writeChainConfig(config)

  console.log(kleur.green(`\n  ✓ chain_home set to ${nextValue}`))
  console.log(kleur.dim(`  Config file: ${getChainConfigPath()}\n`))
}

export async function runConfigUnset(key: string): Promise<void> {
  if (key !== "chain_home") {
    console.log(kleur.red(`\n  Unsupported key: ${key}\n`))
    process.exit(1)
  }

  const config = readChainConfig()
  delete config.chain_home
  writeChainConfig(config)

  const resolution = getChainHomeResolution()
  console.log(kleur.green(`\n  ✓ chain_home unset`))
  console.log(kleur.dim(`  Active CHAIN_HOME now resolves to ${resolution.path} (${resolution.source})\n`))
}

