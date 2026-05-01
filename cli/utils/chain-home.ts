import { homedir } from "os"
import { join, resolve } from "path"
import { readChainConfig } from "./chain-config"

/** Default hub folder under the user’s home when `CHAIN_HOME` is unset and config has no `chain_home` (i.e. `~/chain-hub`). */
export const DEFAULT_CHAIN_HUB_DIRNAME = "chain-hub"

export type ChainHomeSource = "env" | "config" | "default"

export interface ChainHomeResolution {
  path: string
  source: ChainHomeSource
}

function normalizeChainHomePath(input: string): string {
  const trimmed = input.trim()
  if (trimmed.startsWith("~/")) {
    return resolve(join(homedir(), trimmed.slice(2)))
  }
  return resolve(trimmed)
}

export function getChainHomeResolution(): ChainHomeResolution {
  if (process.env.CHAIN_HOME && process.env.CHAIN_HOME.trim().length > 0) {
    return { path: normalizeChainHomePath(process.env.CHAIN_HOME), source: "env" }
  }

  const config = readChainConfig()
  if (config.chain_home && config.chain_home.trim().length > 0) {
    return { path: normalizeChainHomePath(config.chain_home), source: "config" }
  }

  return { path: join(homedir(), DEFAULT_CHAIN_HUB_DIRNAME), source: "default" }
}

export function getChainHome(): string {
  return getChainHomeResolution().path
}
