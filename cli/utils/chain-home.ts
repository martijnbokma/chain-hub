import { homedir } from "os"
import { join, resolve } from "path"
import { readChainConfig } from "./chain-config"

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

  return { path: join(homedir(), ".chain"), source: "default" }
}

export function getChainHome(): string {
  return getChainHomeResolution().path
}
