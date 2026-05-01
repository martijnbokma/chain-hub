import { windsurf } from "./windsurf"
import { cursor } from "./cursor"
import { claudeCode } from "./claude-code"
import { antigravity } from "./antigravity"
import { gemini } from "./gemini"
import { trae } from "./trae"
import { kiro } from "./kiro"
import { universal } from "./universal"
import type { IdeAdapter } from "./types"

export const allAdapters: IdeAdapter[] = [
  windsurf,
  cursor,
  claudeCode,
  antigravity,
  gemini,
  trae,
  kiro,
  universal,
]

export { windsurf, cursor, claudeCode, antigravity, gemini, trae, kiro, universal }
export type { IdeAdapter }
