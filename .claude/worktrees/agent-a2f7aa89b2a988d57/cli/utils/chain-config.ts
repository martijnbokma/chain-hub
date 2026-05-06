import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { homedir } from "os"
import { dirname, join } from "path"

export interface ChainConfig {
  chain_home?: string
}

export function getChainConfigPath(): string {
  const configRoot = process.env.XDG_CONFIG_HOME
    ? join(process.env.XDG_CONFIG_HOME, "chain-hub")
    : join(homedir(), ".config", "chain-hub")
  return join(configRoot, "config.json")
}

export function readChainConfig(): ChainConfig {
  const path = getChainConfigPath()
  if (!existsSync(path)) return {}

  try {
    const raw = readFileSync(path, "utf-8")
    const parsed = JSON.parse(raw) as ChainConfig
    if (!parsed || typeof parsed !== "object") return {}
    return parsed
  } catch {
    return {}
  }
}

export function writeChainConfig(config: ChainConfig): void {
  const path = getChainConfigPath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(config, null, 2) + "\n", "utf-8")
}

