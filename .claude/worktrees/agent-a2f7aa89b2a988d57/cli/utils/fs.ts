import { existsSync, lstatSync } from "fs"
import { homedir } from "os"

export function expandHome(p: string): string {
  return p.startsWith("~/") ? p.replace("~", homedir()) : p
}

export function exists(p: string): boolean {
  return existsSync(expandHome(p))
}

export function isSymlink(p: string): boolean {
  return lstatSync(expandHome(p), { throwIfNoEntry: false })?.isSymbolicLink() ?? false
}
